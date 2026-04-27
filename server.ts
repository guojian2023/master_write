import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/save-theses", async (req, res) => {
    try {
      const { theses } = req.body;
      if (!theses || !Array.isArray(theses)) return res.status(400).json({ error: "No theses data" });
      
      const fs = await import("node:fs/promises");
      const filePath = path.join(process.cwd(), "theses_data.json");
      await fs.writeFile(filePath, JSON.stringify(theses, null, 2), "utf-8");
      
      res.json({ status: "saved", path: filePath });
    } catch (error: any) {
      console.error("File save error:", error);
      res.status(500).json({ error: "Failed to save to disk", details: error.message });
    }
  });

  app.post("/api/sync-markdown", async (req, res) => {
    try {
      const { id, title, markdown } = req.body;
      if (!id || !markdown) return res.status(400).json({ error: "Missing required fields" });

      const fs = await import("node:fs/promises");
      const outputDir = path.join(process.cwd(), "outputs");
      await fs.mkdir(outputDir, { recursive: true }).catch(() => {});

      const safeTitle = (title || "未命名论文").replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      const filename = `${safeTitle}_${id.substring(0, 6)}.md`;
      const filePath = path.join(outputDir, filename);

      await fs.writeFile(filePath, markdown, "utf-8");
      
      res.json({ status: "saved", path: filePath });
    } catch (error: any) {
      console.error("Markdown sync error:", error);
      res.status(500).json({ error: "Failed to sync markdown", details: error.message });
    }
  });

  app.post("/api/delete-markdown", async (req, res) => {
    try {
      const { id, title } = req.body;
      if (!id) return res.status(400).json({ error: "Missing required fields" });

      const fs = await import("node:fs/promises");
      const outputDir = path.join(process.cwd(), "outputs");

      const safeTitle = (title || "未命名论文").replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      const filename = `${safeTitle}_${id.substring(0, 6)}.md`;
      const filePath = path.join(outputDir, filename);

      await fs.rm(filePath, { force: true });
      
      res.json({ status: "deleted" });
    } catch (error: any) {
      console.error("Markdown delete error:", error);
      res.status(500).json({ error: "Failed to delete markdown" });
    }
  });

  app.get("/api/load-theses", async (req, res) => {
    try {
      const fs = await import("node:fs/promises");
      const filePath = path.join(process.cwd(), "theses_data.json");
      const data = await fs.readFile(filePath, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(200).json([]); // Return empty array if not found
    }
  });

  app.get("/api/test-api", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = (req.query.model as string) || "gemini-2.5-flash";
      
      if (!apiKey) {
        return res.status(400).json({ error: "服务器未配置 API Key (GEMINI_API_KEY)。请在 AI Studio 设置中配置。" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: model,
        contents: "Hello",
      });

      if (response.text) {
        res.json({ status: "ok", message: `API 测试成功！模型配置 (${model}) 正常。` });
      } else {
        res.status(500).json({ error: "API 测试异常，未收到回复。" });
      }
    } catch (error: any) {
      console.error("API Test Error:", error);
      const errDetails = error instanceof Error ? error.message : String(error);
      const fullErrorStr = errDetails + " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
      res.status(500).json({ 
        error: "API 测试失败", 
        details: fullErrorStr
      });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, model } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("Critical: GEMINI_API_KEY is not defined in environment");
        return res.status(500).json({ error: "服务器未配置 API Key" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: model || "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text;
      
      if (!text) {
        throw new Error("AI returned empty context");
      }

      res.json({ text });
    } catch (error: any) {
      console.error("AI Generation detailed error:", error);
      const errDetails = error instanceof Error ? error.message : String(error);
      const fullErrorStr = errDetails + " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
      res.status(500).json({ 
        error: "AI 生成失败", 
        details: fullErrorStr
      });
    }
  });

  // Vite middleware for development
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
