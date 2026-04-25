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
  Wifi
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Thesis } from '../types';

interface ProjectStartupProps {
  onStart: (data: { topic: string; type: string; field: string }) => void;
  isLoading: boolean;
  existingThesis?: Thesis | null;
  onLoadExisting?: () => void;
}

export default function ProjectStartup({ onStart, isLoading, existingThesis, onLoadExisting }: ProjectStartupProps) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('case');
  const [field, setField] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{status: 'success' | 'error', message: string} | null>(null);

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
      const response = await fetch('/api/test-api');
      const data = await response.json();
      if (response.ok) {
        setApiTestResult({ status: 'success', message: data.message });
      } else {
        setApiTestResult({ status: 'error', message: data.error || data.details || '测试失败' });
      }
    } catch (e: any) {
      setApiTestResult({ status: 'error', message: e.message || '网络或服务器错误' });
    } finally {
      setIsTestingApi(false);
    }
  };

  const isTestPassed = testResults.every(v => v === true);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {existingThesis && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h3 className="label-caps mb-6 opacity-40">已生成的论文记录</h3>
          <div 
            onClick={onLoadExisting}
            className="bento-card p-8 flex items-center justify-between cursor-pointer group hover:bg-blue-600/5 transition-all border-blue-500/20"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white mb-2">{existingThesis.topic}</h4>
                <div className="flex items-center gap-4">
                  <span className="label-caps opacity-50">类型: {existingThesis.researchType === 'case' ? '案例研究' : existingThesis.researchType === 'special' ? '专题研究' : '设计类'}</span>
                  <div className="w-1 h-1 bg-slate-700 rounded-full" />
                  <span className="label-caps opacity-50">领域: {existingThesis.field}</span>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 text-blue-400 font-bold group-hover:translate-x-2 transition-transform">
              继续撰写
              <ArrowRight className="w-5 h-5" />
            </button>
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
                <label className="label-caps block mb-3 opacity-50 ml-1">论文题目</label>
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
                      onClick={() => onStart({ topic, type, field })}
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

            <div className="mt-auto pt-10 relative z-10">
              <div className="p-4 bg-black/20 rounded-2xl border border-white/5 flex items-start gap-3 backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-[10px] text-blue-100/60 leading-relaxed font-medium">
                  提示：如果您有任何一项无法确定，建议联系导师确认调研数据的可获得性，否则后期将面临巨大的修改压力。
                </p>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          </section>
        </div>
      </div>
    </div>
  );
}
