import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Layout, 
  FileText, 
  ShieldCheck, 
  Target,
  Library,
  Settings,
  Sparkles,
  PlayCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  hasProject: boolean;
  onOpenSettings: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, hasProject, onOpenSettings }: SidebarProps) {
  const menuItems = [
    { id: 'project', label: '项目列表', icon: Target },
    { id: 'generation', label: '生成管线', icon: PlayCircle, disabled: !hasProject },
    { id: 'styles', label: '写作风格', icon: Sparkles },
    { id: 'outline', label: '大纲管理', icon: Layout, disabled: !hasProject },
    { id: 'proposal', label: '开题报告', icon: FileText, disabled: !hasProject },
    { id: 'editor', label: '正文撰写', icon: FileText, disabled: !hasProject },
    { id: 'literature', label: '文献管理', icon: Library, disabled: !hasProject },
    { id: 'audit', label: '逻辑审计', icon: ShieldCheck, disabled: !hasProject },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col z-20">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <h1 className="font-black text-xl tracking-tighter text-white">MEM 论文专家</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
              activeTab === item.id 
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent",
              item.disabled && "opacity-20 cursor-not-allowed grayscale"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              activeTab === item.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
            )} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 mt-auto border-t border-slate-800/50">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
        >
          <Settings className="w-5 h-5 text-slate-500" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm font-medium text-slate-300">模型与 API 设置</span>
            <span className="text-[10px] text-slate-500">v2.4.0-stable</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
