import React, { useState } from 'react';
import { Check, Copy, Terminal, Code2 } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  isError?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'plaintext', title, isError = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  if (!code || !code.trim()) return null;

  return (
    <div className={`rounded-xl border ${isError ? 'border-rose-900/60 bg-rose-950/20' : 'border-slate-800 bg-slate-900/80'} overflow-hidden my-3 shadow-lg shadow-black/20`}>
      <div className={`flex items-center justify-between px-4 py-2 text-xs font-mono border-b ${isError ? 'border-rose-900/40 bg-rose-950/40 text-rose-300' : 'border-slate-800/80 bg-slate-950/60 text-slate-400'}`}>
        <div className="flex items-center gap-2 font-medium">
          {isError ? <Terminal className="w-3.5 h-3.5 text-rose-400" /> : <Code2 className="w-3.5 h-3.5 text-indigo-400" />}
          <span>{title || language.toUpperCase()}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          title="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto text-slate-200 leading-relaxed font-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
};
