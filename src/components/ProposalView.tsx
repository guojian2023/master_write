import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Loader2, Sparkles, CheckCircle2, AlertCircle, PlayCircle, FastForward, Edit3, X, Check } from 'lucide-react';
import { Thesis, ProposalSection } from '../types';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

import { getApiConfig } from '../lib/apiConfig';

interface ProposalViewProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
}

const DEFAULT_SECTIONS = [
  { title: "一、选题依据与研究背景", targetWordCount: 800 },
  { title: "二、国内外研究现状", targetWordCount: 1200 },
  { title: "三、研究内容与目标", targetWordCount: 1500 },
  { title: "四、研究方案与方法", targetWordCount: 1500 },
  { title: "五、研究计划与进度安排", targetWordCount: 500 },
  { title: "六、预期成果", targetWordCount: 300 }
];

export default function ProposalView({ thesis, onUpdate }: ProposalViewProps) {
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingConstraint, setIsGeneratingConstraint] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const proposal = thesis.proposal;
  const sections = proposal?.sections || [];
  const hasLegacyContent = !!(!sections.length && proposal?.content);

  const [editingWordSectionId, setEditingWordSectionId] = useState<string | null>(null);
  const [editWordCount, setEditWordCount] = useState<number>(0);

  const handleGenerateOutline = async () => {
    setIsGeneratingOutline(true);
    setErrorMsg(null);
    try {
      // In advanced implementation, we could ask AI to generate the sections.
      // Here we use a robust default that aligns with MEM thesis standards.
      const newSections: ProposalSection[] = DEFAULT_SECTIONS.map((sec, i) => ({
        id: `p-sec-${Date.now()}-${i}`,
        title: sec.title,
        content: '',
        targetWordCount: sec.targetWordCount,
        status: 'idle'
      }));

      onUpdate({
        ...thesis,
        proposal: {
          ...proposal,
          constraintPrompt: proposal?.constraintPrompt || '',
          sections: newSections,
          content: '' // clear legacy content if migrating
        }
      });
    } catch (e: any) {
      setErrorMsg(`大纲生成失败: ${e.message}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateSection = async (sectionId: string) => {
    setErrorMsg(null);
    const secIndex = sections.findIndex(s => s.id === sectionId);
    if (secIndex === -1) return;
    const section = sections[secIndex];

    const currentSections = thesis.proposal?.sections || [];
    const updatedStatusSections = [...currentSections];
    updatedStatusSections[secIndex] = { ...updatedStatusSections[secIndex], status: 'running' };

    onUpdate({
      ...thesis,
      proposal: { ...thesis.proposal!, sections: updatedStatusSections }
    });

    try {
      const outlineStr = thesis.chapters.map(c => 
        `${c.title}\n` + c.sections.map(s => `  - ${s.title}`).join('\n')
      ).join('\n');

      const completedContext = updatedStatusSections
        .filter(s => s.status === 'success' && s.content.length > 0)
        .map(s => `【${s.title}】:\n${s.content}`)
        .join('\n\n');

      const prompt = `项目题目：${thesis.topic}\n研究类别：${thesis.researchType}\n所在领域：${thesis.field}\n
论文大纲结构如下：
${outlineStr}

已完成的开题报告部分（请参考上下文，保持连贯不重复）：
${completedContext || '无'}

请【仅为】开题报告的【${section.title}】这一个部分撰写详细内容。
要求：
1. 必须符合MEM工程管理硕士的要求，专业严谨。
2. 目标字数须严格控制在约 ${section.targetWordCount || 1000} 字左右。
3. 直接输出正文内容，不要输出标题，不要任何寒暄和多余格式。
4. 紧扣此部分的主题，【切勿】擅自撰写其他章节的内容（如无需在"选题依据"中写出"国内外现状"和"预期成果"）。
5. 确保与上述已完成上下文连贯，不要重复前文已写过的内容。`;

      const customConfig = thesis.generationNodes?.['proposal']?.customConfig;
      const apiConfigOverride = customConfig?.enabled ? {
        platform: customConfig.platform,
        model: customConfig.model || undefined, // Fallback applied in askAI if undefined
        baseUrl: customConfig.baseUrl,
        apiKey: customConfig.apiKey
      } : undefined;

      const response = await askAI(prompt, SYSTEM_PROMPTS.PROPOSAL_GENERATOR, apiConfigOverride);
      
      const freshSections = [...(thesis.proposal?.sections || [])];
      const targetIndex = freshSections.findIndex(s => s.id === sectionId);
      if (targetIndex > -1) {
        freshSections[targetIndex] = {
          ...freshSections[targetIndex],
          content: response.trim(),
          status: 'success'
        };

        // Update successful model usage tracking
        const globalConfig = getApiConfig();
        const usedModel = apiConfigOverride?.model || globalConfig.model || 'Unknown';
        const updatedNodes = {
          ...thesis.generationNodes,
          proposal: { 
            stepId: 'proposal' as const, 
            status: 'success' as const, 
            updatedAt: new Date().toISOString(), 
            modelUsed: usedModel,
            customConfig: customConfig
          }
        };

        onUpdate({
          ...thesis,
          proposal: { ...thesis.proposal!, sections: freshSections },
          generationNodes: updatedNodes
        });
      }
    } catch (e: any) {
      console.error(e);
      const errSections = [...(thesis.proposal?.sections || [])];
      const tIndex = errSections.findIndex(s => s.id === sectionId);
      if (tIndex > -1) {
        errSections[tIndex] = { ...errSections[tIndex], status: 'error' };
        onUpdate({
          ...thesis,
          proposal: { ...thesis.proposal!, sections: errSections }
        });
      }
      setErrorMsg(`生成 ${section.title} 失败: ${e.message || String(e)}`);
    }
  };

  const handleSaveWordCount = (sectionId: string) => {
    const freshSections = [...(thesis.proposal?.sections || [])];
    const targetIndex = freshSections.findIndex(s => s.id === sectionId);
    if (targetIndex > -1) {
      freshSections[targetIndex] = {
        ...freshSections[targetIndex],
        targetWordCount: editWordCount
      };
      onUpdate({
        ...thesis,
        proposal: { ...thesis.proposal!, sections: freshSections }
      });
    }
    setEditingWordSectionId(null);
  };

  const handleGenerateConstraint = async () => {
    setIsGeneratingConstraint(true);
    setErrorMsg(null);
    try {
      // Collect full proposal text
      const fullContent = hasLegacyContent ? proposal!.content : sections.map(s => `${s.title}\n${s.content}`).join('\n\n');
      
      const prompt = `以下是我完整的开题报告内容：
${fullContent}

请仔细阅读这段开题报告，并提炼其核心逻辑和基调，作为后续撰写论文正文的"永久约束条件"。
请将提炼的提示词使用 <CONSTRAINT>您的提炼结果</CONSTRAINT> 标签包裹返回。`;

      const customConfig = thesis.generationNodes?.['proposal']?.customConfig;
      const apiConfigOverride = customConfig?.enabled ? {
        platform: customConfig.platform,
        model: customConfig.model || undefined,
        baseUrl: customConfig.baseUrl,
        apiKey: customConfig.apiKey
      } : undefined;
      
      const response = await askAI(prompt, SYSTEM_PROMPTS.PROPOSAL_GENERATOR, apiConfigOverride);
      const constraintMatch = response.match(/<CONSTRAINT>([\s\S]*?)<\/CONSTRAINT>/);
      const constraintPrompt = constraintMatch ? constraintMatch[1].trim() : response.replace(/<[^>]+>/g, '').trim();

      onUpdate({
        ...thesis,
        proposal: {
          ...proposal!,
          constraintPrompt: constraintPrompt
        }
      });
    } catch(e: any) {
      setErrorMsg(`约束提炼失败: ${e.message || String(e)}`);
    } finally {
      setIsGeneratingConstraint(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <FileText className="w-6 h-6 text-indigo-400" />
          开题报告
        </h2>
        
        {(!sections.length && !hasLegacyContent) ? (
          <button
            onClick={handleGenerateOutline}
            disabled={isGeneratingOutline}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingOutline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            生成开题大纲
          </button>
        ) : (
          <button
            onClick={handleGenerateConstraint}
            disabled={isGeneratingConstraint || (!hasLegacyContent && sections.every(s => !s.content))}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingConstraint ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
            提炼核心约束设定
          </button>
        )}
      </div>

      <div className="text-sm text-slate-400 max-w-3xl">
        按照论文逻辑结构，先生成开题报告大纲，再分章节逐步填充内容。结合上下文连贯生成，最后提炼出约束提示词，赋能全篇论文。
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {proposal?.constraintPrompt && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <h3 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            已提取核心约束提示词 (将强制约束后续正文的逻辑走向)
          </h3>
          <p className="text-xs text-indigo-200/70 leading-relaxed font-mono">
            {proposal.constraintPrompt}
          </p>
        </motion.div>
      )}

      {!sections.length && !hasLegacyContent && (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl">
          <FileText className="w-16 h-16 text-slate-700 mb-6" />
          <p className="text-slate-400 text-sm font-medium">尚未初始化开题报告</p>
          <p className="text-slate-500 text-xs mt-2 max-w-md text-center">点击右上角"生成开题大纲"按钮，系统将为你构建标准开题骨架。</p>
        </div>
      )}

      {hasLegacyContent && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 shadow-xl opacity-50">
          <div className="text-xs text-slate-500 mb-4 font-bold border-b border-slate-800 pb-4 flex justify-between">
            <span>（旧版完整开题报告存档）</span>
            <button className="text-blue-400 hover:underline" onClick={handleGenerateOutline}>重新按大纲逻辑生成</button>
          </div>
          <div className="prose prose-invert prose-blue max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-p:leading-relaxed">
            <div className="whitespace-pre-wrap">{proposal.content}</div>
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div className="space-y-6">
          {sections.map((sec, index) => (
            <motion.div 
              key={sec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
            >
              <div className="flex items-center justify-between p-4 bg-slate-800/30 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-200 text-sm">{sec.title}</h3>
                  {editingWordSectionId === sec.id ? (
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                      <span className="text-xs text-slate-500">目标字数:</span>
                      <input 
                        type="number" 
                        value={editWordCount}
                        onChange={(e) => setEditWordCount(Number(e.target.value))}
                        className="w-16 bg-transparent text-xs text-white border-b border-blue-500 outline-none text-center"
                        autoFocus
                      />
                      <button onClick={() => handleSaveWordCount(sec.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setEditingWordSectionId(null)} className="text-slate-400 hover:text-slate-300 p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/word">
                      <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">目标字数: ~{sec.targetWordCount || 1000}</span>
                      <button 
                        onClick={() => {
                          setEditingWordSectionId(sec.id);
                          setEditWordCount(sec.targetWordCount || 1000);
                        }}
                        className="text-slate-500 hover:text-blue-400 opacity-0 group-hover/word:opacity-100 transition-opacity"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {sec.status === 'success' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider font-bold">已完成</span>}
                  <button
                    onClick={() => handleGenerateSection(sec.id)}
                    disabled={sec.status === 'running'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {sec.status === 'running' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : sec.status === 'success' ? (
                      <PlayCircle className="w-3 h-3" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {sec.status === 'success' ? '重写内容' : 'AI 撰写'}
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {sec.content ? (
                  <div className="prose prose-invert prose-blue max-w-none prose-p:text-slate-300 prose-p:leading-relaxed text-sm">
                    <div className="whitespace-pre-wrap">{sec.content}</div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-600 italic text-sm">
                    {sec.status === 'running' ? 'AI 正在构思内容，请稍候...' : '暂无内容，请点击右上角进行生成。'}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
