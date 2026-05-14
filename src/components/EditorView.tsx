import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  Eye,
  Type,
  RefreshCw,
  MessageSquareDiff,
  BookOpen,
  Play
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
  const [isContinuing, setIsContinuing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync content with state when section changes
  useEffect(() => {
    if (activeSectionId) {
      const section = findSection(activeSectionId);
      setContent(section?.content || '');
      setRevisionComment('');
    }
  }, [activeSectionId, thesis.chapters]);

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

  const handleAIContinue = async () => {
    if (isContinuing || !content || !activeSectionId) return;
    setIsContinuing(true);
    setErrorMsg(null);
    try {
      const styleInstruction = thesis.writingStyle ? `\n\n【强制独有写作风格】：\n${thesis.writingStyle}` : '';
      const proposalConstraint = thesis.proposal?.constraintPrompt ? `\n\n【开题报告核心约束】：\n${thesis.proposal.constraintPrompt}\n说明：续写时请极其严格地保证与开题报告的逻辑一致性。` : '';
      const prompt = `现有部分正文内容如下（请注意，这是半途中断、未写完的内容）：\n\n${content}\n\n请严格顺着上述思路直接接着最后的这句话继续写下去，只需输出接下来的内容文本，绝不重复上述已有内容。${styleInstruction}${proposalConstraint}`;
      
      const continuedContent = await askAI(prompt, SYSTEM_PROMPTS.CONTENT_CONTINUER);
      if (continuedContent && continuedContent.trim()) {
        const newText = content.endsWith('\n') ? continuedContent : '\n' + continuedContent;
        handleContentChange(content + newText);
      } else {
         setErrorMsg("AI认为当前内容已完整，未生成新内文。");
      }
    } catch (e: any) {
      console.error("AI Continue error:", e);
      setErrorMsg(`AI 续写报错: ${e.message || String(e)}`);
    } finally {
       setIsContinuing(false);
    }
  };

  const allSections: Section[] = [];
  thesis.chapters.forEach(c => allSections.push(...c.sections));
  const currentIndex = activeSectionId ? allSections.findIndex(s => s.id === activeSectionId) : -1;
  const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
  const nextSection = currentIndex !== -1 && currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;

  const currentSection = activeSectionId ? findSection(activeSectionId) : null;

  const handleAIExpand = async () => {
    if (isExpanding || !activeSectionId) return;
    setIsExpanding(true);
    setErrorMsg(null);
    try {
      const structure = thesis.chapters.map((c, i) => 
        `- 第${i+1}章 ${c.title}\n  ${c.sections.map((s, j) => `  * ${i+1}.${j+1} ${s.title}`).join('\n')}`
      ).join('\n');

      const styleInstruction = thesis.writingStyle ? `\n5. 【强制独有写作风格】：\n${thesis.writingStyle}` : '';
      const proposalConstraint = thesis.proposal?.constraintPrompt ? `\n[开题报告核心约束]\n${thesis.proposal.constraintPrompt}\n系统要求：生成片段或扩写时，务必将上述核心理念贯彻始终，确保不偏题。` : '';
      const globalConstraint = thesis.globalPrompt ? `\n[全局思路约束]\n${thesis.globalPrompt}\n系统要求：强烈注意避免跑题，必须严格遵守用户在建项时提供的全局约束思想。` : '';
      const prompt = `
论文题目：${thesis.topic}
研究类型：管理类
行业领域：${thesis.field}

[论文全局大纲]
${structure}

${proposalConstraint}
${globalConstraint}

[上下文关联]
${prevSection ? `前一小节（${prevSection.title}）摘要或内容：\n${prevSection.content ? prevSection.content.substring(0, 800) : '(尚无内容)'}...` : '（本小节为首节）'}
${nextSection ? `后一小节（${nextSection.title}）预告：系统将确保本段与下一节逻辑闭环。` : '（本小节为末节）'}

[当前任务]
正在撰写章节：${currentSection?.title}
目标字数：约 ${currentSection?.targetWordCount || 1500} 字。
章节已有内容：
${content || '(该章节尚无内容，请严格按照学术规范结合全局上下文自动生成完整的初稿正文)'}

任务：
请基于以上全文逻辑架构，为当前章节进行深度学术扩写或一键生成完整初稿内容。
要求：
1. 【强逻辑性】：必须确保章节内容与全局大纲及前后章节衔接严密，体现管理学逻辑的连贯性。
2. 【专业深度】：深度融入管理学、工程学、运筹学或相关行业理论。如果是案例分析或方案设计，必须充实具体。
3. 【学术规范】：使用严谨的学术书面语，客观陈述，禁止使用口语、感叹号或第一人称“我”、“我们”。
4. 【精确字数控制】：你必须严格按照【目标字数：约 ${currentSection?.targetWordCount || 1500} 字】为您生成的内容设定篇幅，避免生成内容与预期字数差异过大！如果字数较多，应合理增加小标题展开论述；如果字数较少，则提炼核心观点。${styleInstruction}

直接返回生成的学术正文，不要包含任何引导性话语或多余解释。
`;
      const expanded = await askAI(prompt, SYSTEM_PROMPTS.CONTENT_EXPANDER);
      if (!expanded) throw new Error("AI 未返回任何内容");
      if (!content) {
        handleContentChange(expanded);
      } else {
        handleContentChange(content + "\n\n" + expanded);
      }
    } catch (e: any) {
      console.error("AI Expand error:", e);
      setErrorMsg(`AI 写作报错: ${e.message || String(e)}`);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleAIRevise = async () => {
    if (!content || isRewriting || !revisionComment.trim()) return;
    setIsRewriting(true);
    setErrorMsg(null);
    try {
      const proposalConstraint = thesis.proposal?.constraintPrompt ? `\n\n【开题报告核心约束】：\n${thesis.proposal.constraintPrompt}\n修改时请确保不偏离开题报告的主旨路线。` : '';
      const prompt = `现有正文内容：\n${content}\n\n针对以上内容的修改意见：\n${revisionComment}\n\n请严格基于上述意见对正文进行重新组织和学术重写。${proposalConstraint}`;
      const rewritten = await askAI(prompt, SYSTEM_PROMPTS.CONTENT_REVISER);
      handleContentChange(rewritten);
      setRevisionComment('');
    } catch (e: any) {
      setErrorMsg(`AI 修改报错: ${e.message || String(e)}`);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!content || isRewriting) return;
    setIsRewriting(true);
    setErrorMsg(null);
    try {
      const proposalConstraint = thesis.proposal?.constraintPrompt ? `\n\n注意维持以下开题核心思想：\n${thesis.proposal.constraintPrompt}` : '';
      const rewritten = await askAI(`请将以下文字转化为专业的学术表述，去除口语化和第一人称：\n${content}${proposalConstraint}`, SYSTEM_PROMPTS.ACADEMIC_REWRITER);
      handleContentChange(rewritten);
    } catch (e: any) {
      setErrorMsg(`AI 润色报错: ${e.message || String(e)}`);
    } finally {
      setIsRewriting(false);
    }
  };

  const findChapterIndex = (id: string): number => {
    for (let i = 0; i < thesis.chapters.length; i++) {
        if (thesis.chapters[i].sections.find(s => s.id === id)) return i;
    }
    return -1;
  };

  const cIdx = activeSectionId ? findChapterIndex(activeSectionId) : -1;
  const chapterRequirement = cIdx !== -1 ? [
    "【绪论】引出研究背景、国内外研究现状、研究目的、研究内容等。控制篇幅(通常20%)，简明扼要。",
    "【理论基础与文献综述】侧重阐述研究问题相关的理论框架与模型，通过文献综述论证研究必要性与创新点。",
    "【现状与问题分析】基于特定组织的实际数据、通过事实描述当前状况，挖掘表象背后的核心问题与深层诱因。",
    "【解决方案设计】针对前文分析的核心问题，借助方法论或理论给出解决策略、过程、计划和配套措施。",
    "【方案实施与效果评价】方案落地执行的过程，并通过前后数据对比或可行性验证来考核方案的实施效果。",
    "【结论与展望】总结全文的工作与成果，指出理论与实践贡献，同时客观指出研究的不足及未来的研究方向。"
  ][Math.min(cIdx, 5)] : "";

  const [expandedPanel, setExpandedPanel] = useState<'guidance' | 'context' | 'revise'>('revise');

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
            {errorMsg && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold">{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)} className="ml-2 hover:text-white transition-colors">&times;</button>
                </div>
              </div>
            )}
            
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
                    <span className="label-caps opacity-30">建议字数: {currentSection?.targetWordCount ? `~${currentSection.targetWordCount}` : '~1500'}</span>
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
                  onClick={handleAIContinue}
                  disabled={isContinuing || isExpanding || !content}
                  className="px-4 py-2 rounded-xl border border-indigo-700/50 bg-indigo-600/10 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center gap-2 transition-all"
                >
                  {isContinuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  AI 续写
                </button>
                <button 
                  onClick={handleAIExpand}
                  disabled={isExpanding}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  {isExpanding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {content ? "AI 扩充" : "一键写作"}
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

      {/* Floating Context & Revision Indicator */}
      <AnimatePresence>
        {activeSectionId && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 bg-[#1E293B] border border-slate-700 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              
              {/* Guidance requirement */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setExpandedPanel(p => p === 'guidance' ? '' : 'guidance')}
                  className="flex items-center justify-between p-3 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-emerald-400">章节撰写要求</h4>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedPanel === 'guidance' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl mt-1">
                        <p className="text-[11px] text-emerald-400/80 leading-relaxed font-medium">
                          {chapterRequirement || "常规章节，请保持逻辑严密，论点清晰，图表数据支撑。"}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Context */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setExpandedPanel(p => p === 'context' ? '' : 'context')}
                  className="flex items-center justify-between p-3 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-blue-400">上下文参考</h4>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedPanel === 'context' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3 mt-1"
                    >
                      {prevSection ? (
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">⬆ 上一节: {prevSection.title}</span>
                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                            {prevSection.content || '（暂无正文）'}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-slate-500 block">本节是整篇论文的开篇</span>
                        </div>
                      )}
                      
                      {nextSection ? (
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">⬇ 下一节: {nextSection.title}</span>
                        </div>
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-slate-500 block">本节是整篇论文的结尾</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Revise */}
              <div className="flex flex-col gap-2 flex-1">
                <button 
                  onClick={() => setExpandedPanel(p => p === 'revise' ? '' : 'revise')}
                  className="flex items-center justify-between p-3 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquareDiff className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-amber-500">定向修改意见</h4>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedPanel === 'revise' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-3 h-full mt-1"
                    >
                      <textarea
                        className="flex-1 min-h-[160px] w-full bg-slate-900 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-300 outline-none resize-none placeholder:text-slate-600 focus:border-amber-500/50 focus:bg-slate-900/80 transition-colors"
                        placeholder="例如：请增加XXX理论的引用；这里缺少解决由于资金不足导致的问题的具体对策；语言太过口语化请重新写..."
                        value={revisionComment}
                        onChange={e => setRevisionComment(e.target.value)}
                      />
                      
                      <button
                        onClick={handleAIRevise}
                        disabled={isRewriting || !revisionComment.trim()}
                        className="w-full py-3 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/30 text-xs font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                      >
                        {isRewriting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        根据意见重写本节
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
