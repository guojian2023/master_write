import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Loader2, Sparkles, CheckCircle2, AlertCircle, PlayCircle, FastForward, Edit3, X, Check, ShieldCheck, AlertTriangle, MessageSquareDiff, RefreshCw } from 'lucide-react';
import { Thesis, ProposalSection, LogicIssue } from '../types';
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

  // Issue audit
  const [isAuditing, setIsAuditing] = useState(false);
  const [fixingIssues, setFixingIssues] = useState<Record<number, boolean>>({});
  const issues = proposal?.auditIssues || [];

  // Manual revise
  const [revisionComments, setRevisionComments] = useState<Record<string, string>>({});
  const [isRewriting, setIsRewriting] = useState<Record<string, boolean>>({});

  const performAudit = async () => {
    setIsAuditing(true);
    setErrorMsg(null);
    try {
      const contentSummary = sections.map(s => `【模块标题：${s.title}，模块ID：${s.id}】\n内容摘要：${s.content?.substring(0, 800) || '暂无内容'}`).join('\n\n');

      const prompt = `项目题目：${thesis.topic}\n开题报告内容汇总：\n${contentSummary}\n\n请作为评审专家，对该开题报告进行深度逻辑审计。特别检查：\n1. 选题依据与研究目标是否匹配，研究方案是否支撑研究内容。\n2. 逻辑断层：国内外研究现状是否引出了本文的研究问题。\n3. 可行性与计划：方法是否具体，预期成果是否合理。\n\n请返回符合系统预设结构（包含 type, severity, message, suggestion, sectionId, sectionTitle）的JSON数组。务必包含每条意见对应的 sectionId 和 sectionTitle。`;
      
      const response = await askAI(prompt, SYSTEM_PROMPTS.PROPOSAL_AUDITOR);
      const jsonStr = response.replace(/```json|```/g, '').trim();
      const parsedIssues = JSON.parse(jsonStr);
      
      onUpdate({
        ...thesis,
        proposal: {
          ...proposal!,
          auditIssues: parsedIssues,
          lastAuditDate: new Date().toLocaleString()
        }
      });
    } catch (e: any) {
      setErrorMsg(`审计失败: ${e.message || String(e)}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFixIssue = async (index: number) => {
    const issue = issues[index];
    if (!issue.sectionId) {
      setErrorMsg(`第 ${index + 1} 条建议缺少 sectionId，无法自动修复`);
      return;
    }

    const targetIndex = sections.findIndex(s => s.id === issue.sectionId);
    if (targetIndex === -1) {
      setErrorMsg(`未找到匹配的章节 ID: ${issue.sectionId}`);
      return;
    }
    const targetSection = sections[targetIndex];

    setFixingIssues(prev => ({ ...prev, [index]: true }));
    try {
      const prompt = `【详细修改建议与批评】：${issue.suggestion}\n\n【需修改到的开题模块标题】：${issue.sectionTitle || targetSection.title}\n【原开题报告内容】：\n${targetSection.content}`;
      const revisedContent = await askAI(prompt, SYSTEM_PROMPTS.CONTENT_REVISER);

      if (!revisedContent) throw new Error("AI未返回修改的内容");

      const freshSections = [...sections];
      freshSections[targetIndex] = { ...targetSection, content: revisedContent.trim() };
      
      const newIssues = issues.filter((_, i) => i !== index);

      onUpdate({ 
        ...thesis, 
        proposal: { ...thesis.proposal!, sections: freshSections, auditIssues: newIssues } 
      });
    } catch (e: any) {
      setErrorMsg(`修复报错: ${e.message || String(e)}`);
    } finally {
      setFixingIssues(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleIgnoreIssue = (idx: number) => {
    const newIssues = issues.filter((_, i) => i !== idx);
    onUpdate({ 
      ...thesis, 
      proposal: { ...thesis.proposal!, auditIssues: newIssues } 
    });
  };

  const handleManualRevise = async (sectionId: string) => {
    const comment = revisionComments[sectionId];
    if (!comment || !comment.trim() || isRewriting[sectionId]) return;

    setIsRewriting(prev => ({ ...prev, [sectionId]: true }));
    setErrorMsg(null);
    try {
      const secIndex = sections.findIndex(s => s.id === sectionId);
      const section = sections[secIndex];

      const prompt = `现有开题报告模块：${section.title}\n内容：\n${section.content}\n\n针对以上内容的修改意见：\n${comment}\n\n请严格基于上述意见对该模块进行重新组织和学术重写，保持专业严谨的管理学风格。直接输出修改后的文本，不要多余的话。`;
      
      const rewritten = await askAI(prompt, SYSTEM_PROMPTS.CONTENT_REVISER);
      
      const freshSections = [...sections];
      freshSections[secIndex] = {
        ...section,
        content: rewritten.trim(),
        status: 'success'
      };
      
      onUpdate({
        ...thesis,
        proposal: { ...thesis.proposal!, sections: freshSections }
      });
      
      setRevisionComments(prev => ({ ...prev, [sectionId]: '' }));
    } catch (e: any) {
      setErrorMsg(`改写报错: ${e.message || String(e)}`);
    } finally {
      setIsRewriting(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const handleGenerateOutline = async () => {
    setIsGeneratingOutline(true);
    setErrorMsg(null);
    try {
      // In advanced implementation, we could ask AI to generate the sections.
      // Here we use a robust default that aligns with management thesis standards.
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
1. 必须符合管理类硕士的要求，专业严谨。
2. 目标字数须严格控制在约 ${section.targetWordCount || 1000} 字左右（允许±10%误差）。这是硬性约束，请务必保证字数达标！
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

  const totalWords = hasLegacyContent && proposal?.content 
    ? proposal.content.length 
    : sections.reduce((acc, s) => acc + (s.content?.length || 0), 0);

  const handleExport = () => {
    let content = `# 开题报告：${thesis.topic}\n\n`;
    if (hasLegacyContent) {
      content += proposal!.content!;
    } else {
      sections.forEach(s => {
        content += `## ${s.title}\n\n${s.content || ''}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `开题报告_${thesis.topic}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-400" />
            开题报告
          </h2>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">总字数</span>
            <span className="text-sm font-mono text-emerald-400 font-bold">{totalWords}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
            <>
              <button
                onClick={performAudit}
                disabled={isAuditing || (!hasLegacyContent && sections.every(s => !s.content))}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600/20 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                逻辑审计
              </button>
              <button
                onClick={handleGenerateConstraint}
                disabled={isGeneratingConstraint || (!hasLegacyContent && sections.every(s => !s.content))}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingConstraint ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
                提炼核心约束设定
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
              >
                导出报告
              </button>
            </>
          )}
        </div>
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

      {issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              发现 {issues.length} 个逻辑改进建议
            </h3>
            {proposal?.lastAuditDate && (
              <span className="text-[10px] text-slate-500">最新审计: {proposal.lastAuditDate}</span>
            )}
          </div>
          <div className="space-y-4">
            {issues.map((issue, idx) => (
              <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {issue.severity === 'high' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-bold text-slate-300">
                    {issue.type === 'gap' ? '逻辑断层' : issue.type === 'inconsistency' ? '前后矛盾' : issue.type === 'vagueness' ? '表述含糊' : '方法论缺陷'}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    定位: {issue.sectionTitle || '全局'}
                  </span>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-400">问题：</span>{issue.message}
                </div>
                <div className="text-sm text-amber-400/90 leading-relaxed bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  <span className="font-bold">对策：</span>{issue.suggestion}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={() => handleFixIssue(idx)}
                    disabled={fixingIssues[idx]}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    {fixingIssues[idx] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    一键 AI 修复本开题模块
                  </button>
                  <button 
                    onClick={() => handleIgnoreIssue(idx)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-emerald-400 transition-all"
                  >
                    标记已处理
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                      <span className={`text-xs px-2 py-1 rounded-md border ${sec.content?.length > 0 ? (Math.abs(sec.content.length - (sec.targetWordCount || 1000)) > (sec.targetWordCount || 1000)*0.2 ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10') : 'text-slate-500 border-slate-800 bg-slate-900'}`}>已写字数: {sec.content?.length || 0}</span>
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
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 prose prose-invert prose-blue max-w-none prose-p:text-slate-300 prose-p:leading-relaxed text-sm">
                      <div className="whitespace-pre-wrap">{sec.content}</div>
                    </div>
                    <div className="md:w-72 shrink-0 md:border-l border-slate-800 md:pl-6 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-1"><MessageSquareDiff className="w-4 h-4 text-amber-500" />定向修改意见</h4>
                      <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 outline-none resize-none placeholder:text-slate-600 focus:border-amber-500/50 focus:bg-slate-900/80 transition-colors h-32"
                        placeholder="例如：缺少理论模型的应用、逻辑过渡不平滑..."
                        value={revisionComments[sec.id] || ''}
                        onChange={e => setRevisionComments(prev => ({ ...prev, [sec.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => handleManualRevise(sec.id)}
                        disabled={isRewriting[sec.id] || !revisionComments[sec.id]?.trim()}
                        className="w-full py-2.5 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRewriting[sec.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        根据意见重写本文
                      </button>
                    </div>
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
