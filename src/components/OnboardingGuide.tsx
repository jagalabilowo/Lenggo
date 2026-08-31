import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  History,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Zap,
} from 'lucide-react';

interface OnboardingGuideProps {
  onNavigateToTab: (tab: 'debugger' | 'quizzes' | 'mastery') => void;
  onApplySamplePreset?: () => void;
  totalReflections: number;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  onNavigateToTab,
  totalReflections,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('lenggo_guide_collapsed');
    return stored ? JSON.parse(stored) === false : true;
  });

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('lenggo_guide_collapsed', JSON.stringify(!next));
      return next;
    });
  };

  return (
    <div className="mb-6 rounded-xl bg-[#0B0F19] border border-indigo-900/40 shadow-2xl shadow-indigo-950/20 overflow-hidden transition-all font-mono">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-gradient-to-r from-indigo-950/60 via-[#0B0F19] to-slate-900/80 border-b border-indigo-900/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-300">
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Quick Start &amp; Learning Workflow Guide
                <span className="text-[10px] font-normal px-2 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  START HERE
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
              Follow these 4 steps to turn debugging friction into active-recall mastery and verified skill retention.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleOpen}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-mono"
            aria-label={isOpen ? 'Collapse Workflow Guide' : 'Expand Workflow Guide'}
          >
            <span>{isOpen ? 'Hide Instructions' : 'Show Instructions'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Workflow Steps */}
      {isOpen && (
        <div className="p-4 sm:p-5 bg-[#070B14]/80 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Step 1 */}
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800/90 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    STEP 01
                  </span>
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <h3 className="text-xs font-bold text-white font-sans">Pick Preset or Log Obstacle</h3>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  In <strong className="text-slate-200">Daily Debugger</strong>, click a starter preset (or enter your bug title, code snippet, and error trace).
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('debugger')}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white text-[11px] font-mono border border-slate-800 transition-colors cursor-pointer"
              >
                <span>Go to Daily Debugger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800/90 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    STEP 02
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <h3 className="text-xs font-bold text-white font-sans">Run Deep AI Analysis</h3>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Click <strong className="text-indigo-300">Deep AI Analysis</strong>. Gemini analyzes root causes, engineering invariants, and remediation steps.
                </p>
              </div>
              <div className="p-1.5 rounded bg-[#070B14] border border-slate-800 text-[10px] text-slate-400 text-center font-mono">
                Gemini 3.6 Flash + Fallback Ladder
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800/90 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    STEP 03
                  </span>
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <h3 className="text-xs font-bold text-white font-sans">Active Recall Flashcards</h3>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Switch to <strong className="text-slate-200">Active Recall</strong>. Synthesize flashcards from your logs and get scored 0-100 with AI critique.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('quizzes')}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white text-[11px] font-mono border border-slate-800 transition-colors cursor-pointer"
              >
                <span>Practice Flashcards</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800/90 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    STEP 04
                  </span>
                  <History className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <h3 className="text-xs font-bold text-white font-sans">Track Mastery &amp; Export</h3>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Open <strong className="text-slate-200">Mastery Grid</strong> to inspect skill trends, synthesize a weekly report, and export a JSON archive.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('mastery')}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-sky-300 hover:text-white text-[11px] font-mono border border-slate-800 transition-colors cursor-pointer"
              >
                <span>View Mastery Grid</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
