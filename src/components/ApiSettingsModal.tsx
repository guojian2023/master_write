import React, { useState, useEffect } from 'react';
import { ApiConfig, getApiConfig, saveApiConfig } from '../lib/apiConfig';
import { X, Save, Key, Globe, Server, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { testAPI } from '../services/aiService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiSettingsModal({ isOpen, onClose }: ApiSettingsModalProps) {
  const [config, setConfig] = useState<ApiConfig>({
    platform: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-3-flash-preview',
  });
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{status: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getApiConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveApiConfig(config);
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    // temporarily save so testAPI uses latest
    saveApiConfig(config);
    
    try {
      const msg = await testAPI();
      setTestResult({ status: 'success', text: msg });
    } catch (e: any) {
      setTestResult({ status: 'error', text: e.message || '测试失败' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0F172A] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white">模型服务设置</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Platform */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">AI 平台</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'gemini', label: 'Google Gemini' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'custom', label: '自定义 / 多模型' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    const newPlatform = p.id as any;
                    let defaultModel = config.model;
                    if (newPlatform === 'gemini') defaultModel = 'gemini-3-flash-preview';
                    else if (newPlatform === 'openai') defaultModel = 'gpt-4o-mini';
                    else if (newPlatform === 'custom') defaultModel = 'deepseek-chat';
                    
                    setConfig({ ...config, platform: newPlatform, model: defaultModel });
                  }}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center",
                    config.platform === p.id 
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-400" 
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">模型名称</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              placeholder={config.platform === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o'}
            />
          </div>

          {/* Base URL (only for non-gemini) */}
          {config.platform !== 'gemini' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                接口地址 (Base URL)
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                placeholder={config.platform === 'openai' ? 'https://api.openai.com/v1 (可选)' : 'https://api.deepseek.com/v1'}
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              placeholder="留空则使用环境变量配置的 Key"
            />
            <p className="text-xs text-slate-500">API Key 仅安全地保存在您的浏览器本地 (localStorage)。</p>
          </div>

          {/* Test Status */}
          {testResult && (
            <div className={cn(
              "p-3 rounded-lg text-sm flex items-start gap-2 border",
              testResult.status === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              {testResult.status === 'success' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
              <span className="font-medium break-words leading-relaxed">{testResult.text}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isTesting ? "测试中..." : "测试连接"}
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              保存设置
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
