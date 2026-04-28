import React, { useState } from 'react';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  FileEdit,
  Clock,
  ArrowRightCircle,
  Sparkles,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { Thesis, Chapter, Section } from '../types';
import { cn } from '../lib/utils';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

interface OutlineViewProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
  onSelectSection: (id: string) => void;
}

export default function OutlineView({ thesis, onUpdate, onSelectSection }: OutlineViewProps) {
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [isAutoWriting, setIsAutoWriting] = useState(false);
  const [editingTargetWordSectionId, setEditingTargetWordSectionId] = useState<string | null>(null);
  const [editTargetWordCount, setEditTargetWordCount] = useState<number>(0);
  const [isEditingTotalWords, setIsEditingTotalWords] = useState(false);
  const [editTotalWords, setEditTotalWords] = useState<number>(30000);

  const handleAutoWrite = async () => {
    if (isAutoWriting) return;
    setIsAutoWriting(true);
    let newThesis = { ...thesis };
    try {
      for (let cIdx = 0; cIdx < newThesis.chapters.length; cIdx++) {
        for (let sIdx = 0; sIdx < newThesis.chapters[cIdx].sections.length; sIdx++) {
           const section = newThesis.chapters[cIdx].sections[sIdx];
           if (!section.content) {
             const structure = newThesis.chapters.map((c, i) => 
               `- 第${i+1}章 ${c.title}\n  ${c.sections.map((s, j) => `  * ${i+1}.${j+1} ${s.title}`).join('\n')}`
             ).join('\n');
             
             const allSections: Section[] = [];
             newThesis.chapters.forEach(c => allSections.push(...c.sections));
             const currentIndex = allSections.findIndex(s => s.id === section.id);
             const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
             const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;

             const styleInstruction = thesis.writingStyle ? `\n5. 【强制独有写作风格】：\n${thesis.writingStyle}` : '';
             const prompt = `
论文题目：${newThesis.topic}
研究类型：管理类
行业领域：${newThesis.field}

[全局大纲结构]
${structure}

[上下文关联]
${prevSection ? `前一小节（${prevSection.title}）摘要或内容：\n${prevSection.content ? prevSection.content.substring(0, 800) : '(尚无内容)'}...` : '（本小节为首节）'}
${nextSection ? `后一小节（${nextSection.title}）预告：系统将确保本段与下一节逻辑闭环。` : '（本小节为末节）'}

[当前任务]
正在撰写章节：${section.title}
目标字数：约 ${section.targetWordCount || Math.floor(getTargetWords(cIdx)/3)} 字。
章节已有内容：
(该章节尚无内容，请严格按照学术规范结合全局上下文自动生成完整的初稿正文)

任务：
请基于以上全文逻辑架构，为当前章节进行深度学术扩写或一键生成完整初稿内容。
要求：
1. 【强逻辑性】：必须确保章节内容与全局大纲及前后章节衔接严密，体现管理学逻辑的连贯性。
2. 【专业深度】：深度融入管理学、工程学、运筹学或相关行业理论。如果是案例分析或方案设计，必须充实具体。
3. 【学术规范】：使用严谨的学术书面语，客观陈述，禁止使用口语、感叹号或第一人称“我”、“我们”。
4. 【精确字数控制】：你必须严格按照【目标字数：约 ${section.targetWordCount || Math.floor(getTargetWords(cIdx)/3)} 字】为您生成的内容设定篇幅，避免生成内容与预期字数差异过大！如果字数较多，应合理增加小标题展开论述；如果字数较少，则提炼核心观点。${styleInstruction}

直接返回生成的学术正文，不要包含任何引导性话语或多余解释。`;
               
             const newContent = await askAI(prompt, SYSTEM_PROMPTS.CONTENT_EXPANDER);
             
             const updatedChapters = [...newThesis.chapters];
             updatedChapters[cIdx].sections[sIdx] = {
               ...section,
               content: newContent,
               status: 'complete'
             };
             newThesis = { ...newThesis, chapters: updatedChapters };
             onUpdate(newThesis);
           }
        }
      }
    } catch (e: any) {
      alert("一键写作异常终止: " + (e.message || "未知错误"));
    } finally {
      setIsAutoWriting(false);
    }
  };

  const handleSaveTargetWordCount = (cIdx: number, sIdx: number) => {
    const newChapters = [...thesis.chapters];
    newChapters[cIdx].sections[sIdx].targetWordCount = editTargetWordCount;
    onUpdate({ ...thesis, chapters: newChapters });
    setEditingTargetWordSectionId(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<{type: 'chapter'|'section', cIdx: number, sIdx?: number} | null>(null);

  const handleAddSection = (cIdx: number) => {
    const newChapters = thesis.chapters.map((c, index) => {
      if (index === cIdx) {
        return {
          ...c,
          sections: [
            ...c.sections,
            {
              id: `c-${cIdx + 1}-s-${c.sections.length + 1}-${Date.now()}`,
              title: '新建子章节',
              status: 'empty',
              content: '',
              targetWordCount: Math.floor(getTargetWords(cIdx)/3) || 1000
            }
          ]
        };
      }
      return c;
    });
    
    onUpdate({ ...thesis, chapters: newChapters });
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    
    const { type, cIdx, sIdx } = confirmDelete;
    let newChapters = [...thesis.chapters];
    
    if (type === 'chapter') {
      newChapters.splice(cIdx, 1);
    } else if (type === 'section' && sIdx !== undefined) {
      newChapters = newChapters.map((c, index) => {
        if (index === cIdx) {
          const newSections = [...c.sections];
          newSections.splice(sIdx, 1);
          return { ...c, sections: newSections };
        }
        return c;
      });
    }
    
    onUpdate({ ...thesis, chapters: newChapters });
    setConfirmDelete(null);
  };

  const handleDeleteSection = (cIdx: number, sIdx: number) => {
    setConfirmDelete({ type: 'section', cIdx, sIdx });
  };

  const handleAddChapter = () => {
    const newChapters = [...thesis.chapters];
    const newChapterId = `c-${newChapters.length + 1}-${Date.now()}`;
    newChapters.push({
      id: newChapterId,
      title: '新建章节',
      description: '',
      sections: []
    });
    onUpdate({ ...thesis, chapters: newChapters });
  };

  const handleDeleteChapter = (cIdx: number) => {
    setConfirmDelete({ type: 'chapter', cIdx });
  };

  const handleRegenerateChapterSections = async (cIdx: number) => {
    if (!window.confirm("重新生成将覆盖该章节当前的所有小节，确定要继续吗？")) return;
    setOptimizingId(thesis.chapters[cIdx].id); // Reuse optimizingId for loading state
    
    try {
      const prompt = `论文题目：${thesis.topic}\n研究类型：${thesis.researchType}\n所在领域：${thesis.field}\n
开题报告关键约束：${thesis.proposal?.constraintPrompt || '无'}
大章节标题：${thesis.chapters[cIdx].title}
大章节介绍：${thesis.chapters[cIdx].description || '无'}
请生成该大章节下的子小节（JSON数组格式）。`;

      const jsonStr = await askAI(prompt, SYSTEM_PROMPTS.CHAPTER_STRUCTURE_GENERATOR);
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Format error from AI");
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) throw new Error("Not an array");

      const newChapters = [...thesis.chapters];
      newChapters[cIdx].sections = parsed.map((item: any, i: number) => ({
        id: `c-${cIdx + 1}-s-${i + 1}-${Date.now()}`,
        title: item.title,
        status: 'empty',
        content: '',
        targetWordCount: item.targetWordCount || 1000
      }));
      
      onUpdate({ ...thesis, chapters: newChapters });
    } catch (e: any) {
      console.error(e);
      alert("重新生成失败：" + (e.message || "未知错误"));
    } finally {
      setOptimizingId(null);
    }
  };

  const handleSaveChapter = (cIdx: number) => {
    if (!editChapterTitle.trim()) return;
    const newChapters = [...thesis.chapters];
    newChapters[cIdx].title = editChapterTitle;
    onUpdate({ ...thesis, chapters: newChapters });
    setEditingChapterId(null);
  };

  const handleSaveSection = (cIdx: number, sIdx: number) => {
    if (!editSectionTitle.trim()) return;
    const newChapters = [...thesis.chapters];
    newChapters[cIdx].sections[sIdx].title = editSectionTitle;
    onUpdate({ ...thesis, chapters: newChapters });
    setEditingSectionId(null);
  };

  const handleOptimizeTitle = async (type: 'chapter' | 'section', chapterId: string, sectionId?: string) => {
    try {
      const cIdx = thesis.chapters.findIndex(c => c.id === chapterId);
      if (cIdx === -1) return;

      const outlineContext = JSON.stringify(thesis.chapters.map((c, i) => ({
        chapter: `第${i+1}章 ${c.title}`,
        sections: c.sections.map((s, j) => `${i+1}.${j+1} ${s.title}`)
      })));

      let titleToOptimize = "";
      if (type === 'chapter') {
        titleToOptimize = thesis.chapters[cIdx].title;
        setOptimizingId(chapterId);
      } else if (type === 'section' && sectionId) {
        const sIdx = thesis.chapters[cIdx].sections.findIndex(s => s.id === sectionId);
        if (sIdx === -1) return;
        titleToOptimize = thesis.chapters[cIdx].sections[sIdx].title;
        setOptimizingId(sectionId);
      }

      const prompt = `论文题目：${thesis.topic}\n现有的整体大纲参考：${outlineContext}\n\n请优化以下${type === 'chapter' ? '大章' : '小节'}的标题：\n【${titleToOptimize}】`;
      
      const newTitle = await askAI(prompt, SYSTEM_PROMPTS.TITLE_OPTIMIZER);
      
      if (!newTitle) throw new Error("AI未能返回标题");

      const cleanTitle = newTitle.replace(/["'「」]/g, '').trim();

      const newChapters = [...thesis.chapters];
      if (type === 'chapter') {
        newChapters[cIdx].title = cleanTitle;
      } else if (type === 'section' && sectionId) {
        const sIdx = newChapters[cIdx].sections.findIndex(s => s.id === sectionId);
        newChapters[cIdx].sections[sIdx].title = cleanTitle;
      }
      onUpdate({ ...thesis, chapters: newChapters });
    } catch (e: any) {
      alert("优化标题失败：" + e.message);
    } finally {
      setOptimizingId(null);
    }
  };

  // Dr. Huang's Sleeping Beauty Ratios (approximate word count distribution)
  const getTargetWords = (chapterIdx: number) => {
    const total = thesis.targetTotalWords || 30000; // Default 30k target
    const ratios = [0.1, 0.15, 0.25, 0.2, 0.25, 0.05]; // Approximate chapter weight
    return Math.floor(total * (ratios[chapterIdx] || 0.1));
  };

  const handleUpdateTotalWords = (newTotal: number) => {
    // Distribute words across existing sections based on standard ratios
    const newChapters = thesis.chapters.map((chapter, cIdx) => {
      const targetChapterWords = Math.floor(newTotal * ([0.1, 0.15, 0.25, 0.2, 0.25, 0.05][cIdx] || 0.1));
      const newSections = chapter.sections.map((section, sIdx) => ({
        ...section,
        targetWordCount: Math.floor(targetChapterWords / chapter.sections.length)
      }));
      return { ...chapter, sections: newSections };
    });
    
    onUpdate({ ...thesis, targetTotalWords: newTotal, chapters: newChapters });
  };

  const handleExport = () => {
    let fullText = `# ${thesis.topic}\n\n`;
    thesis.chapters.forEach((chapter, cIdx) => {
      fullText += `## 第${cIdx + 1}章 ${chapter.title}\n\n`;
      chapter.sections.forEach((section, sIdx) => {
        fullText += `### ${cIdx + 1}.${sIdx + 1} ${section.title}\n\n`;
        fullText += section.content || "(内容待补充)\n\n";
      });
    });

    const blob = new Blob([fullText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${thesis.topic}_大纲与正文.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div>
          <h3 className="text-3xl font-black text-white tracking-tight">论文逻辑架构</h3>
          <p className="text-sm text-slate-500 mt-2 font-medium">标准六章架构，由 AI 专家引擎为您保驾护航。</p>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-3 bento-card flex items-center gap-3">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-400 flex items-center">
              已撰写字数: <span className="text-white font-mono tracking-wider ml-1 mr-1">
                {thesis.chapters.reduce((acc, c) => acc + c.sections.reduce((sAcc, s) => sAcc + (s.content?.length || 0), 0), 0).toLocaleString()}
              </span>
              / 
              <div className="flex items-center ml-1 group">
                {isEditingTotalWords ? (
                  <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                    <input 
                      type="number" 
                      value={editTotalWords}
                      onChange={e => setEditTotalWords(Number(e.target.value))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleUpdateTotalWords(editTotalWords);
                          setIsEditingTotalWords(false);
                        }
                      }}
                      autoFocus
                      className="w-16 bg-slate-900 border border-blue-500 rounded px-1 py-0.5 text-white outline-none font-mono"
                    />
                    <button 
                      onClick={() => {
                        handleUpdateTotalWords(editTotalWords);
                        setIsEditingTotalWords(false);
                      }} 
                      className="text-blue-400 hover:text-blue-300 ml-1"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setIsEditingTotalWords(false)} className="text-slate-500 hover:text-slate-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-slate-600 font-mono tracking-wider">
                      {(thesis.targetTotalWords || 30000).toLocaleString()}
                    </span>
                    <span 
                      className="ml-2 text-[10px] text-blue-400/50 hover:text-blue-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setEditTotalWords(thesis.targetTotalWords || 30000);
                        setIsEditingTotalWords(true);
                      }}
                    >
                      设置
                    </span>
                  </>
                )}
              </div>
            </span>
          </div>
          <button 
            onClick={handleAutoWrite}
            disabled={isAutoWriting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:text-white/50 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-95 flex items-center gap-2"
          >
            <Sparkles className={cn("w-4 h-4", isAutoWriting && "animate-pulse")} />
            {isAutoWriting ? "写作中..." : "一键写作"}
          </button>
          <button 
            onClick={handleExport}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/10 transition-all active:scale-95"
          >
            导出全文
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {thesis.chapters.map((chapter, cIdx) => (
          <section key={chapter.id} className="relative">
            <div className="flex items-center justify-between mb-6 group/chapter">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-600/20 z-10 shrink-0">
                  0{cIdx + 1}
                </div>
                {editingChapterId === chapter.id ? (
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={editChapterTitle}
                      onChange={e => setEditChapterTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveChapter(cIdx)}
                      className="bg-slate-950 border border-blue-500 rounded px-3 py-1 text-lg font-black text-white w-full outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingChapterId(null)} className="text-slate-400 hover:text-white px-2 py-1 text-xs">取消</button>
                      <button onClick={() => handleSaveChapter(cIdx)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">保存</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">{chapter.title}</h4>
                      <div className="opacity-0 group-hover/chapter:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                          onClick={() => { setEditingChapterId(chapter.id); setEditChapterTitle(chapter.title); }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title="修改标题"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOptimizeTitle('chapter', chapter.id)}
                          disabled={optimizingId === chapter.id}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors relative"
                          title="AI 优化标题"
                        >
                          <Sparkles className={cn("w-4 h-4", optimizingId === chapter.id && "animate-pulse")} />
                        </button>
                        <button
                          onClick={() => handleRegenerateChapterSections(cIdx)}
                          disabled={optimizingId === chapter.id}
                          className="p-1.5 text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors relative"
                          title="重新生成该章节下小节"
                        >
                          <RefreshCw className={cn("w-4 h-4", optimizingId === chapter.id && "animate-spin")} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteChapter(cIdx); }}
                          className="p-1.5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="删除章节"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <span className="label-caps opacity-50">第 {cIdx + 1} 章 · 建议字数: {getTargetWords(cIdx).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="h-px flex-1 bg-slate-800 ml-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chapter.sections.map((section, sIdx) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={section.id}
                  onClick={() => onSelectSection(section.id)}
                  className="bento-card p-6 flex flex-col justify-between min-h-[160px] cursor-pointer group hover:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="label-caps text-slate-500 group-hover:text-blue-400 transition-colors">
                      {cIdx + 1}.{sIdx + 1}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingSectionId(section.id); setEditSectionTitle(section.title); }}
                        className="p-1 hover:text-white hover:bg-slate-700/50 rounded text-slate-400"
                        title="修改标题"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOptimizeTitle('section', chapter.id, section.id); }}
                        disabled={optimizingId === section.id}
                        className="p-1 hover:text-blue-300 hover:bg-blue-500/10 rounded text-blue-400"
                        title="AI 优化标题"
                      >
                        <Sparkles className={cn("w-3.5 h-3.5", optimizingId === section.id && "animate-pulse")} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(cIdx, sIdx); }}
                        className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded text-red-500/70"
                        title="删除子章节"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ArrowRightCircle className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors ml-1" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {editingSectionId === section.id ? (
                      <div className="mb-4 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                        <textarea
                          value={editSectionTitle}
                          onChange={e => setEditSectionTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveSection(cIdx, sIdx))}
                          className="bg-slate-900 border border-blue-500/50 rounded-lg px-3 py-2 text-sm font-bold text-white w-full outline-none resize-none min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingSectionId(null)} className="text-slate-400 hover:text-white px-2 py-1 text-[10px]">取消</button>
                          <button onClick={() => handleSaveSection(cIdx, sIdx)} className="bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1 rounded text-[10px]">保存</button>
                        </div>
                      </div>
                    ) : (
                      <h5 className="font-bold text-slate-200 mb-4 line-clamp-3 leading-snug group-hover:text-white transition-colors">
                        {section.title}
                      </h5>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-auto pt-2">
                      <div className={cn(
                        "status-chip",
                        section.status === 'empty' ? "text-slate-500 border-slate-800 bg-slate-800/20" :
                        section.status === 'draft' ? "text-amber-500 border-amber-500/20 bg-amber-500/10" :
                        "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                      )}>
                        {section.status === 'empty' ? '未开始' : section.status === 'draft' ? '草稿' : '完成'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        {section.content?.length || 0} / 
                        {editingTargetWordSectionId === section.id ? (
                          <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                            <input 
                              type="number" 
                              value={editTargetWordCount}
                              onChange={e => setEditTargetWordCount(Number(e.target.value))}
                              onKeyDown={e => e.key === 'Enter' && handleSaveTargetWordCount(cIdx, sIdx)}
                              className="w-16 bg-slate-900 border border-blue-500 rounded px-1 py-0.5 text-white outline-none"
                            />
                            <button onClick={() => handleSaveTargetWordCount(cIdx, sIdx)} className="text-blue-400 hover:text-blue-300">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingTargetWordSectionId(null)} className="text-slate-500 hover:text-slate-400">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span 
                            className="hover:text-blue-400 cursor-pointer border-b border-transparent hover:border-blue-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTargetWordCount(section.targetWordCount || Math.floor(getTargetWords(cIdx)/3));
                              setEditingTargetWordSectionId(section.id);
                            }}
                            title="修改目标字数"
                          >
                            {section.targetWordCount || Math.floor(getTargetWords(cIdx)/3)}
                          </span>
                        )}
                        字
                      </div>
                      <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                          style={{ width: Math.min(100, ((section.content?.length || 0) / (section.targetWordCount || Math.floor(getTargetWords(cIdx)/3))) * 100) + '%' }}
                        />
                      </div>
                    </div>
                </motion.div>
              ))}
              
              <button onClick={() => handleAddSection(cIdx)} className="border-2 border-dashed border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group min-h-[160px]">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="label-caps">添加子章节</span>
              </button>
            </div>
          </section>
        ))}

        <div className="flex justify-center mt-12 mb-8">
          <button 
            onClick={handleAddChapter}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 border border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            添加新章节
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">确认删除</h3>
            <p className="text-slate-400 text-sm mb-6">
              {confirmDelete.type === 'chapter' ? '确定要删除该章节及其所有子章节吗？此操作不可撤销。' : '确定要删除该子章节吗？此操作不可撤销。'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
