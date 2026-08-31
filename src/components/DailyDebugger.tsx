import React, { useState } from 'react';
import {
  Sparkles,
  Save,
  Code2,
  Terminal,
  Layers,
  FileText,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Plus,
  X,
  HelpCircle,
} from 'lucide-react';
import { ReflectionEntry, DifficultyLevel, AIAnalysisResult, UserProfile } from '../types.js';
import { CodeBlock } from './CodeBlock.js';

interface DailyDebuggerProps {
  user: UserProfile | null;
  onSaveReflection: (entry: ReflectionEntry) => Promise<void>;
  isSaving: boolean;
  onAnalyzeSuccess?: (entry: ReflectionEntry) => void;
}

const COMMON_TAGS = [
  'TypeScript',
  'Python',
  'Docker',
  'GCP',
  'React',
  'Cloud Run',
  'PostgreSQL',
  'Firestore',
  'Go',
  'Node.js',
  'Kubernetes',
  'Security',
  'Async/Await',
];

const TEMPLATES = [
  {
    name: 'Stack Trace & Crash',
    title: 'Unhandled Exception in Async Flow',
    content: 'Encountered unexpected crash during container cold-start when invoking asynchronous database initialization.',
    codeSnippet: `// Failing startup sequence
async function bootstrap() {
  const db = initDatabase();
  await db.connect(); // Throws unhandled rejection
}`,
    errorTrace: `FATAL: Connection refused to 127.0.0.1:5432
at Socket.<anonymous> (/app/node_modules/pg/lib/connection.js:123:17)
at emitOne (events.js:116:13)
at Socket.emit (events.js:211:7)`,
    architectureNotes: 'Need lazy-instantiation pattern and retry backoff loop.',
    tags: ['Node.js', 'PostgreSQL', 'Docker'],
    difficulty: 'complex' as DifficultyLevel,
  },
  {
    name: 'Cloud Run & IAM Auth',
    title: '403 Forbidden on Secret Manager Retrieval in Cloud Run',
    content: 'Cloud Run service failed to read GEMINI_API_KEY from Secret Manager upon initial request deployment.',
    codeSnippet: `gcloud run deploy lenggo-app \\
  --image gcr.io/my-proj/lenggo:latest \\
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest`,
    errorTrace: `Error: 7 PERMISSION_DENIED: Permission 'secretmanager.versions.access' denied on resource 'projects/.../secrets/GEMINI_API_KEY/versions/latest'`,
    architectureNotes: 'Default Compute Engine service account needed secretmanager.secretAccessor role binding.',
    tags: ['GCP', 'Cloud Run', 'Security'],
    difficulty: 'moderate' as DifficultyLevel,
  },
  {
    name: 'React 19 State Race Condition',
    title: 'Infinite Re-render in Snapshot Subscription Hook',
    content: 'Passing unstable object literals inside useEffect dependency array caused infinite network snapshot loops.',
    codeSnippet: `useEffect(() => {
  const unsubscribe = subscribeToData({ filter: activeFilter });
  return () => unsubscribe();
}, [{ filter: activeFilter }]); // Object reference recreated every render!`,
    errorTrace: `Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect`,
    architectureNotes: 'Memoized dependency using primitive string filter value.',
    tags: ['React', 'TypeScript', 'Frontend'],
    difficulty: 'moderate' as DifficultyLevel,
  },
];

