import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
  Eye,
  Type,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Thesis, Section } from '../types';
import { cn } from '../lib/utils';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

interface EditorViewProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
  initialSectionId?: string | null;
}

export default function EditorView({ thesis, onUpdate, initialSectionId }: EditorViewProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(initialSectionId || null);
  const [content, setContent] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  // Sync content with state when section changes
  useEffect(() => {
    if (activeSectionId) {
      const section = findSection(activeSectionId);
      setContent(section?.content || '');
    }
  }, [activeSectionId]);

  const findSection = (id: string): Section | undefined => {
    for (const chapter of thesis.chapters) {
      const section = chapter.sections.find(s => s.id === id);
      if (section) return section;
    }
    return undefined;
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    saveContent(newContent);
  };

  const saveContent = (val: string) => {
    const updatedThesis = { ...thesis };
    for (const chapter of updatedThesis.chapters) {
      const section = chapter.sections.find(s => s.id === activeSectionId);
      if (section) {
        section.content = val;
        section.status = val.length > 500 ? 'complete' : val.length > 0 ? 'draft' : 'empty';
        break;
      }
    }
    onUpdate(updatedThesis);
  };

  const handleAIExpand = async () => {
    if (isExpanding || !activeSectionId) return;
    setIsExpanding(true);
    try {
      const section = findSection(activeSectionId);
      
      // Collect full context for logic consistency
      const allSections: Section[] = [];
      thesis.chapters.forEach(c => allSections.push(...c.sections));
      const currentIndex = allSections.findIndex(s => s.id === activeSectionId);
      const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
      const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;

      const structure = thesis.chapters.map(c => 
        `- ${c.title}\n  ${c.sections.map(s => `  * ${s.title}`).join('\n')}`
      ).join('\n');

      const prompt = `
论文题目：${thesis.topic}
研究类型：MEM（工程管理硕士）
行业领域：${thesis.field}

[论文全局大纲]
${structure}

[上下文关联]
${prevSection ? `前一章节（${prevSection.title}）摘要：${prevSection.content.substring(0, 500)}...` : '（本章为开头章节）'}
${nextSection ? `后一章节（${nextSection.title}）预告：系统将确保本段与下一章逻辑闭环。` : '（本章为结尾章节）'}

[当前任务]
正在撰写章节：${section?.title}
章节已有内容：
${content || '(该章节尚无内容，请开始生成初稿)'}

任务：
请基于以上全文逻辑架构，为当前章节进行深度学术扩写或生成。
要求：
1. 【强逻辑性】：必须确保章节内容与全局大纲及前一章节衔接严密，体现管理学逻辑的连贯性。
2. 【专业深度】：深度融入管理学、工程学、运筹学或相关行业理论。
3. 【学术规范】：使用严谨的学术书面语，禁止使用口语、感叹号或第一人称。
4. 【字数要求】：扩充或生成不少于800字的高质量文本。

直接返回生成的学术正文，不要包含任何引导性话语。
`;
      const expanded = await askAI(prompt, "你是一个极具逻辑性的MEM硕士论文导师。你的目标是确保每一章节都在全文逻辑链条中占有精准地位，并提供极具深度和专业性的学术文字。");
      if (!expanded) throw new Error("AI 未返回任何内容");
      handleContentChange(content ? content + "\n\n" + expanded : expanded);
    } catch (e: any) {
      console.error("AI Expand error:", e);
      alert("AI 扩充失败: " + (e.message || "未知错误"));
    } finally {
      setIsExpanding(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!content || isRewriting) return;
    setIsRewriting(true);
    try {
      const rewritten = await askAI(`请将以下文字转化为专业的学术表述，去除口语化和第一人称：\n${content}`, SYSTEM_PROMPTS.ACADEMIC_REWRITER);
      handleContentChange(rewritten);
    } catch (e) {
      alert("AI 润色失败");
    } finally {
      setIsRewriting(false);
    }
  };

  const currentSection = activeSectionId ? findSection(activeSectionId) : null;

  return (
    <div className="flex h-full gap-6 pb-6">
      {/* Sidebar - Section List */}
      <div className="w-72 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar shrink-0">
        {thesis.chapters.map(chapter => (
          <div key={chapter.id} className="space-y-2">
            <h6 className="label-caps px-4 mb-3 opacity-40">
              {chapter.title}
            </h6>
            {chapter.sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group border",
                  activeSectionId === section.id 
                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-[#1E293B] border-transparent text-slate-500 hover:border-slate-700 hover:text-slate-300"
                )}
              >
                <span className="truncate pr-2">{section.title}</span>
                {section.status === 'complete' && <CheckCircle className={cn("w-3 h-3 shrink-0", activeSectionId === section.id ? "text-blue-400" : "text-emerald-500")} />}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Editor Main */}
      <div className="flex-1 bg-[#0F172A] rounded-2xl border border-slate-800 flex flex-col overflow-hidden relative shadow-2xl">
        {!activeSectionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-6">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center">
              <Eye className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em]">请从左侧选择章节</p>
          </div>
        ) : (
          <>
            <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{currentSection?.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="label-caps text-blue-400 opacity-60">字数: {content.length}</span>
                    <div className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span className="label-caps opacity-30">标准建议: ~1500</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleAIRewrite}
                  disabled={isRewriting}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-all"
                >
                  {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  学术润色
                </button>
                <button 
                  onClick={handleAIExpand}
                  disabled={isExpanding}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  {isExpanding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  智能续写
                </button>
              </div>
            </div>

            <textarea
              className="flex-1 p-10 bg-transparent text-slate-300 leading-[1.8] outline-none resize-none placeholder:text-slate-800 text-lg font-medium selection:bg-blue-500/30 custom-scrollbar"
              placeholder="在此处撰写正文..."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          </>
        )}
      </div>

      {/* Floating Audit Indicator */}
      <AnimatePresence>
        {activeSectionId && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 bg-[#1E293B] border border-slate-700 rounded-2xl p-8 flex flex-col gap-8 shadow-2xl"
          >
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h4 className="label-caps text-blue-400">AI 写作助手</h4>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                <h5 className="label-caps text-emerald-400">写作要点 (Dr. Huang)</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  本章节应着重于展示您的管理学理论应用深度。避免单纯的“现状描述”，尝试用理论解构问题。
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="label-caps opacity-40">实时逻辑检测</h5>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-200/60 leading-relaxed font-bold">
                  检测到文本稍显“口语化”。建议使用“基于...”或“旨在...”等学术连接词进行改写。
                </p>
              </div>
            </div>

            <div className="mt-auto px-4 py-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
              <p className="text-[10px] text-blue-400 font-black text-center uppercase tracking-widest">
                按 Tab 键接受 AI 建议
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
