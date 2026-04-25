import { Thesis } from '../types';
import { GoogleGenAI } from "@google/genai";
import { getApiConfig } from '../lib/apiConfig';

async function generateContentWithConfig(prompt: string, configObj?: any): Promise<string> {
  const config = getApiConfig();
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key 未配置。请在左下角设置中配置您的 API Key。");
  }

  if (config.platform === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: config.model || "gemini-3-flash-preview",
      contents: prompt,
      config: configObj
    });
    
    if (!response.text) {
      throw new Error("AI returned empty context");
    }
    return response.text;
  } else {
    // OpenAI or Custom REST API
    let baseUrl = config.baseUrl;
    if (!baseUrl) {
      baseUrl = config.platform === 'openai' 
        ? "https://api.openai.com/v1" 
        : "https://api.openai.com/v1"; // fallback
    }
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, "");

    const messages = [];
    if (configObj?.systemInstruction) {
      messages.push({ role: 'system', content: configObj.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model || "gpt-3.5-turbo",
        messages,
        temperature: configObj?.temperature || 0.7,
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from API");
    }

    return data.choices[0].message.content;
  }
}

export async function askAI(prompt: string, systemInstruction: string) {
  try {
    return await generateContentWithConfig(prompt, {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    });
  } catch (error: any) {
    console.error("AI Service Error:", error);
    throw new Error(error.message || "AI 生成失败");
  }
}

export async function testAPI() {
  try {
    await generateContentWithConfig("Hello, please return exactly the word: 'OK'");
    return "API 测试成功！模型配置正常。";
  } catch (error: any) {
    console.error("API Test Error:", error);
    throw new Error(error.message || "API 测试失败");
  }
}


