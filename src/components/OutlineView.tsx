import React from 'react';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  FileEdit,
  Clock,
  ArrowRightCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Thesis, Chapter, Section } from '../types';
import { cn } from '../lib/utils';

interface OutlineViewProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
  onSelectSection: (id: string) => void;
}

export default function OutlineView({ thesis, onUpdate, onSelectSection }: OutlineViewProps) {
  // Dr. Huang's Sleeping Beauty Ratios (approximate word count distribution)
  const getTargetWords = (chapterIdx: number) => {
    const total = 30000; // Default 30k target
    const ratios = [0.1, 0.15, 0.25, 0.2, 0.25, 0.05]; // Approximate chapter weight
    return Math.floor(total * (ratios[chapterIdx] || 0.1));
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
          <p className="text-sm text-slate-500 mt-2 font-medium">BUPT 标准六章架构，由 AI 专家引擎为您保驾护航。</p>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-3 bento-card flex items-center gap-3">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-400">
              预估总字数: <span className="text-white font-mono tracking-wider ml-1">30,000+</span>
            </span>
          </div>
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
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-600/20 z-10">
                0{cIdx + 1}
              </div>
              <div className="flex flex-col">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">{chapter.title}</h4>
                <span className="label-caps opacity-50">第 {cIdx + 1} 章 · 建议字数: {getTargetWords(cIdx).toLocaleString()}</span>
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
                    <ArrowRightCircle className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                  
                  <div>
                    <h5 className="font-bold text-slate-200 mb-4 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                      {section.title}
                    </h5>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "status-chip",
                        section.status === 'empty' ? "text-slate-500 border-slate-800 bg-slate-800/20" :
                        section.status === 'draft' ? "text-amber-500 border-amber-500/20 bg-amber-500/10" :
                        "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                      )}>
                        {section.status === 'empty' ? '未开始' : section.status === 'draft' ? '草稿' : '完成'}
                      </div>
                      <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                          style={{ width: section.status === 'complete' ? '100%' : section.status === 'draft' ? '40%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <button className="border-2 border-dashed border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="label-caps">添加子章节</span>
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
