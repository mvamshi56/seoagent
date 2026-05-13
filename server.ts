import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as crawler from "./src/services/crawler.js";
import * as db from "./src/services/storage.js";
import * as ai from "./src/services/aiProviderService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting server process...");

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.use((req, res, next) => {
      next();
    });

    console.log("Initializing database...");
    // Initialize DB
    await db.initDB();
    console.log("Database initialized successfully.");

    // API Routes
    console.log("Registering API routes...");
    app.post("/api/log", (req, res) => {
      console.error("FRONTEND ERROR:", req.body);
      fs.appendFileSync("frontend_errors.log", JSON.stringify(req.body) + "\n");
      res.json({ ok: true });
    });
    app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  
  app.post("/api/ai/insights", async (req, res) => {
    const { provider, stats, pages, keys } = req.body;
    try {
      const insight = await ai.generateInsights(provider, stats, pages, keys || {});
      res.json({ insight });
    } catch (error: any) {
      console.error("AI Insight Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { provider, query, pages, keys } = req.body;
    try {
      const response = await ai.chat(provider, query, pages, keys || {});
      res.json({ response });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/geo", async (req, res) => {
    const { provider, query, pages, keys } = req.body;
    try {
      const response = await ai.geoAudit(provider, query, pages, keys || {});
      res.json({ response });
    } catch (error: any) {
      console.error("AI GEO Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit/start", async (req, res) => {
    const { url, depth, maxPages } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Start background crawl
    crawler.audit(url, { depth, maxPages }).catch(console.error);
    
    res.json({ message: "Audit started", url });
  });

  app.get("/api/audit/status", async (req, res) => {
    const status = await db.getAuditStatus();
    res.json(status);
  });

  app.get("/api/audit/results", async (req, res) => {
    const pages = await db.getPages();
    const stats = await db.getStats();
    res.json({ pages, stats });
  });

  app.post("/api/audit/reset", async (req, res) => {
    await db.resetData();
    res.json({ message: "Data reset" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware initialized.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

 const PORT = process.env.PORT || 3000;
 app.listen(PORT, '0.0.0.0', () => {
 console.log(`Server running on port ${PORT}`);
});
  });
  } catch (error) {
    console.error("FATAL: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
