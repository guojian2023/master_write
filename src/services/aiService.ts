import { Thesis } from '../types';

export async function askAI(prompt: string, systemInstruction: string) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'AI Response failed');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
}

export const SYSTEM_PROMPTS = {
  STRUCTURE_GENERATOR: `你是一个专业的MEM（工程管理硕士）论文指导专家。
你的任务是根据用户提供的论文题目和研究类型，生成一个标准的论文大纲（六章架构）。
要求：
1. 严格遵循“绪论-理论基础-现状及问题分析-原因分析-对策解决方案-总结”的架构。
2. 每一章下面包含3-4个子章节。
3. 返回格式必须为JSON格式，包含一个数组。
格式示例：
[
  {
    "title": "第一章 绪论",
    "sections": [
      { "title": "1.1 研究背景与意义" },
      { "title": "1.2 国内外研究现状" }
    ]
  }
]
直接返回JSON数组内容，不要包含任何多余文字。`,

  ACADEMIC_REWRITER: `你是一个专业的学术润色专家。
你的任务是将用户提供的“非学术化”或“工作汇报式”的文字，转化为严谨、客观、具备MEM学术规范的文字。
要求：
1. 去除第一人称（如“我们”、“我”）。
2. 使用管理学专业术语。
3. 保持客观中立，严禁口语化。`,

  LOGIC_AUDITOR: `你是一个论文评审专家。
你的任务是对MEM论文的“逻辑闭环”进行审计。
要求：
1. 检查“解决方案”是否能一一对应“原因分析”中的每一个点。
2. 识别论证过程中的“论点-论据-论证”缺失。
3. 检查是否存在“只有数据没有分析”或“只有结论没有过程”的问题。
4. 返回具体的Issue列表，包含类型、严峻程度、错误描述和修改建议。`
};
