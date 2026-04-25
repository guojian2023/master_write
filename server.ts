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

  app.post("/api/save-thesis", async (req, res) => {
    try {
      const { thesis } = req.body;
      if (!thesis) return res.status(400).json({ error: "No thesis data" });
      
      const fs = await import("node:fs/promises");
      const filePath = path.join(process.cwd(), "thesis_data.json");
      await fs.writeFile(filePath, JSON.stringify(thesis, null, 2), "utf-8");
      
      res.json({ status: "saved", path: filePath });
    } catch (error: any) {
      console.error("File save error:", error);
      res.status(500).json({ error: "Failed to save to disk", details: error.message });
    }
  });

  app.get("/api/test-api", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: "服务器未配置 API Key (GEMINI_API_KEY)。请在 AI Studio 设置中配置。" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hello",
      });

      if (response.text) {
        res.json({ status: "ok", message: "API 测试成功！模型配置正常。" });
      } else {
        res.status(500).json({ error: "API 测试异常，未收到回复。" });
      }
    } catch (error: any) {
      console.error("API Test Error:", error);
      res.status(500).json({ 
        error: "API 测试失败", 
        details: error.message || "未知原因"
      });
    }
  });

  app.get("/api/load-thesis", async (req, res) => {
    try {
      const fs = await import("node:fs/promises");
      const filePath = path.join(process.cwd(), "thesis_data.json");
      const data = await fs.readFile(filePath, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(404).json({ error: "No saved data found" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("Critical: GEMINI_API_KEY is not defined in environment");
        return res.status(500).json({ error: "服务器未配置 API Key" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
      res.status(500).json({ 
        error: "AI 生成失败", 
        details: error.message || "未知原因"
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
