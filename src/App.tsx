import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layout, 
  FileText, 
  CheckCircle, 
  Settings, 
  ChevronRight, 
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Thesis, Chapter, Section, LogicIssue } from './types';
import { cn } from './lib/utils';
import { askAI, SYSTEM_PROMPTS } from './services/aiService';

// Sub-components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProjectStartup from './components/ProjectStartup';
import OutlineView from './components/OutlineView';
import EditorView from './components/EditorView';
import AuditView from './components/AuditView';
import LiteratureManager from './components/LiteratureManager';
import ApiSettingsModal from './components/ApiSettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'project' | 'outline' | 'editor' | 'literature' | 'audit'>('project');
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize from server or local storage
  useEffect(() => {
    const init = async () => {
      try {
        // Try server first
        const resp = await fetch('/api/load-thesis');
        if (resp.ok) {
          const remote = await resp.json();
          if (remote && Array.isArray(remote.chapters)) {
            setThesis(remote);
            return;
          }
        }
        
        // Fallback to local storage
        const saved = localStorage.getItem('mem-thesis-master');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.chapters)) {
            // Ensure citations array exists
            if (!parsed.citations) {
              parsed.citations = [];
            }
            setThesis(parsed);
          }
        }
      } catch (e) {
        console.error("Initialization failed", e);
      }
    };
    init();
  }, []);

  // Save to local storage and server
  useEffect(() => {
    if (thesis) {
      localStorage.setItem('mem-thesis-master', JSON.stringify(thesis));
      
      // debounced server save
      const timer = setTimeout(async () => {
        try {
          await fetch('/api/save-thesis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thesis })
          });
        } catch (e) {
          console.error("Server save failed", e);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [thesis]);

  // Default tab based on thesis existence
  useEffect(() => {
    if (thesis && activeTab === 'project') {
      setActiveTab('outline');
    }
  }, [thesis]);

  const handleStartProject = async (data: { topic: string; type: string; field: string }) => {
    setIsInitializing(true);
    try {
      const prompt = `题目：${data.topic}\n类型：${data.type}\n领域：${data.field}`;
      const aiResponse = await askAI(prompt, SYSTEM_PROMPTS.STRUCTURE_GENERATOR);
      
      // Basic cleaning if AI returns Markdown
      const jsonStr = aiResponse.replace(/```json|```/g, '').trim();
      let parsedData = JSON.parse(jsonStr);
      
      // Handle cases where AI might wrap the array in an object like { "chapters": [...] }
      const chapterArray = Array.isArray(parsedData) ? parsedData : (parsedData.chapters || []);
      
      if (!Array.isArray(chapterArray)) {
        throw new Error("AI response did not contain a valid chapter array");
      }

      // Normalize data: add IDs, defaults, etc.
      const chapters: Chapter[] = chapterArray.map((c: any) => ({
        id: c.id || crypto.randomUUID(),
        title: c.title || "未命名章节",
        description: c.description || "",
        sections: (c.sections || []).map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          title: s.title || "未命名小节",
          content: s.content || "",
          status: s.status || 'empty',
          targetWordCount: s.targetWordCount || 1500
        }))
      }));

      const newThesis: Thesis = {
        id: crypto.randomUUID(),
        topic: data.topic,
        researchType: data.type as any,
        field: data.field,
        chapters,
        problems: [],
        solutions: [],
        citations: [],
        updatedAt: new Date().toISOString()
      };

      setThesis(newThesis);
      setActiveTab('outline');
    } catch (error) {
      console.error("Failed to start project:", error);
      alert("初始化失败，请检查网络或API密钥。");
    } finally {
      setIsInitializing(false);
    }
  };

  const updateThesis = (updated: Thesis) => {
    setThesis({ ...updated, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="flex h-screen bg-[#0A0F1E] text-slate-200 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} hasProject={!!thesis} onOpenSettings={() => setShowSettings(true)} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeTab={activeTab} thesisTopic={thesis?.topic} />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'project' && (
              <motion.div
                key="startup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ProjectStartup 
                  onStart={handleStartProject} 
                  isLoading={isInitializing} 
                  existingThesis={thesis}
                  onLoadExisting={() => setActiveTab('outline')}
                />
              </motion.div>
            )}

            {thesis && activeTab === 'outline' && (
              <motion.div
                key="outline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <OutlineView thesis={thesis} onUpdate={updateThesis} onSelectSection={(id) => {
                  setSelectedSectionId(id);
                  setActiveTab('editor');
                }} />
              </motion.div>
            )}

            {thesis && activeTab === 'editor' && (
              <motion.div
                key="editor"
                className="h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EditorView 
                  thesis={thesis} 
                  onUpdate={updateThesis} 
                  initialSectionId={selectedSectionId} 
                />
              </motion.div>
            )}

            {thesis && activeTab === 'literature' && (
              <motion.div
                key="literature"
                className="h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LiteratureManager thesis={thesis} onUpdate={updateThesis} />
              </motion.div>
            )}

            {thesis && activeTab === 'audit' && (
              <motion.div
                key="audit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AuditView thesis={thesis} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ApiSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
