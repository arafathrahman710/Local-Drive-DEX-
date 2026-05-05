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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const API_ID = parseInt(process.env.TELEGRAM_API_ID || "0");
const API_HASH = process.env.TELEGRAM_API_HASH || "";

if (API_ID === 0 || !API_HASH) {
  console.warn("WARNING: TELEGRAM_API_ID or TELEGRAM_API_HASH is not set. Telegram integration will not work.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'tg-drive-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
  }));

  // Helper to get Telegram client for a session
  const getClient = (sessionString: string = "") => {
    return new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
      connectionRetries: 5,
    });
  };

  // --- API ROUTES ---

  // Check login status
  app.get("/api/tg/status", async (req, res) => {
    const sessionString = (req.session as any).tgSession;
    if (!sessionString) {
      return res.json({ loggedIn: false });
    }
    try {
      const client = getClient(sessionString);
      await client.connect();
      const me = await client.getMe();
      await client.disconnect();
      res.json({ loggedIn: true, user: me });
    } catch (error) {
      res.json({ loggedIn: false });
    }
  });

  // Send OTP
  app.post("/api/tg/send-code", async (req, res) => {
    const { phone } = req.body;
    try {
      const client = getClient();
      await client.connect();
      const result = await client.sendCode(
        {
          apiId: API_ID,
          apiHash: API_HASH
        },
        phone
      );
      (req.session as any).phone = phone;
      (req.session as any).phoneCodeHash = result.phoneCodeHash;
      await client.disconnect();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sign In
  app.post("/api/tg/signin", async (req, res) => {
    const { code } = req.body;
    const phone = (req.session as any).phone;
    const phoneCodeHash = (req.session as any).phoneCodeHash;

    try {
      const client = getClient();
      await client.connect();
      // Correct manual sign in method
      await client.invoke(new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code
      }));
      
      const sessionString = client.session.save() as unknown as string;
      (req.session as any).tgSession = sessionString;
      
      const me = await client.getMe();
      await client.disconnect();
      res.json({ success: true, user: me });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/tg/logout", (req, res) => {
    (req.session as any).tgSession = null;
    res.json({ success: true });
  });

  // List Files (Messages with documents in Saved Messages)
  app.get("/api/tg/files", async (req, res) => {
    const sessionString = (req.session as any).tgSession;
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });

    try {
      const client = getClient(sessionString);
      await client.connect();
      
      // Saved Messages is 'me'
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

  // Upload File
  const upload = multer({ dest: "uploads/" });
  app.post("/api/tg/upload", upload.single("file"), async (req, res) => {
    const sessionString = (req.session as any).tgSession;
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    try {
      const client = getClient(sessionString);
      await client.connect();
      
      await client.sendFile("me", {
        file: req.file.path,
        attributes: [
          new Api.DocumentAttributeFilename({
            fileName: req.file.originalname
          })
        ]
      });

      // Delete local temp file
      fs.unlinkSync(req.file.path);
      
      await client.disconnect();
      res.json({ success: true });
    } catch (error: any) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: error.message });
    }
  });

  // Download File
  app.get("/api/tg/download/:id", async (req, res) => {
    const sessionString = (req.session as any).tgSession;
    const { id } = req.params;
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });

    try {
      const client = getClient(sessionString);
      await client.connect();
      
      const messages = await client.getMessages("me", { ids: [parseInt(id)] });
      if (!messages || messages.length === 0 || !messages[0].media) {
        return res.status(404).json({ error: "File not found" });
      }

      const message = messages[0];
      const buffer = await client.downloadMedia(message.media!, {});

      const doc = (message.media as Api.MessageMediaDocument).document as Api.Document;
      const fileNameAttr = doc.attributes.find((a: any) => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
      const fileName = fileNameAttr ? fileNameAttr.fileName : `file_${id}`;

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
      
      await client.disconnect();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
