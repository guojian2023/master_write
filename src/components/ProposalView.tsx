import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Thesis } from '../types';
import { askAI, SYSTEM_PROMPTS } from '../services/aiService';

interface ProposalViewProps {
  thesis: Thesis;
  onUpdate: (thesis: Thesis) => void;
}

export default function ProposalView({ thesis, onUpdate }: ProposalViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const proposal = thesis.proposal;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      // Build context from outline
      const outlineStr = thesis.chapters.map(c => 
        `${c.title}\n` + c.sections.map(s => `  - ${s.title}`).join('\n')
      ).join('\n');

      const prompt = `项目题目：${thesis.topic}\n研究类别：${thesis.researchType}\n所在领域：${thesis.field}\n
论文大纲结构如下：
${outlineStr}

请根据以上信息，严格按照您的System Prompt要求，生成开题报告全文，并在末尾使用 <CONSTRAINT> 标签提炼提示词。`;

      const response = await askAI(prompt, SYSTEM_PROMPTS.PROPOSAL_GENERATOR);
      
      // Parse response to find <CONSTRAINT>
      const constraintMatch = response.match(/<CONSTRAINT>([\s\S]*?)<\/CONSTRAINT>/);
      const constraintPrompt = constraintMatch ? constraintMatch[1].trim() : '';
      
      const cleanContent = response.replace(/<CONSTRAINT>[\s\S]*?<\/CONSTRAINT>/g, '').trim();

      const updatedThesis: Thesis = {
        ...thesis,
        proposal: {
          content: cleanContent,
          constraintPrompt: constraintPrompt,
        }
      };

      onUpdate(updatedThesis);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`生成失败: ${e.message || String(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <FileText className="w-6 h-6 text-indigo-400" />
          开题报告
        </h2>
        
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              正在生成并提炼约束...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {proposal ? '重新生成' : '一键生成开题报告'}
            </>
          )}
        </button>
      </div>

      <div className="text-sm text-slate-400 max-w-3xl">
        根据项目大纲自动生成北京邮电大学《硕士研究生学位论文开题报告》核心内容范本，并提炼其核心基调作为后续正文撰写的约束条件，确保逻辑连贯不跑题。
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {proposal ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {proposal.constraintPrompt && (
             <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h3 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  已提取核心约束提示词 (赋能于正文撰写中)
                </h3>
                <p className="text-xs text-indigo-200/70 leading-relaxed font-mono">
                  {proposal.constraintPrompt}
                </p>
             </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 min-h-[600px] shadow-xl">
             <div className="prose prose-invert prose-blue max-w-none prose-headings:text-slate-200 prose-a:text-blue-400 prose-p:text-slate-300 prose-p:leading-relaxed prose-pre:bg-slate-800/50 prose-pre:border prose-pre:border-slate-700/50">
               <div className="whitespace-pre-wrap">{proposal.content}</div>
             </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl">
          <FileText className="w-16 h-16 text-slate-700 mb-6" />
          <p className="text-slate-400 text-sm font-medium">尚未生成开题报告</p>
          <p className="text-slate-500 text-xs mt-2 max-w-md text-center">点击右上角"一键生成"按钮，AI将根据当前项目大纲结构快速生成完整的开题报告草案。</p>
        </div>
      )}
    </div>
  );
}