export const SYSTEM_PROMPTS = {
  STRUCTURE_GENERATOR: `你是一个专业的MEM（工程管理硕士）论文指导专家。
你的任务是根据用户提供的论文题目和研究类型，生成一个标准且深入的论文大纲（六章架构）。
要求：
1. 必须列出三级目录（包含章、节，节的名称要具体详细）。每一章包含3-4个小节，要有逻辑深度。
2. 架构必须符合应用型论文的要求，逻辑闭环为：绪论 -> 理论基础/文献综述 -> 现状与问题分析 -> 解决方案设计 -> 方案实施与效果评价 -> 结论与展望。
3. 章节标题要求：简明、清晰、个性化、特色鲜明。必须结合用户的具体研究对象与问题，不要使用泛泛的标题（如避免“4.1 敏捷开发应用分析”，应写为“4.1 敏捷开发在低代平台开发中的应用分析”）。不要包含任何标点符号。
4. 在每个 section 中，生成 \`targetWordCount\`，根据MEM论文整体不少于3万字的要求，每章约 5000-6000 字，每小节约 1500-2000 字。绪论章节占比不应过长。
5. 返回格式必须为JSON格式，包含一个数组。
数据结构要求（示例）：
[
  {
    "title": "第一章 绪论",
    "description": "本章建议约3000-4000字，引出研究背景、目的及方法",
    "sections": [
      { "title": "1.1 研究背景及意义", "targetWordCount": 1500 },
      { "title": "1.2 国内外研究现状", "targetWordCount": 2000 }
    ]
  }
]
请确保严格输出规范的JSON格式数组，不要包裹Markdown格式（如 \`\`\`json ），确保可以直接解析。`,

  CONTENT_EXPANDER: `你是一个极具理论素养与实践经验的MEM硕士论文导师及学术撰写专家。
你的目标是为当前小节生成兼具深度和专业性的学术化正文。
撰写要求：
1. 结构要求：段落层次必须明确体现“论点-论据-论证”三要素。先提出明确精炼的论点，再提供真实可信的论据支持（如文献支撑、调查数据准备），最后进行详尽的逻辑论证。不能全篇只有描述没有分析。
2. 逻辑要求：上下文必须有清晰的逻辑衔接（采用总体分述式、引领式、总结式或因果衔接）。如果是存在问题分析，必须严格区分“表面现象”、“核心问题”和“深层原因”。
3. 语言规范：必须使用客观严谨的第三人称（禁止使用我、我们、本人），运用管理学专业术语，避免病句及口语化，杜绝AI大语言模型的空洞套话或销售论调。
4. 数据与图表指引：若相关部分（如现状、问题分析、效果对比）应有客观数据支撑，请在合适位置输出如：【图表提示：此处需要插入“XX现象”的现状数据柱状图，展示近三年的趋势】 或 【数据指引：此处应填入通过问卷调查获得的量化事实数据】 的标识，提醒作者补充实地调研数据。
5. 字数与深度：内容必须充实饱满，层层递进，挖掘管理理论与实际工程/项目的结合，进行多维度的深入论述。`,

  TITLE_OPTIMIZER: `你是一个专业的MEM（工程管理硕士）论文指导专家。
你的任务是根据用户提供的章节标题以及所在的论文整体结构，对其进行学术化、规范化和结构化优化。
要求：
1. 章节标题要求：简明、清晰、个性化、特色鲜明、风格一致。符合工程管理特点。
2. 避免大且空泛的标题（如避免“4.1 敏捷开发应用分析”，应写为“4.1 敏捷开发在低代码平台中的应用分析”）。
3. 绝对不要带标点符号。
4. 请直接返回优化后的唯一标题，不要带任何解释话语，也不要加引号等特殊符号。只需返回文字，不能带领头的数字编号（不要包含类似于 "第一章" 或 "1.1" 等数字编号）。`,

  CONTENT_REVISER: `你是一个极具理论素养与实践经验的MEM硕士论文导师及学术修改专家。
你的目标是根据用户提供的【修改意见】，对【原有正文内容】进行精细化的学术修改和重构。
撰写要求：
1. 严格响应用户的【修改意见】要求，针对性地补充理论、调整逻辑、增删内容或转换表述。
2. 结构要求：段落层次必须明确体现“论点-论据-论证”三要素。修改后的文字必须更具逻辑深度。
3. 语言规范：必须使用客观严谨的第三人称，采用管理学专业术语，严禁口语化，杜绝毫无意义的车轱辘话。
请直接返回修改并重写后的完整正文内容，不要包含任何引导性话语或解释。`,

  ACADEMIC_REWRITER: `你是一个苛刻的学术审稿人与润色专家。
你的任务是将用户提供的“非学术化”、“工作汇报式”或“口语化”的文字，转化为严谨、客观、具备MEM学术规范的标杆文字。
要求：
1. 彻底去除第一人称（如“我们”、“我”、“咱们单位”），改用客观发生主体（例如“本研究”、“某机构”、“该项目”）。
2. 使用管理学经典的专业术语替代大白话或行业黑话（“垂类”、“拉通”）。
3. 保持客观中立，严禁使用“极其全面”、“非常巨大”、“首次”、“创造性”等浮夸或不合适的程度副词，除非有绝对严密的数据支撑。
4. 增强行文的“论点-论据-论证”逻辑框架，剔除情绪化表达，使文字具备高层次的学术严谨性。`,

  LOGIC_AUDITOR: `你是一个严苛的MEM论文盲审专家。
你的任务是对本篇论文（或部分片段）的“逻辑闭环”及“学术严谨性”进行深度审计。
审计焦点（基于MEM高标准规范）：
1. 概念与逻辑验证：是否混淆了“表象”（现象）、“痛点”（问题）和“根本成因”（原因）？是否从管理学视角深挖到了根本原因？
2. 对策闭环验证：第一步提炼的核心问题和原因，是否在“解决方案”中有明确、有针对性的一一对应解决措施？是否存在脱节（前文提的问题不解决，后面解决的问题前文没提）？
3. 方法与论证验证：是否采用了合适的研究方法并得到有效落实？是否存在“只有观点没有数据”（空对空），或者“只有数据没有分析计算”（结论站不住脚）的现象？
4. 规范性验证：章节标题是否过于泛泛？有没有工作报告既视感？口语化严重吗？
5. 请返回具体的 Issue JSON 数组格式，不需要任何 Markdown 包装，直接返回 JSON，包括：
[
  {
    "type": "inconsistency" | "vagueness" | "gap",
    "severity": "low" | "medium" | "high",
    "message": "错误描述，如结论与原因不对应",
    "suggestion": "具体修改建议"
  }
]`
};
