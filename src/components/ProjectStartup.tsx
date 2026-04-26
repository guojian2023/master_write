import React, { useState } from 'react';
import { 
  Sparkles, 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  ShieldQuestion,
  Loader2,
  AlertCircle,
  BookOpen,
  Wifi,
  Trash2,
  Check,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Thesis, WritingStyle } from '../types';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

interface ProjectStartupProps {
  onStart: (data: { topic: string; type: string; field: string; writingStyle?: string }) => void;
  isLoading: boolean;
  theses?: Thesis[];
  savedStyles?: WritingStyle[];
  onLoadExisting?: (id: string) => void;
  onDeleteThesis?: (id: string) => void;
}

export default function ProjectStartup({ onStart, isLoading, theses = [], savedStyles = [], onLoadExisting, onDeleteThesis }: ProjectStartupProps) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('case');
  const [field, setField] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{status: 'success' | 'error', message: string} | null>(null);

  const [showAiNaming, setShowAiNaming] = useState(false);
  const [namingData, setNamingData] = useState({ object: '', problem: '', method: '', keywords: '' });
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [namingError, setNamingError] = useState('');

  const handleGenerateTitles = async () => {
    if (!namingData.object || !namingData.problem) {
      setNamingError('请至少填写研究对象和核心问题');
      return;
    }
    setNamingError('');
    setIsGeneratingTitles(true);
    setGeneratedTitles([]);
    
    try {
      const prompt = `
        研究对象：${namingData.object}
        核心问题：${namingData.problem}
        理论方法：${namingData.method}
        补充关键词：${namingData.keywords}
      `;
      const response = await askAI(prompt, SYSTEM_PROMPTS.TITLE_GENERATOR);
      
      let parsed = [];
      try {
        const cleanJson = response.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        throw new Error('AI 返回的数据格式无法解析');
      }
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        setGeneratedTitles(parsed);
      } else {
        throw new Error('AI 未能生成有效的题目列表');
      }
    } catch (e: any) {
      setNamingError(e.message || '生成失败，请重试');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const questions = [
    { id: 1, text: '准备好了吗？（数据收集是否可行）', checked: false },
    { id: 2, text: '理论联系实际吗？（是否有具体的管理问题）', checked: false },
    { id: 3, text: '有敬畏感吗？（是否深入调研而非拍脑袋）', checked: false },
  ];

  const [testResults, setTestResults] = useState([false, false, false]);

  const toggleTest = (index: number) => {
    const next = [...testResults];
    next[index] = !next[index];
    setTestResults(next);
  };

  const testApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const { testAPI } = await import('../services/aiService');
      const message = await testAPI();
      setApiTestResult({ status: 'success', message });
    } catch (e: any) {
      setApiTestResult({ status: 'error', message: e.message || '网络或服务器错误' });
    } finally {
      setIsTestingApi(false);
    }
  };

  const isTestPassed = testResults.every(v => v === true);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {theses.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h3 className="label-caps mb-6 opacity-40">已生成的论文记录 ({theses.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theses.map((thesis) => (
              <div 
                key={thesis.id}
                onClick={() => onLoadExisting && onLoadExisting(thesis.id)}
                className="bento-card p-6 flex flex-col justify-between cursor-pointer group hover:bg-blue-600/5 transition-all border-blue-500/20 relative"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <BookOpen className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 pr-8 text-left">
                    <h4 className="text-lg font-black text-white mb-2 line-clamp-2">{thesis.topic}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="label-caps text-[10px] opacity-50 bg-slate-800 px-2 py-1 rounded">
                        {thesis.researchType === 'case' ? '案例' : thesis.researchType === 'special' ? '专题' : '设计'}
                      </span>
                      <span className="label-caps text-[10px] opacity-50 bg-slate-800 px-2 py-1 rounded">
                        {thesis.field}
                      </span>
                      <span className="label-caps text-[10px] opacity-50 whitespace-nowrap">
                        {new Date(thesis.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('确定要删除这篇论文吗？删除后无法恢复。')) {
                        onDeleteThesis && onDeleteThesis(thesis.id);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="flex items-center gap-2 text-sm text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                    开启撰写
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="text-center mb-16">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-blue-500/20"
        >
          <Sparkles className="w-3 h-3" />
          全生命周期管理辅助系统
        </motion.div>
        <h2 className="text-5xl font-black text-white tracking-tighter mb-4">
          开启您的 MEM 论文之旅
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto font-medium">
          好的开始是成功的一半。我们将引导您从选题评估到自动架构生成，确保论文从第一步就符合评审标准。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        <div className="md:col-span-7 space-y-6">
          <section className="bento-card p-10 h-full">
            <h3 className="label-caps mb-8 flex items-center gap-2 text-blue-400">
              <Target className="w-4 h-4" />
              01. 填写初步信息
            </h3>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="label-caps block opacity-50 ml-1">论文题目</label>
                  <button 
                    onClick={() => setShowAiNaming(!showAiNaming)} 
                    className={cn(
                      "text-xs flex items-center gap-1.5 transition-colors font-medium px-3 py-1.5 rounded-full border",
                      showAiNaming 
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-blue-400 hover:bg-slate-800"
                    )}
                  >
                    <Sparkles className="w-3 h-3" /> 
                    {showAiNaming ? "收起 AI 拟题" : "AI 辅助拟题"}
                  </button>
                </div>
                
                {showAiNaming && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-6 rounded-xl bg-blue-900/10 border border-blue-500/20 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">研究对象 (必填)</label>
                        <input 
                          type="text" 
                          value={namingData.object}
                          onChange={(e) => setNamingData({...namingData, object: e.target.value})}
                          placeholder="如：某医药公司的研发项目"
                          className="w-full bg-[#0F172A] px-3 py-2.5 rounded-lg border border-slate-700 focus:border-blue-500 outline-none text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">要解决的核心问题 (必填)</label>
                        <input 
                          type="text" 
                          value={namingData.problem}
                          onChange={(e) => setNamingData({...namingData, problem: e.target.value})}
                          placeholder="如：进度延期、流程低效"
                          className="w-full bg-[#0F172A] px-3 py-2.5 rounded-lg border border-slate-700 focus:border-blue-500 outline-none text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">理论或方法 (可选)</label>
                        <input 
                          type="text" 
                          value={namingData.method}
                          onChange={(e) => setNamingData({...namingData, method: e.target.value})}
                          placeholder="如：敏捷管理、六西格玛"
                          className="w-full bg-[#0F172A] px-3 py-2.5 rounded-lg border border-slate-700 focus:border-blue-500 outline-none text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">其他关键词 (可选)</label>
                        <input 
                          type="text" 
                          value={namingData.keywords}
                          onChange={(e) => setNamingData({...namingData, keywords: e.target.value})}
                          placeholder="如：风险管控体系"
                          className="w-full bg-[#0F172A] px-3 py-2.5 rounded-lg border border-slate-700 focus:border-blue-500 outline-none text-sm text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-400 font-medium">{namingError}</span>
                      <button
                        onClick={handleGenerateTitles}
                        disabled={isGeneratingTitles}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingTitles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        生成高质量命题
                      </button>
                    </div>
                    
                    {generatedTitles.length > 0 && (
                      <div className="mt-6 space-y-2">
                        <p className="text-xs font-bold text-blue-400 mb-2">请选择一个题目（点击即可）：</p>
                        {generatedTitles.map((t, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setTopic(t);
                              setShowAiNaming(false);
                            }}
                            className="w-full text-left p-3 rounded-lg bg-[#0F172A] border border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/5 transition-colors text-sm text-slate-300 flex items-center justify-between group"
                          >
                            <span>{t}</span>
                            <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="如：S公司供应链金融风险管理研究"
                  className="w-full bg-[#0F172A] px-5 py-4 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="label-caps block mb-3 opacity-50 ml-1">研究类型</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'special', label: '专题研究' },
                      { id: 'case', label: '案例研究' },
                      { id: 'design', label: '设计类' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={cn(
                          "py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between",
                          type === t.id 
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" 
                            : "bg-[#0F172A] border-slate-700 text-slate-500 hover:border-slate-500"
                        )}
                      >
                        {t.label}
                        {type === t.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="label-caps block mb-3 opacity-50 ml-1">行业领域</label>
                  <input 
                    type="text" 
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    placeholder="如：智能制造"
                    className="w-full bg-[#0F172A] px-5 py-4 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-white font-medium mb-4"
                  />
                  
                  <div className="mt-auto">
                    <div className="mb-4">
                      <button
                        onClick={testApi}
                        disabled={isTestingApi}
                        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        {isTestingApi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                        测试 API 连接
                      </button>
                      {apiTestResult && (
                        <div className={cn(
                          "mt-2 text-xs p-2 rounded-lg border",
                          apiTestResult.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {apiTestResult.message}
                        </div>
                      )}
                    </div>
                    <button
                      disabled={!topic || !field || !isTestPassed || isLoading}
                      onClick={() => {
                        const styleContent = selectedStyleId ? savedStyles.find(s => s.id === selectedStyleId)?.content : undefined;
                        onStart({ topic, type, field, writingStyle: styleContent });
                      }}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all shadow-xl",
                        (!topic || !field || !isTestPassed || isLoading)
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed shadow-none"
                          : "bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] shadow-blue-600/20"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          生成架构
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="md:col-span-5">
          <section className="bg-gradient-to-br from-blue-700 to-indigo-900 p-10 rounded-2xl h-full text-white shadow-2xl relative overflow-hidden flex flex-col">
            <div className="relative z-10">
              <h3 className="label-caps text-blue-200 mb-8 flex items-center gap-2">
                <ShieldQuestion className="w-4 h-4" />
                02. 选题“灵魂三问”
              </h3>
              
              <p className="text-blue-100/80 text-sm mb-10 leading-relaxed font-medium italic">
                “选题是成功的80%。” —— Dr. Huang
              </p>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => toggleTest(idx)}
                    className={cn(
                      "w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4",
                      testResults[idx] 
                        ? "bg-white/10 border-white/30 shadow-lg" 
                        : "bg-black/5 border-white/5 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                      testResults[idx] ? "bg-emerald-400" : "border-2 border-white/20"
                    )}>
                      {testResults[idx] && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                    </div>
                    <span className={cn(
                      "text-xs font-bold transition-all leading-tight",
                      testResults[idx] ? "text-white" : "text-blue-200/60"
                    )}>
                      {q.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 relative z-10">
              <h3 className="label-caps text-blue-200 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                03. 关联写作风格 (可选)
              </h3>
              <p className="text-[10px] text-blue-100/60 leading-relaxed font-medium mb-4">
                为该论文项目关联已提取的写作风格，让 AI 在成文时保持特定的用词、节奏和句式。
              </p>
              
              <div className="space-y-3">
                {savedStyles && savedStyles.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedStyleId}
                      onChange={(e) => setSelectedStyleId(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors backdrop-blur-sm appearance-none"
                    >
                      <option value="" className="bg-[#0F172A]">-- 不使用风格 (默认) --</option>
                      {savedStyles.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0F172A]">{s.name}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-blue-200/50 flex justify-end">
                      <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> 您可以在左侧导航栏的“写作风格”模块中管理或提取新的风格。</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-center backdrop-blur-sm">
                    <p className="text-sm text-blue-100/60 mb-2">暂无已保存的写作风格</p>
                    <p className="text-[10px] text-blue-200/50">请在左侧导航栏中前往“写作风格”模块添加。</p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-[10px] text-blue-100/60 leading-relaxed font-medium">
                    提示：如果您有任何一项无法确定，建议联系导师确认调研数据的可获得性，否则后期将面临巨大的修改压力。
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          </section>
        </div>
      </div>
    </div>
  );
}
