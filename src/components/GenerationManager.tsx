import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings2,
  ArrowRight,
  Database
} from 'lucide-react';
import { Thesis, GenerationStepId, GenerationNode } from '../types';
import { cn } from '../lib/utils';
import { getApiConfig } from '../lib/apiConfig';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

interface GenerationManagerProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
  onNavigate: (tab: any) => void;
}

export default function GenerationManager({ thesis, onUpdate, onNavigate }: GenerationManagerProps) {
  const steps: { id: GenerationStepId; label: string; desc: string; targetTab: string }[] = [
    { id: 'topic', label: '1. 题目确定', desc: '项目初始化与题目设定', targetTab: 'project' },
    { id: 'style', label: '2. 风格设定', desc: '全局写作风格绑定', targetTab: 'styles' },
    { id: 'outline', label: '3. 大纲生成', desc: '章、节三级目录规划', targetTab: 'outline' },
    { id: 'proposal', label: '4. 开题报告', desc: '核心逻辑提炼与大纲预填', targetTab: 'proposal' },
    { id: 'body', label: '5. 正文生成', desc: '依据开题报告主旨逐节扩展', targetTab: 'editor' }
  ];

  const [localNodes, setLocalNodes] = useState<Partial<Record<GenerationStepId, GenerationNode>>>(thesis.generationNodes || {});
  const [runningStep, setRunningStep] = useState<GenerationStepId | null>(null);
  const [expandedConfigNode, setExpandedConfigNode] = useState<GenerationStepId | null>(null);

  useEffect(() => {
    setLocalNodes(thesis.generationNodes || {});
  }, [thesis.generationNodes]);

  // Sync state initially
  useEffect(() => {
    let changed = false;
    const newNodes = { ...(thesis.generationNodes || {}) };

    if (thesis.topic && (!newNodes.topic || newNodes.topic.status !== 'success')) {
      newNodes.topic = { 
        stepId: 'topic', 
        status: 'success', 
        updatedAt: thesis.updatedAt,
        modelUsed: newNodes.topic?.modelUsed || 'User/Setup'
      };
      changed = true;
    }

    if (thesis.writingStyle && (!newNodes.style || newNodes.style.status !== 'success')) {
      newNodes.style = {
        stepId: 'style',
        status: 'success',
        updatedAt: thesis.updatedAt,
        modelUsed: newNodes.style?.modelUsed || 'User/Setup'
      };
      changed = true;
    }

    const hasOutline = thesis.chapters.length > 0;
    if (hasOutline && (!newNodes.outline || newNodes.outline.status !== 'success')) {
      newNodes.outline = { 
        stepId: 'outline', 
        status: 'success', 
        updatedAt: thesis.updatedAt,
        modelUsed: newNodes.outline?.modelUsed || 'Auto'
      };
      changed = true;
    }

    if (thesis.proposal && (!newNodes.proposal || newNodes.proposal.status !== 'success')) {
      newNodes.proposal = { 
        stepId: 'proposal', 
        status: 'success', 
        updatedAt: thesis.updatedAt,
        modelUsed: newNodes.proposal?.modelUsed || 'Auto'
      };
      changed = true;
    }

    const hasSomeBody = thesis.chapters.some(c => c.sections.some(s => s.content.trim().length > 0));
    if (hasSomeBody && (!newNodes.body || newNodes.body.status !== 'success')) {
      newNodes.body = { 
        stepId: 'body', 
        status: 'success', 
        updatedAt: thesis.updatedAt,
        modelUsed: newNodes.body?.modelUsed || 'Auto' 
      };
      changed = true;
    }

    if (changed) {
      onUpdate({ ...thesis, generationNodes: newNodes });
    }
  }, []);

  // Execute functions are now delegated to their respective tabs.

  const globalConfig = getApiConfig();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/30">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">论文生成管线 (生成管理)</h2>
          <p className="text-sm font-medium text-slate-400">统筹管理各个阶段的进度、配置各个节点的模型，并可在本页直接执行生成任务</p>
        </div>
      </div>

      <div className="relative pl-6">
        <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-800"></div>

        <div className="space-y-6 relative">
          {steps.map((step, index) => {
            const nodeInfo = localNodes[step.id];
            const isCompleted = nodeInfo?.status === 'success';
            const isRunning = runningStep === step.id;
            
            return (
              <div key={step.id} className="flex gap-6 group">
                <div className="relative z-10 flex flex-col items-center shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-all",
                    isCompleted 
                      ? "bg-emerald-500 border-emerald-400 shadow-emerald-500/20 text-emerald-950" 
                      : isRunning 
                      ? "bg-blue-500 border-blue-400 shadow-blue-500/50 text-white animate-pulse"
                      : "bg-[#0F172A] border-slate-700 text-slate-500 group-hover:border-slate-500"
                  )}>
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className={cn(
                    "bento-card p-5 rounded-2xl transition-all border",
                    isCompleted ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800 bg-[#0F172A] hover:border-slate-700"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                          {step.label}
                          {isCompleted && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">已完成</span>}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">{step.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onNavigate(step.targetTab)}
                          className="text-xs font-bold text-white flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <PlayCircle className="w-3 h-3" />
                          前往执行
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-500 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
                          <Settings2 className="w-3 h-3" />
                          {nodeInfo?.modelUsed ? (
                            <span className="flex items-center gap-1">
                              执行模型: <strong className="text-emerald-400 font-semibold">{nodeInfo.modelUsed}</strong>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              当前配置: <span className="text-slate-300">{globalConfig.model}</span> (默认统一模型)
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedConfigNode(expandedConfigNode === step.id ? null : step.id);
                          }}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {expandedConfigNode === step.id ? '收起配置' : '手动配置节点模型'}
                        </button>
                      </div>
                      
                      {nodeInfo?.updatedAt ? (
                        <span className="text-slate-500">完成于 {new Date(nodeInfo.updatedAt).toLocaleTimeString()}</span>
                      ) : (
                        <span className="text-slate-600 italic">等待执行...</span>
                      )}
                    </div>
                    {/* Node Config Override */}
                    <AnimatePresence>
                      {expandedConfigNode === step.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                              <h5 className="font-semibold text-slate-300 text-sm mb-3">节点专属配置 (将在此环节覆盖全局默认配置)</h5>
                              <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/30"
                                    checked={nodeInfo?.customConfig?.enabled || false}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const updatedNodes = {
                                        ...thesis.generationNodes,
                                        [step.id]: {
                                          ...nodeInfo,
                                          stepId: step.id,
                                          status: nodeInfo?.status || 'idle',
                                          customConfig: {
                                            ...(nodeInfo?.customConfig || { platform: globalConfig.platform, model: '', baseUrl: '', apiKey: '' }),
                                            enabled: checked
                                          }
                                        }
                                      };
                                      onUpdate({ ...thesis, generationNodes: updatedNodes });
                                    }}
                                  />
                                  启用独立模型
                                </label>
                              </div>
                              {nodeInfo?.customConfig?.enabled && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500">模型名称</label>
                                    <input 
                                      type="text" 
                                      value={nodeInfo.customConfig.model || ''}
                                      onChange={(e) => {
                                        const updatedNodes = {
                                          ...thesis.generationNodes,
                                          [step.id]: {
                                            ...nodeInfo,
                                            customConfig: { ...nodeInfo.customConfig, model: e.target.value }
                                          }
                                        } as any;
                                        onUpdate({ ...thesis, generationNodes: updatedNodes });
                                      }}
                                      placeholder={`例如: deepseek-chat 或 gpt-4o`}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500">Base URL (预置平台留空即可)</label>
                                    <input 
                                      type="text" 
                                      value={nodeInfo.customConfig.baseUrl || ''}
                                      onChange={(e) => {
                                        const updatedNodes = {
                                          ...thesis.generationNodes,
                                          [step.id]: {
                                            ...nodeInfo,
                                            customConfig: { ...nodeInfo.customConfig, baseUrl: e.target.value }
                                          }
                                        } as any;
                                        onUpdate({ ...thesis, generationNodes: updatedNodes });
                                      }}
                                      placeholder="https://api.openai.com/v1"
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                                    />
                                  </div>
                                  <div className="space-y-1.5 col-span-2">
                                    <label className="text-xs text-slate-500">专属 API Key</label>
                                    <input 
                                      type="password" 
                                      value={nodeInfo.customConfig.apiKey || ''}
                                      onChange={(e) => {
                                        const updatedNodes = {
                                          ...thesis.generationNodes,
                                          [step.id]: {
                                            ...nodeInfo,
                                            customConfig: { ...nodeInfo.customConfig, apiKey: e.target.value }
                                          }
                                        } as any;
                                        onUpdate({ ...thesis, generationNodes: updatedNodes });
                                      }}
                                      placeholder="覆盖全局 API Key，留空则使用全局配置"
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