export const DailyDebugger: React.FC<DailyDebuggerProps> = ({
  user,
  onSaveReflection,
  isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [errorTrace, setErrorTrace] = useState('');
  const [architectureNotes, setArchitectureNotes] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('moderate');
  const [tags, setTags] = useState<string[]>(['TypeScript', 'GCP']);
  const [customTagInput, setCustomTagInput] = useState('');

  // Active input tab in multi-format editor
  const [activeFormat, setActiveFormat] = useState<'reflection' | 'code' | 'error' | 'architecture'>('reflection');

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisModel, setAnalysisModel] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(false);
  const [presetLoadedHint, setPresetLoadedHint] = useState<string | null>(null);

  const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setCodeSnippet(tpl.codeSnippet);
    setErrorTrace(tpl.errorTrace);
    setArchitectureNotes(tpl.architectureNotes);
    setTags(tpl.tags);
    setDifficulty(tpl.difficulty);
    setAnalysisResult(null);
    setErrorMessage(null);
    setSaveSuccessBanner(false);
    setPresetLoadedHint(`Loaded "${tpl.name}". Click "Deep AI Analysis" below to extract root causes, or edit the inputs.`);
    if (tpl.errorTrace) {
      setActiveFormat('error');
    } else if (tpl.codeSnippet) {
      setActiveFormat('code');
    } else {
      setActiveFormat('reflection');
    }
  };

  const handleToggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      if (tags.length < 8) {
        setTags([...tags, tag]);
      }
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean) && tags.length < 8) {
      setTags([...tags, clean]);
      setCustomTagInput('');
    }
  };

  const handleAnalyze = async () => {
    if (!title.trim() && !content.trim() && !codeSnippet.trim() && !errorTrace.trim()) {
      setErrorMessage('Please provide a title, reflection notes, error logs, or code snippet before requesting AI analysis.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/reflections/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          codeSnippet,
          errorTrace,
          architectureNotes,
          difficulty,
          tags,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete analysis.');
      }

      setAnalysisResult(data.analysis);
      setAnalysisModel(data.meta?.modelUsed || 'gemini-3.6-flash');

      // Auto-merge any high-yield recommended tags
      if (Array.isArray(data.analysis.recommendedTags)) {
        const newTags = data.analysis.recommendedTags.filter(
          (t: string) => typeof t === 'string' && !tags.includes(t) && t.length < 24
        );
        if (newTags.length > 0) {
          setTags((prev) => [...new Set([...prev, ...newTags])].slice(0, 8));
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error communicating with Gemini backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a descriptive title for this reflection log.');
      return;
    }

    const newEntry: ReflectionEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: user?.uid || 'guest_user',
      title: title.trim(),
      content: content.trim() || 'No additional narrative provided.',
      codeSnippet: codeSnippet.trim() || undefined,
      errorTrace: errorTrace.trim() || undefined,
      architectureNotes: architectureNotes.trim() || undefined,
      tags,
      difficulty,
      aiAnalysis: analysisResult || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveReflection(newEntry);
      setSaveSuccessBanner(true);
      setTimeout(() => setSaveSuccessBanner(false), 3500);
    } catch (err: any) {
      setErrorMessage('Failed to persist reflection: ' + (err?.message || String(err)));
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setContent('');
    setCodeSnippet('');
    setErrorTrace('');
    setArchitectureNotes('');
    setTags(['TypeScript']);
    setDifficulty('moderate');
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner with Quick Presets */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-slate-800 border border-slate-700 text-indigo-400">
              <Code2 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              Multi-Format Technical Reflection Studio
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                ACTIVE PIPELINE
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Log stack traces, code diffs, &amp; architectural invariants to generate automated Gemini diagnostics.
          </p>
        </div>

        {/* Preset Templates */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/80">
            👉 START HERE:
          </span>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleApplyTemplate(tpl)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070B14] hover:bg-slate-800 border border-indigo-900/60 hover:border-indigo-500 text-xs font-mono text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Loaded Interactive Guidance */}
      {presetLoadedHint && (
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-indigo-950/50 border border-indigo-800/80 text-indigo-200 text-xs font-mono animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{presetLoadedHint}</span>
          </div>
          <button
            onClick={() => setPresetLoadedHint(null)}
            className="text-indigo-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>[DIAGNOSTIC ERROR]: {errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveSuccessBanner && (
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 text-xs font-mono animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>[FIRESTORE COMMIT]: Reflection log persisted successfully with ABAC isolation.</span>
          </div>
          <button onClick={() => setSaveSuccessBanner(false)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Input Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
          {/* Title & Difficulty */}
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Session Title / Bug Spec</span>
                  <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] font-mono text-slate-500">REQUIRED</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Memory Leak in Async Firestore Listener or Docker Build Multi-stage Optimization"
                className="w-full px-3.5 py-2 rounded-lg bg-[#070B14] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 font-mono outline-none transition-all"
              />
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Severity / Complexity Class
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'trivial', label: 'Trivial', color: 'hover:border-emerald-500/50 text-emerald-400' },
                  { id: 'moderate', label: 'Moderate', color: 'hover:border-sky-500/50 text-sky-400' },
                  { id: 'complex', label: 'Complex', color: 'hover:border-amber-500/50 text-amber-400' },
                  { id: 'blocker', label: 'Blocker', color: 'hover:border-rose-500/50 text-rose-400' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDifficulty(item.id as DifficultyLevel)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-semibold capitalize transition-all cursor-pointer text-center ${
                      difficulty === item.id
                        ? 'bg-slate-800 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                        : `bg-[#070B14] border-slate-800 text-slate-400 ${item.color}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Multi-Format Input Tabs */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
              <span className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Technical Context Buffers
              </span>

              {/* Pill Tabs */}
              <div className="flex items-center gap-1 bg-[#070B14] p-1 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveFormat('reflection')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeFormat === 'reflection'
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFormat('code')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeFormat === 'code'
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3 h-3" />
                  <span>Code {codeSnippet.trim() && '•'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFormat('error')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeFormat === 'error'
                      ? 'bg-rose-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3 h-3 text-rose-300" />
                  <span>Stack Trace {errorTrace.trim() && '•'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFormat('architecture')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeFormat === 'architecture'
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Arch Spec {architectureNotes.trim() && '•'}</span>
                </button>
              </div>
            </div>

            {/* Input Panels */}
            <div className="mt-3">
              {activeFormat === 'reflection' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Troubleshooting narrative, mental model breakthroughs, or documentation references:</span>
                    <span>{content.length} chars</span>
                  </div>
                  <textarea
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe the obstacle, debugging hypothesis, and architectural lesson learned..."
                    className="w-full p-3.5 rounded-lg bg-[#070B14] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 font-sans outline-none leading-relaxed resize-y"
                  />
                </div>
              )}

              {activeFormat === 'code' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Source code snippet, minimal reproduction, or patch:</span>
                    <span>{codeSnippet.length} chars</span>
                  </div>
                  <textarea
                    rows={6}
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    placeholder={`// Paste TypeScript, Python, Go, or SQL snippet\nconst querySnapshot = await getDocs(userScopedQuery);`}
                    className="w-full p-3.5 rounded-lg bg-[#070B14] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm font-mono text-emerald-300 placeholder:text-slate-600 outline-none leading-relaxed resize-y"
                  />
                </div>
              )}

              {activeFormat === 'error' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-rose-300/80">
                    <span>Terminal stderr, compiler diagnostic, or runtime stack trace:</span>
                    <span>{errorTrace.length} chars</span>
                  </div>
                  <textarea
                    rows={6}
                    value={errorTrace}
                    onChange={(e) => setErrorTrace(e.target.value)}
                    placeholder="UnhandledPromiseRejection: Error at /src/index.ts:42:15..."
                    className="w-full p-3.5 rounded-lg bg-[#070B14] border border-rose-900/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-xs sm:text-sm font-mono text-rose-300 placeholder:text-rose-900/60 outline-none leading-relaxed resize-y"
                  />
                </div>
              )}

              {activeFormat === 'architecture' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>System invariants, latency budgets, or trade-offs:</span>
                    <span>{architectureNotes.length} chars</span>
                  </div>
                  <textarea
                    rows={6}
                    value={architectureNotes}
                    onChange={(e) => setArchitectureNotes(e.target.value)}
                    placeholder="Trade-off: Chose optimistic client updates with rollback to minimize perceived latency on mobile networks."
                    className="w-full p-3.5 rounded-lg bg-[#070B14] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 outline-none leading-relaxed resize-y"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags Section */}
          <div className="pt-2 space-y-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Technology Stack Tags ({tags.length}/8)
              </label>
              <form onSubmit={handleAddCustomTag} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="+ Custom tag"
                  className="px-2.5 py-1 rounded-md bg-[#070B14] border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!customTagInput.trim()}
                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map((t) => {
                const isSelected = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`px-2 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-[#070B14] border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
              {tags
                .filter((t) => !COMMON_TAGS.includes(t))
                .map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className="hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
            >
              [Clear Form]
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold shadow-md shadow-indigo-900/30 border border-indigo-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Gemini Deconstructing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Deep AI Analysis</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold shadow-md shadow-emerald-900/30 border border-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Commit Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis & Diagnostic Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20 min-h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-slate-800 border border-slate-700 text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                    Gemini Diagnostic Telemetry
                  </h3>
                  {analysisModel && (
                    <span className="text-[10px] text-indigo-400 font-mono">
                      ENGINE: {analysisModel}
                    </span>
                  )}
                </div>
              </div>
              {analysisResult && (
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-semibold">
                  SYNTHESIZED
                </span>
              )}
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-80 space-y-3 text-center">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-4 h-4 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-mono font-semibold text-slate-200">Deconstructing Debug Pipeline...</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs font-mono">
                    Synthesizing root cause diagnosis, cognitive takeaways, and active-recall topics.
                  </p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-3.5 text-xs text-slate-300 animate-in fade-in duration-300">
                {/* Summary */}
                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-400 block mb-1">
                    [01] Executive Summary
                  </span>
                  <p className="text-slate-200 leading-relaxed font-sans text-xs">{analysisResult.summary}</p>
                </div>

                {/* Root Cause Analysis */}
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    [02] Root Cause Diagnosis
                  </span>
                  <p className="text-rose-200/90 leading-relaxed font-sans text-xs">{analysisResult.rootCauseAnalysis}</p>
                </div>

                {/* Key Takeaways */}
                {analysisResult.keyTakeaways?.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-1.5">
                      <Lightbulb className="w-3 h-3" />
                      [03] Engineering Invariants &amp; Takeaways
                    </span>
                    <ul className="space-y-1.5 font-sans text-xs">
                      {analysisResult.keyTakeaways.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {analysisResult.actionItems?.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <ArrowRight className="w-3 h-3" />
                      [04] Actionable Remediation Steps
                    </span>
                    <ul className="space-y-1.5 font-sans text-xs">
                      {analysisResult.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Underlying Concept */}
                {analysisResult.conceptExplanation && (
                  <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-1">
                      <HelpCircle className="w-3 h-3" />
                      [05] Underlying Architectural Mechanism
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs font-sans">
                      {analysisResult.conceptExplanation}
                    </p>
                  </div>
                )}

                {/* Direct Commit Action from AI Panel */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold shadow-md shadow-emerald-900/30 border border-emerald-500 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Commit Analyzed Reflection to Firestore</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-center text-slate-500 space-y-2.5 font-mono">
                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 text-slate-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Awaiting Log Ingestion</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                    Fill in your coding notes or stack trace and trigger <strong className="text-indigo-400">Deep AI Analysis</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Syntax Highlight Preview of current snippet/error */}
          {codeSnippet && (
            <CodeBlock code={codeSnippet} language="typescript" title="Buffer: Code Snippet" />
          )}
          {errorTrace && (
            <CodeBlock code={errorTrace} language="bash" title="Buffer: Stack Trace" isError={true} />
          )}
        </div>
      </div>
    </div>
  );
};
