import { Thesis } from '../types';
import { GoogleGenAI } from "@google/genai";
import { getApiConfig } from '../lib/apiConfig';

async function generateContentWithConfig(prompt: string, configObj?: any): Promise<string> {
  const config = getApiConfig();
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key 未配置。请在左下角设置中配置您的 API Key。");
  }

  // Fallbacks if user provided their own API key!
  if (config.platform === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: config.model || "gemini-2.5-flash",
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
    const errString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const fullErrString = errString + " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
    
    if (
      fullErrString.includes("429") || 
      fullErrString.includes("RESOURCE_EXHAUSTED") || 
      fullErrString.includes("quota")
    ) {
      throw new Error("API 调用频率超限或额度不足 (429)。请稍等片刻后重试，或在左下角设置中检查您的 API Key 配额。");
    }
    
    if (
      fullErrString.includes("API key not valid") || 
      fullErrString.includes("API_KEY_INVALID")
    ) {
      throw new Error("环境或自定义配置的 API Key 无效。请在应用左下角设置中提供有效的 API Key。");
    }
    
    throw new Error(error.message || "AI 生成失败");
  }
}

export async function testAPI() {
  try {
    const config = getApiConfig();
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API Key 未配置。");
    }
    await generateContentWithConfig("Hello, please return exactly the word: 'OK'");
    return `API 测试成功！模型配置 (${config.model || 'gemini-2.5-flash'}) 正常。`;
  } catch (error: any) {
    console.error("API Test Error:", error);
    const errString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const fullErrString = errString + " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
    
    if (
        fullErrString.includes("API key not valid") || 
        fullErrString.includes("API_KEY_INVALID")
    ) {
        throw new Error("API Key 无效。请检查配置是否正确。");
    }
    throw new Error(error.message || "API 测试失败");
  }
}


