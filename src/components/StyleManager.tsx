import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Plus, Loader2, FileText, Trash2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { WritingStyle } from '../types';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Vite handles the worker module correctly if we import it with ?url
// Sometimes modern pdfjs versions put it in build/pdf.worker.mjs
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface StyleManagerProps {
  styles: WritingStyle[];
  onAddStyle: (style: WritingStyle) => void;
  onDeleteStyle: (id: string) => void;
}

export default function StyleManager({ styles, onAddStyle, onDeleteStyle }: StyleManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [styleName, setStyleName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [tmpExtracted, setTmpExtracted] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const parseDocument = async (file: File) => {
    setIsParsing(true);
    setUploadedFileName(file.name);
    setError('');
    
    try {
      let text = '';
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        text = await file.text();
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let pdfText = '';
        const maxPages = Math.min(pdfDoc.numPages, 100); // Extract up to 100 pages to avoid freezing
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          pdfText += pageText + '\n';
        }
        text = pdfText;
      } else {
        throw new Error('不支持的文件格式。请上传 .txt, .md, .docx 或 .pdf 文件');
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('未能从文件中提取到有效文本。');
      }

      // To prevent token limit issues, if text is too long, we sample it.
      // Usually, taking first 15k chars + middle 20k chars + end 15k chars covers abstract, body, and conclusion.
      if (text.length > 50000) {
        text = text.substring(0, 15000) + 
               "\n...[中间部分截断]...\n" + 
               text.substring(Math.floor(text.length / 2) - 10000, Math.floor(text.length / 2) + 10000) +
               "\n...[尾部部分截断]...\n" + 
               text.substring(text.length - 15000);
      }
      
      setSampleText(text);
    } catch (e: any) {
      console.error(e);
      setError('解析文件失败: ' + (e.message || String(e)));
      setUploadedFileName('');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseDocument(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseDocument(file);
    }
  };

  const handleExtract = async () => {
    if (!sampleText.trim()) return;
    setIsExtracting(true);
    setError('');
    setTmpExtracted('');
    
    try {
      const prompt = `这是一篇用于提取写作特征的长篇范文或论文片段。请根据指令提取其写作风格：\n\n【范文正文开始】\n${sampleText}\n【范文正文结束】`;
      const response = await askAI(prompt, SYSTEM_PROMPTS.STYLE_EXTRACTOR);
      if (response && response.trim()) {
        setTmpExtracted(response);
      } else {
        throw new Error("模型未返回有效的风格内容");
      }
    } catch (e: any) {
      setError("提取失败: " + String(e.message || e));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    if (!styleName.trim() || !tmpExtracted.trim()) return;
    
    const newStyle: WritingStyle = {
      id: crypto.randomUUID(),
      name: styleName.trim(),
      content: tmpExtracted,
      createdAt: new Date().toISOString()
    };
    
    onAddStyle(newStyle);
    setIsCreating(false);
    setSampleText('');
    setStyleName('');
    setTmpExtracted('');
    setError('');
    setUploadedFileName('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          全库写作风格
        </h2>
        
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            新建风格
          </button>
        )}
      </div>

      <div className="text-sm text-slate-400 max-w-3xl">
        您可以上传整篇高质量论文或范文，AI将对其【全局基调】和【各章节专属指标】进行深度解构和固化。建立专属风格后，应用到项目生成时能让系统针对不同章节匹配最佳的行文节奏、句群结构，有效降低重样度及AI痕迹。
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-6"
        >
          <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              创建新风格（上传文献解析）
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setTmpExtracted('');
                setSampleText('');
                setUploadedFileName('');
              }}
              className="text-slate-400 hover:text-white text-sm"
            >
              取消
            </button>
          </div>

          {!tmpExtracted ? (
            <div className="space-y-4">
              <div 
                className="w-full border-2 border-dashed border-slate-700 rounded-xl p-8 transition-colors hover:border-indigo-500/50 hover:bg-slate-800/30 text-center flex flex-col items-center justify-center cursor-pointer group"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept=".txt,.md,.docx,.pdf" 
                   onChange={handleFileUpload}
                />
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-900/50 transition-all">
                  {isParsing ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <Upload className="w-6 h-6 text-indigo-400" />}
                </div>
                {isParsing ? (
                   <p className="text-sm font-bold text-slate-300">正在解析文件中共的文本结构，请稍候...</p>
                ) : (
                   <>
                     <p className="text-sm font-bold text-slate-300 mb-1">
                       {uploadedFileName ? `已选择: ${uploadedFileName} (点击或拖拽重新上传)` : '点击或拖拽上传学术论文 / 范文文档'}
                     </p>
                     <p className="text-xs text-slate-500">支持格式: .pdf, .docx, .txt, .md（最大推荐20MB）</p>
                   </>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">解析后的参照例文内容 (亦可手动输入修改)</label>
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  disabled={isExtracting || isParsing}
                  placeholder="上传文件后这里会自动填入解析出的正文内容。或者直接在此粘贴高质量论文..."
                  className="w-full h-40 bg-[#0F172A] border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none disabled:opacity-50"
                  spellCheck={false}
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-lg text-sm border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleExtract}
                  disabled={isExtracting || sampleText.trim().length < 50}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在提取并固化全章风格...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      生成全系风格指标
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI 提取到的技能指标风格</label>
                <div className="w-full h-64 overflow-y-auto bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-sm text-green-100/80 whitespace-pre-wrap leading-relaxed font-mono">
                  {tmpExtracted}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">命名该技能风格</label>
                <input
                  type="text"
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="例如：系统工程类偏量化风格、高级工商管理深度剖析风..."
                  className="w-full bg-[#0F172A] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTmpExtracted('')}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all"
                >
                  重新配置
                </button>
                <button
                  onClick={handleSave}
                  disabled={!styleName.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  保存风格技能
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* List of saved styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {styles.map(style => (
          <div key={style.id} className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50 flex flex-col hover:border-indigo-500/50 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-slate-100 truncate pr-4">{style.name}</h3>
              <button
                onClick={() => onDeleteStyle(style.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                title="删除风格"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 line-clamp-4 flex-1 mb-4 leading-relaxed group-hover:text-slate-300 transition-colors">
              {style.content}
            </p>
            
            <div className="text-[10px] text-slate-500 pt-4 border-t border-slate-700/50 flex justify-between items-center mt-auto">
              <span>{new Date(style.createdAt).toLocaleDateString()} 创建</span>
              <span className="flex items-center gap-1 text-indigo-400/50">
                <Sparkles className="w-3 h-3" />
                各章节自动适用
              </span>
            </div>
          </div>
        ))}
        {styles.length === 0 && !isCreating && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500">
            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
            <p>暂无配置完备的写作风格技能</p>
            <button
               onClick={() => setIsCreating(true)}
               className="mt-4 px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg text-sm hover:bg-indigo-600/30 transition-colors"
            >
               去解析第一篇
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
