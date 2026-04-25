import React, { useState } from 'react';
import { Thesis, Citation } from '../types';
import { Plus, Trash2, Edit3, Save, X, ExternalLink, Library, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LiteratureManagerProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
}

const emptyCitation: Omit<Citation, 'id'> = {
  type: 'article',
  authors: '',
  title: '',
  journalOrPublisher: '',
  year: '',
  volume: '',
  issue: '',
  pages: '',
  city: '',
  url: ''
};

export default function LiteratureManager({ thesis, onUpdate }: LiteratureManagerProps) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Citation>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatCitation = (c: Citation): string => {
    const authors = c.authors;
    switch (c.type) {
      case 'article':
        return `${authors}. ${c.title}[J]. ${c.journalOrPublisher}, ${c.year}${c.volume ? `, ${c.volume}` : ''}${c.issue ? `(${c.issue})` : ''}${c.pages ? `: ${c.pages}` : ''}.`;
      case 'book':
        return `${authors}. ${c.title}[M]. ${c.city ? `${c.city}: ` : ''}${c.journalOrPublisher}, ${c.year}${c.pages ? `: ${c.pages}` : ''}.`;
      case 'thesis':
        return `${authors}. ${c.title}[D]. ${c.city ? `${c.city}: ` : ''}${c.journalOrPublisher}, ${c.year}.`;
      case 'conference':
        return `${authors}. ${c.title}[C]//${c.journalOrPublisher}. ${c.city ? `${c.city}: ` : ''}出版者不详, ${c.year}${c.pages ? `: ${c.pages}` : ''}.`;
      case 'web':
        return `${authors}. ${c.title}[EB/OL]. ${c.url ? `${c.url}, ` : ''}${c.year}.`;
      default:
        return `${authors}. ${c.title}. ${c.journalOrPublisher}, ${c.year}.`;
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditForm({ ...emptyCitation });
  };

  const handleSaveAdd = () => {
    if (!editForm.authors || !editForm.title || !editForm.year) {
      alert('请填写作者、题名及年份信息');
      return;
    }
    const newCitation: Citation = {
      ...editForm,
      id: crypto.randomUUID(),
    } as Citation;

    onUpdate({
      ...thesis,
      citations: [...(thesis.citations || []), newCitation]
    });
    setIsAdding(false);
  };

  const handleEdit = (c: Citation) => {
    setIsEditing(c.id);
    setEditForm({ ...c });
  };

  const handleSaveEdit = () => {
    if (!editForm.authors || !editForm.title || !editForm.year) {
      alert('请填写作者、题名及年份信息');
      return;
    }
    const updatedCitations = thesis.citations.map(c => 
      c.id === editForm.id ? { ...c, ...editForm } as Citation : c
    );
    onUpdate({
      ...thesis,
      citations: updatedCitations
    });
    setIsEditing(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除此文献吗？')) {
      onUpdate({
        ...thesis,
        citations: thesis.citations.filter(c => c.id !== id)
      });
    }
  };

  const handleCopy = (citation: Citation) => {
    const formatted = formatCitation(citation);
    navigator.clipboard.writeText(formatted);
    setCopiedId(citation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderForm = (isNew: boolean) => (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800/80 rounded-xl border border-blue-500/30 p-6 flex flex-col gap-4 mb-4 overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">文献类型</label>
          <select
            value={editForm.type}
            onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="article">期刊文章 (J)</option>
            <option value="book">专著/书籍 (M)</option>
            <option value="thesis">学位论文 (D)</option>
            <option value="conference">会议论文 (C)</option>
            <option value="web">电子资源 (EB/OL)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">主要责任者 (作者)</label>
          <input
            type="text"
            value={editForm.authors || ''}
            onChange={e => setEditForm(prev => ({ ...prev, authors: e.target.value }))}
            placeholder="如: 张三, 李四"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">文献题名 (标题)</label>
          <input
            type="text"
            value={editForm.title || ''}
            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="文献标题"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">出处 (期刊/出版社/大学/网址等)</label>
          <input
            type="text"
            value={editForm.journalOrPublisher || ''}
            onChange={e => setEditForm(prev => ({ ...prev, journalOrPublisher: e.target.value }))}
            placeholder="期刊名、出版者等"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">出版年</label>
          <input
            type="text"
            value={editForm.year || ''}
            onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))}
            placeholder="如: 2023"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {(editForm.type === 'book' || editForm.type === 'thesis' || editForm.type === 'conference') && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">出版地 (城市)</label>
            <input
              type="text"
              value={editForm.city || ''}
              onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="如: 北京"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {(editForm.type === 'article') && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">卷标 (Volume)</label>
              <input
                type="text"
                value={editForm.volume || ''}
                onChange={e => setEditForm(prev => ({ ...prev, volume: e.target.value }))}
                placeholder="卷号"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">期标 (Issue)</label>
              <input
                type="text"
                value={editForm.issue || ''}
                onChange={e => setEditForm(prev => ({ ...prev, issue: e.target.value }))}
                placeholder="期号"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </>
        )}

        {editForm.type !== 'web' && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">页码范围</label>
            <input
              type="text"
              value={editForm.pages || ''}
              onChange={e => setEditForm(prev => ({ ...prev, pages: e.target.value }))}
              placeholder="如: 100-110"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
        
        {editForm.type === 'web' && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">URL 链接</label>
            <input
              type="text"
              value={editForm.url || ''}
              onChange={e => setEditForm(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => isNew ? setIsAdding(false) : setIsEditing(null)}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 font-medium transition-colors"
        >
          取消
        </button>
        <button
          onClick={isNew ? handleSaveAdd : handleSaveEdit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Library className="text-indigo-400 w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">参考文献管理</h2>
            <p className="text-sm text-slate-400">管理并自动生成供复制的 GB/T 7714 格式文献列表</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20",
            isAdding && "opacity-50 cursor-not-allowed"
          )}
        >
          <Plus className="w-4 h-4" />
          添加文献
        </button>
      </div>

      <AnimatePresence>
        {isAdding && renderForm(true)}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-3">
        {thesis.citations && thesis.citations.length > 0 ? (
          thesis.citations.map((c, index) => (
            <div key={c.id}>
              {isEditing === c.id ? (
                 renderForm(false)
              ) : (
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 transition-all hover:bg-slate-800/60 hover:border-slate-600/50 flex flex-col sm:flex-row sm:items-center gap-4 group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-sm font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium leading-relaxed break-words">
                      {formatCitation(c)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        {c.type === 'article' && '期刊文章'}
                        {c.type === 'book' && '专著书籍'}
                        {c.type === 'thesis' && '学位论文'}
                        {c.type === 'conference' && '会议论文'}
                        {c.type === 'web' && '电子资源'}
                      </span>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          访问链接
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(c)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="复制 GB/T 7714 格式"
                    >
                      {copiedId === c.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-800/20 border border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center">
            <Library className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">暂无文献记录</p>
            <p className="text-slate-500 text-sm">点击右上角“添加文献”增加引用来源，系统会自动格式化为 GB/T 7714 标准。</p>
          </div>
        )}
      </div>
      
      {thesis.citations && thesis.citations.length > 0 && (
        <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-sm font-semibold text-slate-300">参考文献列表 (GB/T 7714)</h3>
             <button
               onClick={() => {
                 const allTexts = thesis.citations.map((c, i) => `[${i + 1}] ${formatCitation(c)}`).join('\n');
                 navigator.clipboard.writeText(allTexts);
                 alert('已复制全部参考文献列表！');
               }}
               className="text-xs flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors"
             >
               <Copy className="w-3 h-3" />
               复制全部
             </button>
           </div>
           <div className="text-xs text-slate-400 font-mono bg-slate-950 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
             {thesis.citations.map((c, i) => (
                <div key={c.id} className="mb-2">[{i + 1}] {formatCitation(c)}</div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}
