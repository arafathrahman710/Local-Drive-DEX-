import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import bigInt from "big-integer";

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
const API_HASH =
  process.env.TELEGRAM_API_HASH || "7ba589cf9d04a0c549df7fef55dd76dd";

if (API_ID === 0 || !API_HASH) {
  console.warn(
    "WARNING: TELEGRAM_API_ID or TELEGRAM_API_HASH is not set. Telegram integration will not work.",
  );
}

async function createServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tg-drive-secret",
      resave: false,
      saveUninitialized: false, // Changed to false for better privacy/security
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // In-memory client cache to avoid reconnecting on every request
  const clientCache: Record<
    string,
    {
      client: TelegramClient;
      lastUsed: number;
      connectPromise?: Promise<TelegramClient>;
    }
  > = {};

  // Cleanup interval for old clients (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const sid in clientCache) {
      if (now - clientCache[sid].lastUsed > 5 * 60 * 1000) {
        clientCache[sid].client.disconnect().catch(() => {});
        delete clientCache[sid];
      }
    }
  }, 60 * 1000);

  // Helper to get Telegram client for a session
  const getClient = async (sessionString: string = "") => {
    if (sessionString && clientCache[sessionString]) {
      console.log(`[getClient] Using cached client for session starting with ${sessionString.substring(0, 10)}...`);
      clientCache[sessionString].lastUsed = Date.now();
      if (clientCache[sessionString].connectPromise) {
        console.log(`[getClient] Waiting for existing connection promise...`);
        return await clientCache[sessionString].connectPromise!;
      }
      const cached = clientCache[sessionString].client;
      if (!cached.connected) {
        console.log(`[getClient] Cached client not connected. Connecting...`);
        clientCache[sessionString].connectPromise = cached
          .connect()
          .then(() => {
            console.log(`[getClient] Cached client connected successfully.`);
            return cached;
          })
          .catch(err => {
            console.error(`[getClient] Cached client connection failed:`, err);
            throw err;
          });
        await clientCache[sessionString].connectPromise;
        clientCache[sessionString].connectPromise = undefined;
      }
      return cached;
    }

    console.log(`[getClient] Creating new client... (Session provided: ${!!sessionString})`);
    const client = new TelegramClient(
      new StringSession(sessionString),
      API_ID,
      API_HASH,
      {
        connectionRetries: 15,
        requestRetries: 10,
        timeout: 180000, // 3 minutes
        deviceModel: "CloudGram Drive",
        systemVersion: "1.0",
        appVersion: "1.0",
        proxy: undefined,
        autoReconnect: true,
      },
    );

    if (sessionString) {
      console.log(`[getClient] Connecting new client with session...`);
      const connectPromise = client.connect().then(() => {
        console.log(`[getClient] New client with session connected.`);
        return client;
      });
      clientCache[sessionString] = {
        client,
        lastUsed: Date.now(),
        connectPromise,
      };
      await connectPromise;
      clientCache[sessionString].connectPromise = undefined;
    } else {
      console.log(`[getClient] Connecting new anonymous client...`);
      await client.connect();
      console.log(`[getClient] Anonymous client connected.`);
    }

    return client;
  };

  // Helper to extract session string from request
  const getSessionString = (req: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return req.query.session || "";
  };

  const handleTgError = (err: any, sessionString: string) => {
    if (err.message && err.message.includes("AUTH_KEY_UNREGISTERED")) {
      if (clientCache[sessionString]) {
        clientCache[sessionString].client.disconnect().catch(() => {});
        delete clientCache[sessionString];
      }
      return false; // Not retriable, needs re-authentication
    }
    if (err.message && (err.message.includes("TIMEOUT") || err.message.includes("RPC_CALL_FAIL"))) {
      if (clientCache[sessionString]) {
        clientCache[sessionString].client.disconnect().catch(() => {});
        delete clientCache[sessionString];
      }
      return true; // Retriable
    }
    return false;
  };

  // --- API ROUTES ---

  app.get("/api/tg/status", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.json({ loggedIn: false });

    try {
      const client = await getClient(sessionString);
      const me = await client.getMe();

      // Attempt to load settings from saved messages
      const messages = await client.getMessages("me", {
        search: "#CloudGramSettings",
        limit: 3,
      });
      const settingsMsg = messages.find(
        (m) => m.message && m.message.startsWith("#CloudGramSettings"),
      );
      let savedSettings = null;
      if (settingsMsg) {
        try {
          savedSettings = JSON.parse(
            settingsMsg.message.replace("#CloudGramSettings\n", ""),
          );
        } catch (e) {}
      }

      res.json({ loggedIn: true, user: me, settings: savedSettings });
    } catch (error: any) {
      handleTgError(error, sessionString);
      res.json({ loggedIn: false });
    }
    // We don't disconnect anymore because we cache the client
  });

  app.post("/api/tg/send-code", async (req, res) => {
    const { phone } = req.body;
    try {
      const logFile = path.join(uploadsDir, "auth_debug.txt");
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Attempting send-code for: ${phone}\n`);

      let cleanPhone = phone.replace(/[^+\d]/g, "");
      if (!cleanPhone.startsWith("+")) {
        // Handle common Bangladesh local format (starts with 01 and 11 digits long)
        if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
          cleanPhone = "+88" + cleanPhone;
        } else if (cleanPhone.startsWith("880") && cleanPhone.length === 13) {
          cleanPhone = "+" + cleanPhone;
        } else {
          cleanPhone = "+" + cleanPhone;
        }
      }
      
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Cleaned phone: ${cleanPhone}\n`);
      console.log(`[Telegram Auth] Sending code for phone: ${cleanPhone} (Original: ${phone})`);
      
      const client = await getClient("");
      const result = await client.sendCode(
        { apiId: API_ID, apiHash: API_HASH },
        cleanPhone,
      );
      
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Success! phoneCodeHash length: ${result.phoneCodeHash.length}\n`);
      
      const sessionString = client.session.save() as unknown as string;
      res.json({
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        phone: cleanPhone,
        sessionString,
      });
      await client.disconnect(); // Transient client for auth
    } catch (error: any) {
      const logFile = path.join(uploadsDir, "auth_debug.txt");
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Error: ${error.message || String(error)}\n`);
      console.error(`[Telegram Auth] Error sending code to ${phone}:`, error);
      res.status(500).json({ 
        error: error.message || String(error),
        code: error.code || 500
      });
    }
  });

  app.post("/api/tg/signin", async (req, res) => {
    const { code, phone, phoneCodeHash, sessionString: tempSession } = req.body;
    try {
      const client = await getClient(tempSession);
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code,
        }),
      );
      const sessionString = client.session.save() as unknown as string;
      const me = await client.getMe();
      res.json({ success: true, user: me, sessionString });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tg/logout", (req, res) => {
    const sessionString = getSessionString(req);
    if (sessionString && clientCache[sessionString]) {
      clientCache[sessionString].client.disconnect().catch(() => {});
      delete clientCache[sessionString];
    }
    res.json({ success: true });
  });

  app.get("/api/tg/files", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      let client = await getClient(sessionString);
      let messages;
      let filesRetries = 0;
      while (filesRetries < 5) {
        try {
          // Fetch fewer messages initially to prevent timeouts
          messages = await client.getMessages("me", {
            search: "#CloudGram",
            limit: 300,
          });
          break;
        } catch (err: any) {
          filesRetries++;
          if (handleTgError(err, sessionString) || (err.message && err.message.includes("TIMEOUT"))) {
            console.warn(`[Files] TIMEOUT or connection error (attempt ${filesRetries}), retrying...`);
            if (filesRetries >= 5) throw err;
            client = await getClient(sessionString);
          } else {
            throw err;
          }
        }
      }
      const filteredMessages = messages.filter(
        (m) =>
          m.media &&
          (m.media instanceof Api.MessageMediaDocument || m.media instanceof Api.MessageMediaPhoto) &&
          m.message &&
          m.message.includes("#CloudGram"),
      );

      const validFiles: any[] = [];

      filteredMessages.forEach((m) => {
        let doc: Api.Document | null = null;
        let photo: Api.Photo | null = null;
        let fileName = `file_${m.id}`;
        let size = "0";
        let type = "application/octet-stream";

        if (m.media instanceof Api.MessageMediaDocument && m.media.document instanceof Api.Document) {
          doc = m.media.document;
          const fileNameAttr = doc.attributes?.find(
            (a: any) => a instanceof Api.DocumentAttributeFilename,
          ) as Api.DocumentAttributeFilename | undefined;
          fileName = fileNameAttr ? fileNameAttr.fileName : `file_${m.id}`;
          size = doc.size.toString();
          type = doc.mimeType;
        } else if (m.media instanceof Api.MessageMediaPhoto && m.media.photo instanceof Api.Photo) {
          photo = m.media.photo;
          fileName = `photo_${m.id}.jpg`;
          type = "image/jpeg";
          const largest = photo.sizes[photo.sizes.length - 1];
          if ("size" in largest) size = (largest as any).size.toString();
          else if ("sizes" in largest) {
             const s = (largest as any).sizes;
             size = s[s.length - 1].toString();
          }
        }

        let fileStatus = "active";
        if (m.message.includes("#CloudGramTrash")) fileStatus = "trash";
        if (m.message.includes("#CloudGramSpam")) fileStatus = "spam";

        const msgDateMs = m.date * 1000;

        validFiles.push({
          id: m.id.toString(),
          name: fileName,
          size: size,
          date: new Date(msgDateMs).toISOString(),
          type: type,
          isFolder: false,
          status: fileStatus,
        });
      });

      res.json(validFiles);
    } catch (error: any) {
      if (error.message && error.message.includes("TIMEOUT")) {
        if (clientCache[sessionString])
          clientCache[sessionString].client.disconnect();
      }
      res.status(500).json({ error: error.message || "Failed to fetch files" });
    }
  });

  app.get("/api/tg/vfs", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      const client = await getClient(sessionString);
      const messages = await client.getMessages("me", {
        search: "#CloudGramVFS",
        limit: 5,
      });
      const vfsMsg = messages.find(
        (m) => m.message && m.message.startsWith("#CloudGramVFS"),
      );
      let vfs = null;
      if (vfsMsg) {
        try {
          vfs = JSON.parse(vfsMsg.message.replace("#CloudGramVFS\n", ""));
        } catch (e) {}
      }
      res.json({ vfs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tg/vfs", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    const { vfs } = req.body;
    try {
      const client = await getClient(sessionString);
      const messages = await client.getMessages("me", {
        search: "#CloudGramVFS",
        limit: 5,
      });
      const oldVfsMsgs = messages.filter(
        (m) => m.message && m.message.startsWith("#CloudGramVFS"),
      );

      const vfsString = JSON.stringify(vfs);
      // We divide to 4000 chunks roughly but for now we'll just send strings since it's a prototype
      await client.sendMessage("me", {
        message: `#CloudGramVFS\n${vfsString}`,
      });

      if (oldVfsMsgs.length > 0) {
        await client.deleteMessages(
          "me",
          oldVfsMsgs.map((m) => m.id),
          { revoke: true },
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tg/settings", async (req, res) => {
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    const { settings } = req.body;
    try {
      const client = await getClient(sessionString);

      const messages = await client.getMessages("me", {
        search: "#CloudGramSettings",
        limit: 5,
      });
      const oldSettingsMsgs = messages.filter(
        (m) => m.message && m.message.startsWith("#CloudGramSettings"),
      );

      await client.sendMessage("me", {
        message: `#CloudGramSettings\n${JSON.stringify(settings)}`,
      });

      // Delete old settings messages
      if (oldSettingsMsgs.length > 0) {
        await client.deleteMessages(
          "me",
          oldSettingsMsgs.map((m) => m.id),
          { revoke: true },
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tg/files/:id/status", async (req, res) => {
    const sessionString = getSessionString(req);
    const { id } = req.params;
    const { status } = req.body; // 'active', 'trash', 'spam'

    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      const client = await getClient(sessionString);

      let newMessage = "#CloudGram";
      if (status === "trash") newMessage = "#CloudGram #CloudGramTrash";
      if (status === "spam") newMessage = "#CloudGram #CloudGramSpam";

      await client.editMessage("me", {
        message: parseInt(id),
        text: newMessage,
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tg/delete/:id", async (req, res) => {
    const sessionString = getSessionString(req);
    const { id } = req.params;
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    try {
      const client = await getClient(sessionString);
      await client.deleteMessages("me", [parseInt(id)], { revoke: true });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Updated Upload for Vercel
  const upload = multer({ dest: uploadsDir });
  app.post("/api/tg/upload", upload.single("file"), async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    const sessionString = getSessionString(req);
    if (!sessionString) return res.status(401).json({ error: "Not logged in" });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    let tempFilePath = req.file.path;
    try {
      let client = await getClient(sessionString);

      // Rename file to include original extension so gramjs infers mime correctly
      let originalName = req.file.originalname.replace(
        /[^a-zA-Z0-9.\-_]/g,
        "_",
      );
      if (!originalName.includes(".")) {
        if (req.file.mimetype.includes("video")) originalName += ".mp4";
        else if (req.file.mimetype.includes("audio")) originalName += ".mp3";
        else if (req.file.mimetype.includes("image")) originalName += ".jpg";
      }

      const randomSuffix = Math.round(Math.random() * 1e9).toString();
      const finalTempPath = path.join(
        uploadsDir,
        Date.now() + "_" + randomSuffix + "_" + originalName,
      );
      
      try {
        fs.renameSync(req.file.path, finalTempPath);
        tempFilePath = finalTempPath;
        console.log(`[Upload] File moved to ${tempFilePath} (${req.file.size} bytes)`);
      } catch (renameErr) {
        console.warn(`[Upload] renameSync failed, using original path:`, renameErr);
        tempFilePath = req.file.path;
      }

      let sentMsg;
      let uploadRetries = 0;

      // Keep the connection alive by periodically writing whitespaces
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Accel-Buffering", "no");
      res.status(200);
      const keepAliveInterval = setInterval(() => {
        res.write(" "); // write whitespace
      }, 15000);

      let successData = null;
      let errorData = null;

      while (uploadRetries < 5) {
        try {
          console.log(`[Upload] Sending file to Telegram: ${originalName} (attempt ${uploadRetries + 1})`);
          sentMsg = await client.sendFile("me", {
            file: tempFilePath,
            caption: "#CloudGram",
            forceDocument: true,
            workers: 4 - Math.min(uploadRetries, 3), // Reduce workers on retries: 4 -> 3 -> 2 -> 1
            attributes: [
              new Api.DocumentAttributeFilename({
                fileName: req.file.originalname,
              }),
            ],
          });
          console.log(`[Upload] Success! Message ID: ${sentMsg.id}`);
          successData = { success: true, fileId: sentMsg.id.toString() };
          break; // success
        } catch (err: any) {
          uploadRetries++;
          console.error(`[Upload] attempt ${uploadRetries} failed: ${err.message}`);
          if (handleTgError(err, sessionString) || (err.message && err.message.includes("TIMEOUT"))) {
            if (uploadRetries >= 5) {
               errorData = { error: err.message || "Failed after 5 retries" };
               break;
            }
            console.log("Connection issues, recreating client and retrying upload...");
            client = await getClient(sessionString);
          } else {
            errorData = { error: err.message };
            break;
          }
        }
      }
      
      clearInterval(keepAliveInterval);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      
      if (errorData) {
         res.write(JSON.stringify(errorData));
         res.end();
      } else if (successData) {
         res.write(JSON.stringify(successData));
         res.end();
      } else {
         res.write(JSON.stringify({ error: "Unknown upload error" }));
         res.end();
      }
    } catch (error: any) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
         res.write(JSON.stringify({ error: error.message }));
         res.end();
      }
    }
  });

  app.get("/api/tg/download/:id", async (req, res) => {
    let sessionString = getSessionString(req);
    if (!sessionString && req.query.session)
      sessionString = String(req.query.session);

    const { id } = req.params;
    if (!sessionString) {
      return res.status(401).json({ error: "Not logged in" });
    }

    req.setTimeout(0);
    res.setTimeout(0);

    try {
      console.log(`[Download] Requested ID: ${id}`);
      let client = await getClient(sessionString);
      const messageId = parseInt(id, 10);
      
      console.log(`[Download] Fetching message ${messageId}...`);
      let messages;
      let getMessageRetries = 0;
      while (getMessageRetries < 5) {
        try {
          messages = await client.getMessages("me", { ids: [messageId] });
          break;
        } catch (err: any) {
          getMessageRetries++;
          if (handleTgError(err, sessionString) || (err.message && err.message.includes("TIMEOUT"))) {
            console.warn(`[Download] TIMEOUT getting message (attempt ${getMessageRetries}), retrying...`);
            if (getMessageRetries >= 5) throw err;
            client = await getClient(sessionString);
          } else {
            throw err;
          }
        }
      }

      if (!messages || messages.length === 0) {
        console.warn(`[Download] Message ${messageId} not found`);
        return res.status(404).json({ error: "Message not found" });
      }
      if (!messages[0].media) {
        console.warn(`[Download] Message ${messageId} has no media`);
        return res.status(404).json({ error: "Message has no media" });
      }

      const media = messages[0].media;
      let fileName = "file";
      let fileSize = 0;
      let mimeType = "application/octet-stream";

      if (media instanceof Api.MessageMediaDocument && media.document) {
        const doc = media.document as Api.Document;
        const fileNameAttr = doc.attributes?.find(
          (a: any) => a instanceof Api.DocumentAttributeFilename,
        ) as Api.DocumentAttributeFilename | undefined;
        fileName = fileNameAttr?.fileName || "file";
        fileSize = Number(doc.size);
        mimeType = doc.mimeType || "application/octet-stream";

        if (!fileName.includes(".")) {
          if (mimeType.includes("video")) fileName += ".mp4";
          else if (mimeType.includes("audio")) fileName += ".mp3";
          else if (mimeType.includes("image/jpeg")) fileName += ".jpg";
          else if (mimeType.includes("image/png")) fileName += ".png";
          else if (mimeType.includes("application/pdf")) fileName += ".pdf";
        }
      } else if (media instanceof Api.MessageMediaPhoto && media.photo) {
        fileName = "photo.jpg";
        mimeType = "image/jpeg";
        const photo = media.photo as Api.Photo;
        const largest =
          photo.sizes.find((s: any) => s instanceof Api.PhotoSizeProgressive) ||
          photo.sizes[photo.sizes.length - 1];
        
        if (largest) {
          if ((largest as any).size) {
            fileSize = (largest as any).size;
          } else if ((largest as any).sizes) {
            const sizesArr = (largest as any).sizes;
            fileSize = sizesArr && sizesArr.length ? sizesArr[sizesArr.length - 1] : 0;
          }
        }
      }

      const isInline = req.query.inline === "true";
      const sanitizedFileName = fileName.replace(/[/\\?%*:|"<>\s]/g, "_");
      const encodedFileName = encodeURIComponent(fileName);

      res.setHeader("Content-Type", mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        `${isInline ? "inline" : "attachment"}; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`,
      );

      res.status(200);
      if (fileSize > 0) {
        res.setHeader("Content-Length", fileSize.toString());
      }
      res.setHeader("X-Accel-Buffering", "no");

      res.flushHeaders();

      console.log(`[Download] Starting simple stream download for ${id}. Size: ${fileSize}`);

      let aborted = false;
      req.on("close", () => {
        aborted = true;
      });

      try {
        const iter = client.iterDownload({
          file: media,
          offset: bigInt(0),
          requestSize: 512 * 1024,
        });

        for await (const chunk of iter) {
          if (aborted) break;

          const bufferChunk = chunk as Buffer;
          if (bufferChunk.length > 0) {
            const canWrite = res.write(bufferChunk);
            if (!canWrite) {
              await new Promise<void>((resolve) => {
                let resolved = false;
                const onDrain = () => { if (!resolved) { resolved = true; resolve(); } };
                const onClose = () => { if (!resolved) { resolved = true; resolve(); } };
                res.once("drain", onDrain);
                req.once("close", onClose);
              });
            }
          }
        }
        
        if (!aborted && !res.writableEnded) {
          res.end();
        }
      } catch (err: any) {
        console.error(`[Download] Stream error for ${id}:`, err);
        handleTgError(err, sessionString);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message || "Failed to download file" });
        } else if (!res.writableEnded) {
          res.destroy(new Error("Stream error: " + err.message));
        }
      }
    } catch (error: any) {
      console.error(`[Download] Top level error for ${id}:`, error);
      handleTgError(error, sessionString);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal server error" });
      }
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
  createServer().then((app) => {
    const LOCAL_PORT = 3000;
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
