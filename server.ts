import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

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
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json(parsed);
      }
      throw new Error("Empty theses data");
    } catch (error) {
      // Fallback to a default, persistent test data
      const defaultTestData = [
        {
          id: "test-thesis-id-001",
          topic: "新能源汽车动力电池回收网络的规划与设计策略研究（系统测试示例）",
          researchType: "special",
          field: "新能源环保与供应链管理",
          targetTotalWords: 30000,
          generationNodes: {
             topic: { stepId: "topic", status: "success", modelUsed: "User/Setup", updatedAt: new Date().toISOString() },
             style: { stepId: "style", status: "success", modelUsed: "User/Setup", updatedAt: new Date().toISOString() },
             outline: { stepId: "outline", status: "success", modelUsed: "Auto", updatedAt: new Date().toISOString() },
             proposal: { stepId: "proposal", status: "success", modelUsed: "Auto", updatedAt: new Date().toISOString() }
          },
          updatedAt: new Date().toISOString(),
          problems: ["回收网络不完善", "成本极高"],
          solutions: ["优化逆向物流网络", "区域回收中心设计"],
          citations: [],
          proposal: {
            constraintPrompt: "以工程管理硕士（MEM）视角，提出优化动力电池回收网络降低整体成本方案。",
            sections: [
              {
                id: "p-sec-1",
                title: "一、选题依据与研究背景",
                targetWordCount: 800,
                status: "success",
                content: "随着新能源汽车产业的迅猛发展，动力电池的退役潮已经到来。建立科学高效的动力电池回收网络已成为我国可持续发展战略的重要一环。当前的痛点在于..."
              },
              {
                id: "p-sec-2",
                title: "二、研究内容与目标",
                targetWordCount: 1500,
                status: "success",
                content: "本研究旨在分析当前退役动力电池逆向物流网络现状的基础上，通过建立网络规划数学模型，设计出兼顾经济性和环保性的区域回收网络方案..."
              }
            ]
          },
          chapters: [
            {
              id: "c-1",
              title: "第一章 绪论",
              description: "本章主要介绍研究背景、目的意义及国内外相关研究进展。",
              sections: [
                {
                  id: "c-1-s-1",
                  title: "1.1 研究背景及意义",
                  targetWordCount: 1500,
                  status: "complete",
                  content: "新能源汽车的产销量在过去十年中实现了爆发式增长。这不仅带动了相关产业链的发展，也带来了一系列环境与资源问题..."
                },
                {
                  id: "c-1-s-2",
                  title: "1.2 国内外研究现状",
                  targetWordCount: 2000,
                  status: "complete",
                  content: "学术界关于动力电池回收与逆向物流网络的研究主要集中在如下几个方面。从理论基础来看..."
                }
              ]
            },
            {
              id: "c-2",
              title: "第二章 动力电池回收逆向物流网络现状分析",
              description: "深入分析当前行业的痛点",
              sections: [
                {
                  id: "c-2-s-1",
                  title: "2.1 回收模式现状分析",
                  targetWordCount: 3000,
                  status: "empty",
                  content: ""
                }
              ]
            }
          ]
        }
      ];
      res.status(200).json(defaultTestData);
    }
  });

  app.get("/api/test-api", async (req, res) => {
    let debugInfo = "unknown";
    try {
      let apiKey = req.query.apiKey as string | undefined;
      if (apiKey === "undefined" || apiKey === "") apiKey = undefined;
      apiKey = apiKey || process.env.GEMINI_API_KEY;
      const model = (req.query.model as string) || "gemini-2.5-flash";
      const baseUrl = (req.query.baseUrl as string) || undefined;
      
      debugInfo = "Using key starting with " + (apiKey ? apiKey.substring(0, 4) + " len " + apiKey.length : "empty");
      
      if (!apiKey) {
        return res.status(400).json({ error: "服务器未配置 API Key (GEMINI_API_KEY)。请在 AI Studio 设置中配置。" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: baseUrl ? { baseUrl } : undefined
      });
      
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
        debugInfo,
        details: fullErrorStr
      });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      let { prompt, systemInstruction, model, customApiKey, baseUrl } = req.body;
      if (customApiKey === "undefined" || customApiKey === "") customApiKey = undefined;
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("Critical: GEMINI_API_KEY is not defined in environment");
        return res.status(500).json({ error: "服务器未配置 API Key" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: baseUrl ? { baseUrl } : undefined
      });
      
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

      res.json({ text, usage: response.usageMetadata });
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