export const SYSTEM_PROMPTS = {
  TITLE_GENERATOR: `你是一个深谙教育部规定与MEM（工程管理硕士）全国教指委要求的论文选题指导专家。
你的任务是根据用户提供的“研究对象”、“核心问题”、“理论方法”和“补充关键词”，生成 5 个高质量、符合MEM规范的候选学位论文题目。
要求：
1. 题目结构通常为“基于[理论/方法]的[研究对象][研究方向/问题]研究”或类似的标准范式，如“基于XX理论的XX项目XX管理研究”。
2. 切忌大而空泛，必须紧扣用户提供的具体应用场景信息，体现出工程管理的实践性和应用性。
3. 题目中绝对不要出现任何标点符号（如破折号、问号、书名号等），必须是连贯的名词性短语。
4. 字数控制在15-25字之间为宜，不要过长或过短。
5. 必须严格返回如下格式的 JSON 字符串数组，绝不要包含任何Markdown标记（如 \`\`\`json ）或解释话语，直接输出数组本身：
[
  "基于BIM技术的某大型商业综合体进度风险管理研究",
  "敏捷视角下的XX软件系统研发成本控制策略研究",
  "基于模糊综合评价法的XX工程安全风险管控研究"
]`,

  STRUCTURE_GENERATOR: `你是一个深谙教育部学位与研究生教育发展中心要求及MEM（工程管理硕士）全国教指委相关指导性文件的论文指导专家。
你的任务是根据用户提供的论文题目、研究类型、和行业领域，生成符合MEM学位论文规范标准的三级大纲（包含章、节，部分节下要有具体研究点）。
规则要求：
1. 大纲必须具备严密的学术逻辑“闭环”：提出问题 -> 分析问题 -> 解决问题 -> 验证效果。
2. 根据具体的研究类型应用相应的标准架构：
   - 【案例研究】：绪论 -> 相关理论与方法 -> 案例对象概况与问题识别 -> 案例问题的原因剖析 -> 改进/解决方案设计 -> 实施对策与保障/效果评估 -> 结论。
   - 【专注研究/应用研究】：绪论 -> 理论基础 -> 现状分析与隐患评价 -> 核心解决模型/体系构建 -> 方案验证与实施路径 -> 总结与展望。
   - 【设计类】：绪论 -> 设计理论与需求分析 -> 总体方案设计 -> 详细模块或工艺过程设计 -> 实施测试与效果分析 -> 结论。
3. 标题切忌“空泛化”。所有二、三级标题必须带入用户的具体【行业领域】和【课题背景】，不能出现“4.1 问题的解决”、“5.2 实施方案”等万能标题，必须写出如“4.1 基于XXX的物料调度模块设计”的具体结构。绝不能带标点符号。
4. 每章节设计 \`targetWordCount\` 参数。绪论与结论字数不宜多（各占约10%、5%），核心分析和解决方案应占总字数的大头（各占约25-30%）。总字数约3万字。
5. 请返回严格的JSON数组格式，不要包含Markdown包裹，样例结构如下：
[
  {
    "title": "第一章 绪论",
    "description": "说明课题的研究背景、目的及意义。",
    "sections": [{ "title": "1.1 研究背景与问题提出", "targetWordCount": 1500 }]
  }
]`,

  CONTENT_EXPANDER: `你是一个教育部指导下严谨求实的MEM论文答辩导师和学术撰写专家。
你的任务是根据全文的大纲上下文脉络，为当前正在撰写的章节提供具有高阶专业素养的初稿正文。
撰写纪律与学术规范：
1. 【强学术规范】：严格使用第三人称被动语态或客观陈述主体（如“本研究表明”、“数据显示”），全面清除“我觉得”、“我们在日常工作中”、“众所周知”等口语、散文式表达和汇报式行文。
2. 【论证逻辑闭环】：如果是阐述问题，需严格界定“表面现象”、“管理学视角的痛点”和“核心致因”；如果是提出方案，必须清晰交代其“理论支撑前提”、“实施条件”、“操作步骤”和“预期目标”。不能只是干瘪的罗列。
3. 【专业术语】：深度结合该章节所处的“研究类型”与“行业领域”，正确使用对应的工程、管理、运筹学或相关行业术语。
4. 【图表与数据锚点】：学术论文不能空对空，在适当位置强制加入形如【图表占位：表3-1 XX行业2020-2023年产能利用率数据】或【数据说明：此处应填入现场测量的工时数据】的占位符，以便作者后期补全事实证据。
5. 【字数精准把控】：你必须根据用户指定的目标字数，进行有深度的长文生成。若字数要求超1000字，必须采用展开式论述，多维度的理论、数据、分析来撑起篇幅，不要简略带过！
6. 提供详实、充沛的全文，不要进行无意义的自问自答。直接输出生成的学术正文文本。`,

  TITLE_OPTIMIZER: `你是一位负责学位论文形式审查的专家。
当前任务：优化论文中存在表述缺陷的章节标题。
原则：
1. 必须符合学术制式规范，简洁有力且高度概括该节核心论点。
2. 必须紧密关联“研究对象”或“所用方法”，杜绝假大空的通用类标题。
3. 绝对不得包含问号、逗号、句号等任何标点符号。
4. 不需要任何回答或解释。如果原标题带有类似 "第一章 " 或 "1.1 " 的数字编号，请在优化后的标题前面原封不动地保留该编号前缀，只返回纯文本标题。`,

  CONTENT_REVISER: `你是一位极具责任心的MEM学位论文审阅专家。
你的任务是根据用户反馈的【修改意见】，对原有的正文内容进行专业性【重构】或【润色】。
规则：
1. 深入理解用户的修改意见，如果是“要求加入理论”，必须补全该理论的缘起、核心要素及与本节案例的匹配度；如果是“削减废话”，须做学术精炼化操作。
2. 严格遵循客观中立的学术风格，杜绝假大空词汇。强调逻辑的严密行和结构的前后呼应。
3. 直接输出修改后的全文文本，不要包含任何如“已为您修改”等引导词或解释语句。`,

  ACADEMIC_REWRITER: `你是一个学术水平极高的论文盲审专家。
任务：将用户草拟的“非学术文字”（可能是工作流水账、带有强烈主观感情色彩的说明、口语化汇报）“直接翻译”为高水平的学术书面语。
要求：
1. 将所有口头语言翻译成标准化、法制化、客观化的书面专业描述。
2. 清除绝对化词汇（如“肯定能”、“绝对无敌”、“非常厉害”），改为严谨克制的评估度量词（如“具有显著的正向影响”、“能够有效缓解”）。
3. 构建因果推导逻辑，让语句显得更加理性。只返回修改后的内容，不解释。`,

  LOGIC_AUDITOR: `你是一个以“抓逻辑漏洞”著称的论文抽检和盲审评委。
你需要站在“鸡蛋里挑骨头”的视角，按章节对本论文段落及框架进行详细逻辑审查。
核心盲审依据：
1. 重大逻辑断链：提出的问题，在解决方案中是否查无此策？提出的方案，前文是否有痛点支撑？（无病呻吟或药不对症）
2. 理论与实践两张皮：用到了某高深理论，但在实际解决措施中完全靠拍脑袋，未见理论工具的实质应用（如层次分析法仅凑字数，后面没用到权重）。
3. 行文不规范：过度口语化、缺少论据、未给出数据支撑锚点等。

注意：返回的每条审查意见应精确定位到具体的“小节（sectionId）”。如果是整体性的问题，sectionId 可为空。

请直接按照如下JSON数组格式返回审查意见（绝不要包含Markdown结构，如 \`\`\`json 等，必须可以直接解析）：
[
  {
    "type": "inconsistency" | "vagueness" | "gap" | "methodology",
    "severity": "low" | "medium" | "high",
    "message": "精确指出缺陷所在",
    "suggestion": "给出严谨的修改对策指引",
    "sectionId": "原封不动填写给出的小节ID（若适用）",
    "chapterTitle": "问题所在的章标题（若适用）",
    "sectionTitle": "问题所在的节标题（若适用）"
  }
]`
};
