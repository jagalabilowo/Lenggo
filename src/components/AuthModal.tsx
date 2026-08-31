import React from 'react';
import { Sparkles, ShieldCheck, X, Zap, Lock } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onGuestSignIn: () => Promise<void>;
  isLoading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onGoogleSignIn,
  onGuestSignIn,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md p-6 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-2xl shadow-black/80 space-y-5 text-slate-100 font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-950/40 mb-1">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Access Lenggo Studio</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto font-mono">
            Zero friction, user-isolated developer study log &amp; active-recall flashcard system.
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Google Sign-In */}
          <button
            onClick={onGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-mono font-semibold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google Sign-In</span>
          </button>

          {/* Quick Demo Mode */}
          <button
            onClick={onGuestSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#070B14] hover:bg-slate-900 text-slate-200 font-mono font-medium text-xs border border-slate-800 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Demo Session (Guest Mode)</span>
          </button>
        </div>

        <div className="pt-2.5 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Strict per-user data isolation via Firestore ABAC rules</span>
        </div>
      </div>
    </div>
  );
};
