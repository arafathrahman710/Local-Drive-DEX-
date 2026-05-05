import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (use /tmp for serverless environments if needed)
const isVercel = process.env.VERCEL === "1";
const uploadsDir = isVercel ? "/tmp" : path.join(__dirname, "uploads");

if (!isVercel && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const API_ID = parseInt(process.env.TELEGRAM_API_ID || "30180445", 10);
const API_HASH = process.env.TELEGRAM_API_HASH || "7ba589cf9d04a0c549df7fef55dd76dd";

if (API_ID === 0 || !API_HASH) {
  console.warn("WARNING: TELEGRAM_API_ID or TELEGRAM_API_HASH is not set. Telegram integration will not work.");
}

async function createServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'tg-drive-secret',
    resave: false,
    saveUninitialized: false, // Changed to false for better privacy/security
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    } 
  }));

  // Helper to get Telegram client for a session
  const getClient = (sessionString: string = "") => {
    return new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
      connectionRetries: 5,
      useWSS: true, // Use WebSockets to bypass firewall/timeout issues
      timeout: 30000,
      deviceModel: "CloudGram Drive",
      systemVersion: "1.0",
      appVersion: "1.0",
    });
  };

  // Helper to extract session string from request
  const getSessionString = (req: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return req.query.session || "";
  };

  // --- API ROUTES ---

  app.get("/api/tg/status", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.json({ loggedIn: false });
    try {
      const client = getClient(sessionString);
      await client.connect();
      const me = await client.getMe();
      
      // Attempt to load settings from saved messages
      const messages = await client.getMessages("me", { limit: 100 });
      const settingsMsg = messages.find(m => m.message && m.message.startsWith("#CloudGramSettings"));
      let savedSettings = null;
      if (settingsMsg) {
         try {
           savedSettings = JSON.parse(settingsMsg.message.replace("#CloudGramSettings\n", ""));
         } catch(e) {}
      }

      await client.disconnect();
      res.json({ loggedIn: true, user: me, settings: savedSettings });
    } catch (error) {
      res.json({ loggedIn: false });
    }
  });

  app.post("/api/tg/send-code", async (req, res) => {
    const { phone } = req.body;
    try {
      let cleanPhone = phone.replace(/[^+\d]/g, '');
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
      }
      const client = getClient();
      await client.connect();
      const result = await client.sendCode({ apiId: API_ID, apiHash: API_HASH }, cleanPhone);
      const sessionString = client.session.save() as unknown as string;
      await client.disconnect();
      res.json({ success: true, phoneCodeHash: result.phoneCodeHash, phone: cleanPhone, sessionString });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tg/signin", async (req, res) => {
    const { code, phone, phoneCodeHash, sessionString: tempSession } = req.body;
    try {
      const client = getClient(tempSession);
      await client.connect();
      await client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash: phoneCodeHash, phoneCode: code }));
      const sessionString = client.session.save() as unknown as string;
      const me = await client.getMe();
      await client.disconnect();
      res.json({ success: true, user: me, sessionString });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tg/logout", (req, res) => {
    res.json({ success: true });
  });

  app.get("/api/tg/files", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      const client = getClient(sessionString);
      await client.connect();
      const messages = await client.getMessages("me", { limit: 100 });
      const files = messages
        .filter(m => m.media && m.media instanceof Api.MessageMediaDocument)
        .map(m => {
          const doc = (m.media as Api.MessageMediaDocument).document as Api.Document;
          const fileNameAttr = doc.attributes.find((a: any) => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
          return {
            id: m.id.toString(),
            name: fileNameAttr ? fileNameAttr.fileName : `file_${m.id}`,
            size: doc.size.toString(),
            date: new Date(m.date * 1000).toISOString(),
            type: doc.mimeType,
            isFolder: false,
          };
        });
      await client.disconnect();
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tg/settings", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    const { settings } = req.body;
    try {
      const client = getClient(sessionString);
      await client.connect();
      
      const messages = await client.getMessages("me", { limit: 100 });
      const oldSettingsMsgs = messages.filter(m => m.message && m.message.startsWith("#CloudGramSettings"));
      
      await client.sendMessage("me", { message: `#CloudGramSettings\n${JSON.stringify(settings)}` });
      
      // Delete old settings messages
      if (oldSettingsMsgs.length > 0) {
        await client.deleteMessages("me", oldSettingsMsgs.map(m => m.id), { revoke: true });
      }

      await client.disconnect();
      res.json({ success: true });
    } catch(err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tg/delete/:id", async (req, res) => {
    const sessionString = getSessionString(req);
    const { id } = req.params;
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      const client = getClient(sessionString);
      await client.connect();
      await client.deleteMessages("me", [parseInt(id)], { revoke: true });
      await client.disconnect();
      res.json({ success: true });
    } catch(err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Updated Upload for Vercel
  const upload = multer({ dest: uploadsDir });
  app.post("/api/tg/upload", upload.single("file"), async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    try {
      const client = getClient(sessionString);
      await client.connect();
      await client.sendFile("me", {
        file: req.file.path,
        attributes: [new Api.DocumentAttributeFilename({ fileName: req.file.originalname })]
      });
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await client.disconnect();
      res.json({ success: true });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tg/download/:id", async (req, res) => {
    const sessionString = getSessionString(req);
    const { id } = req.params;
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      const client = getClient(sessionString);
      await client.connect();
      const messages = await client.getMessages("me", { ids: [parseInt(id)] });
      if (!messages || messages.length === 0 || !messages[0].media) return res.status(404).json({ error: "File not found" });
      const buffer = await client.downloadMedia(messages[0].media!, {});
      const doc = (messages[0].media as Api.MessageMediaDocument).document as Api.Document;
      const fileNameAttr = doc.attributes.find((a: any) => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileNameAttr?.fileName || 'file'}"`);
      res.send(buffer);
      await client.disconnect();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (!isVercel && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

// Start local server if not on Vercel
if (!isVercel) {
  createServer().then(app => {
    const LOCAL_PORT = Number(process.env.PORT) || 3000;
    app.listen(LOCAL_PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${LOCAL_PORT}`);
    });
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await createServer();
  return app(req, res);
};

