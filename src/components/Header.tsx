import React from 'react';
import { 
  User,
} from 'lucide-react';
import { Thesis } from '../types';

interface HeaderProps {
  activeTab: string;
  thesisTopic?: string;
  thesis?: Thesis | null;
}

export default function Header({ activeTab, thesisTopic, thesis }: HeaderProps) {
  const titles: Record<string, string> = {
    project: '项目列表',
    outline: '大纲管理',
    proposal: '开题报告',
    editor: '正文撰写',
    literature: '文献管理',
    audit: '审计中心',
    styles: '写作风格',
  };

  // Calculate completion percentage
  let progress = 0;
  if (thesis && thesis.targetTotalWords) {
    const targetWords = thesis.targetTotalWords;
    const currentWords = thesis.chapters.reduce((acc, c) => acc + c.sections.reduce((sAcc, s) => sAcc + (s.content?.length || 0), 0), 0);
    progress = Math.min(100, Math.round((currentWords / targetWords) * 100));
  } else if (thesis) {
    // legacy or no target words fallback
    const currentWords = thesis.chapters.reduce((acc, c) => acc + c.sections.reduce((sAcc, s) => sAcc + (s.content?.length || 0), 0), 0);
    progress = Math.min(100, Math.round((currentWords / 30000) * 100));
  }

  return (
    <header className="h-20 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between px-8 z-10 shrink-0">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-white tracking-tight">{titles[activeTab]}</h2>
        {thesisTopic && (
          <div className="flex items-center gap-2 mt-1">
            <span className="label-caps text-blue-400">当前项目:</span>
            <span className="text-[10px] font-medium text-slate-500 uppercase truncate max-w-[300px]">
              {thesisTopic}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {thesis && (
          <div className="hidden md:flex items-center gap-4 mr-4">
            <div className="text-right">
              <p className="label-caps mb-1 opacity-50">写作完成率</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="h-8 w-px bg-slate-800 mx-2" />
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center group cursor-pointer hover:border-slate-500 transition-all">
            <User className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
          </div>
        </div>
      </div>
    </header>
  );
}
