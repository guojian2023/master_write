import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  TrendingUp,
  FileSearch,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { Thesis, LogicIssue } from '../types';
import { cn } from '../lib/utils';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

interface AuditViewProps {
  thesis: Thesis;
}

export default function AuditView({ thesis }: AuditViewProps) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [issues, setIssues] = useState<LogicIssue[]>([]);
  const [lastAuditDate, setLastAuditDate] = useState<string | null>(null);

  const performAudit = async () => {
    setIsAuditing(true);
    try {
      // Collect summary of the thesis for audit
      const contentSummary = thesis.chapters.map(c => {
        return `章：${c.title}\n内容摘要：${c.sections.map(s => s.content.substring(0, 300)).join('\n')}`;
      }).join('\n\n');

      const prompt = `论文题目：${thesis.topic}\n论文内容汇总：\n${contentSummary}\n\n请作为评审专家，对该论文的整体逻辑性、一致性进行深度审计。特别检查：\n1. 提出的对策是否真正解决了分析中提到的问题点？\n2. 理论框架是否只是“摆设”，有没有真正融入分析？\n3. 结论是否由正文自然推导而出？\n\n请返回JSON格式的Issue列表。`;
      
      const response = await askAI(prompt, SYSTEM_PROMPTS.LOGIC_AUDITOR);
      const jsonStr = response.replace(/```json|```/g, '').trim();
      setIssues(JSON.parse(jsonStr));
      setLastAuditDate(new Date().toLocaleString());
    } catch (e) {
      alert("审计失败，请重试。");
    } finally {
      setIsAuditing(false);
    }
  };

  const stats = [
    { label: '逻辑一致性', value: issues.length > 0 ? (100 - issues.length * 10) + '%' : '-', color: 'text-blue-400' },
    { label: '理论融入度', value: '中等', color: 'text-amber-500' },
    { label: '结论说服力', value: '需加强', color: 'text-rose-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Audit Control & Stats */}
        <div className="md:col-span-4 space-y-8">
          <section className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-[2rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/20 mb-8">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter mb-4 leading-tight">逻辑与理性审计</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-10 font-medium">
                基于 BUPT 官方评阅意见与 Dr. Huang 的“逻辑闭环”理论，对全文进行专家级扫描。
              </p>

              <button 
                onClick={performAudit}
                disabled={isAuditing}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95 mb-6"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在扫描语义层级...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    启动全量审计
                  </>
                )}
              </button>

              {lastAuditDate && (
                <div className="flex items-center justify-center gap-2">
                  <span className="label-caps opacity-30">最后检查: {lastAuditDate}</span>
                </div>
              )}
            </div>
            
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px]" />
          </section>

          <section className="bento-card p-10">
            <h4 className="label-caps opacity-40 mb-10 text-center">核心合规指标</h4>
            <div className="space-y-8">
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <span className="text-sm font-bold text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-tight">{stat.label}</span>
                  <div className="flex flex-col items-end">
                    <span className={cn("text-xl font-black tracking-tighter", stat.color)}>{stat.value}</span>
                    <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="w-2/3 h-full bg-current opacity-30"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Results Display */}
        <div className="md:col-span-8 space-y-8">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
              <h4 className="text-xl font-black text-white tracking-tight">审计报告清单</h4>
            </div>
            <div className="flex gap-4">
              <div className="status-chip text-rose-500 border-rose-500/20 bg-rose-500/5 font-black uppercase tracking-widest">
                CRITICAL: {issues.filter(i => i.severity === 'high').length}
              </div>
              <div className="status-chip text-amber-500 border-amber-500/20 bg-amber-500/5 font-black uppercase tracking-widest">
                WARNING: {issues.filter(i => i.severity === 'medium').length}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {issues.length === 0 ? (
              <div className="bento-card p-24 flex flex-col items-center justify-center text-center opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-700">
                  <FileSearch className="w-10 h-10 text-slate-600 font-light" />
                </div>
                <h5 className="text-lg font-black text-slate-400 mb-2 uppercase tracking-widest">系统待命中</h5>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">点击左侧按钮启动逻辑审计引擎</p>
              </div>
            ) : (
              issues.map((issue, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx}
                  className="bento-card p-8 group relative"
                >
                  <div className="flex items-start gap-8">
                    <div className={cn(
                      "w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500",
                      issue.severity === 'high' ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5" : 
                      issue.severity === 'medium' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5" : 
                      "bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5"
                    )}>
                      {issue.severity === 'high' ? <AlertTriangle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                    </div>
                    
                    <div className="flex-1 space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={cn(
                            "label-caps mb-2 block",
                            issue.severity === 'high' ? "text-rose-500" : "text-blue-500"
                          )}>Issue Detected</span>
                          <h5 className="text-2xl font-black text-white tracking-tight leading-tight">{issue.message}</h5>
                        </div>
                      </div>

                      <div className="p-6 bg-[#0F172A] rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <h6 className="label-caps text-emerald-400">专家整改建议</h6>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                          {issue.suggestion}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <button className="px-5 py-2.5 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2">
                          跳转定位
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button className="px-5 py-2.5 rounded-xl bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-400 transition-all">
                          标记已修复
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
