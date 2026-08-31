import React from 'react';
import { Sparkles, BrainCircuit, History, BookOpen, LogIn, LogOut, ShieldCheck, Flame } from 'lucide-react';
import { UserProfile } from '../types.js';

interface NavbarProps {
  activeTab: 'debugger' | 'quizzes' | 'mastery';
  setActiveTab: (tab: 'debugger' | 'quizzes' | 'mastery') => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isFirebaseLive: boolean;
  totalReflectionsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onSignIn,
  onSignOut,
  isFirebaseLive,
  totalReflectionsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0B0F19]/90 border-b border-slate-800/90 px-4 sm:px-8 py-3 transition-all shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand identity & System Status */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/80 p-0.5 shadow-md shadow-indigo-950/40">
              <div className="w-full h-full bg-[#080C16] rounded-[6px] flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5 m-0 p-0">
                  Lenggo
                  <span className="text-[10px] font-mono font-normal text-slate-500 px-1 py-0.2 rounded bg-slate-900 border border-slate-800">
                    v2.5
                  </span>
                  <span className="sr-only">
                    Lenggo: Smart Learning &amp; Coding Reflection Assistant - Multi-Format Technical Study Log, Gemini AI Diagnostics, Active-Recall Quizzes &amp; Mastery Tracking
                  </span>
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Cloud Run Ready
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Smart Learning &amp; Coding Reflection Assistant
              </p>
            </div>
          </div>

          {/* Mobile Auth button */}
          <div className="md:hidden">
            {user ? (
              <button
                onClick={onSignOut}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onSignIn}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Technical Data Grid Segmented Control) */}
        <nav className="flex items-center p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-medium w-full md:w-auto justify-center shadow-inner">
          <button
            onClick={() => setActiveTab('debugger')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-mono text-xs ${
              activeTab === 'debugger'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700 ring-1 ring-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>[1] Daily Debugger</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-mono text-xs ${
              activeTab === 'quizzes'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700 ring-1 ring-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
            <span>[2] Active Recall</span>
          </button>

          <button
            onClick={() => setActiveTab('mastery')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-mono text-xs ${
              activeTab === 'mastery'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700 ring-1 ring-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span>[3] Mastery Grid</span>
            {totalReflectionsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-900 border border-slate-700 text-sky-300 font-mono">
                {totalReflectionsCount}
              </span>
            )}
          </button>
        </nav>

        {/* User profile & SSO action */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-lg ring-1 ring-slate-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-indigo-300 flex items-center justify-center font-bold font-mono text-xs">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-200 max-w-[120px] truncate font-mono">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    {user.isGuest ? (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        Demo
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        SSO
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400 inline" />
                    {totalReflectionsCount} logs saved
                  </p>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign out of Lenggo"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-900/30 border border-indigo-500 transition-all cursor-pointer font-mono"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google Sign-In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
