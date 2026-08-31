import React, { useState, useEffect } from 'react';
import {
  History,
  Sparkles,
  TrendingUp,
  Award,
  Search,
  Tag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  RefreshCw,
  Code2,
  Terminal,
  Layers,
  Flame,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { ReflectionEntry, MasteryReport, UserProfile } from '../types.js';
import { CodeBlock } from './CodeBlock.js';

interface MasteryDashboardProps {
  user: UserProfile | null;
  reflections: ReflectionEntry[];
  masteryReports: MasteryReport[];
  onDeleteReflection: (id: string) => Promise<void>;
  onSaveMasteryReport: (report: MasteryReport) => Promise<void>;
}

export const MasteryDashboard: React.FC<MasteryDashboardProps> = ({
  reflections,
  masteryReports,
  onDeleteReflection,
  onSaveMasteryReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Weekly report generation state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentReport, setCurrentReport] = useState<MasteryReport | null>(
    masteryReports[0] || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize currentReport if masteryReports loads or updates
  useEffect(() => {
    if (!currentReport && masteryReports.length > 0) {
      setCurrentReport(masteryReports[0]);
    }
  }, [masteryReports, currentReport]);

  // Compute tag breakdown metrics
  const tagCounts: { [tag: string]: number } = {};
  reflections.forEach((r) => {
    (r.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // Compute difficulty distribution
  const difficultyCounts = {
    trivial: reflections.filter((r) => r.difficulty === 'trivial').length,
    moderate: reflections.filter((r) => r.difficulty === 'moderate').length,
    complex: reflections.filter((r) => r.difficulty === 'complex').length,
    blocker: reflections.filter((r) => r.difficulty === 'blocker').length,
  };

  // Filtered reflection list
  const filteredReflections = reflections.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      selectedTagFilter === 'all' || (r.tags && r.tags.includes(selectedTagFilter));

    const matchesDiff =
      selectedDifficultyFilter === 'all' || r.difficulty === selectedDifficultyFilter;

    return matchesSearch && matchesTag && matchesDiff;
  });

  const handleGenerateWeeklyReport = async () => {
    if (reflections.length === 0) {
      setErrorMessage('Please log at least one reflection entry before generating a weekly mastery report.');
      return;
    }

    setIsGeneratingReport(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/mastery/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflections,
          timeframe: 'Weekly Progress Cycle',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to synthesize weekly mastery report.');
      }

      const newReport: MasteryReport = {
        id: 'report_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: reflections[0]?.userId || 'user',
        weekStartDate: data.report?.weekStartDate || new Date().toISOString(),
        totalReflections: reflections.length,
        topSkills: data.report?.topSkills || [],
        executiveSummary: data.report?.executiveSummary || '',
        keyWins: data.report?.keyWins || [],
        actionPlan: data.report?.actionPlan || [],
        createdAt: new Date().toISOString(),
      };

      setCurrentReport(newReport);
      await onSaveMasteryReport(newReport);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error communicating with Gemini backend.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ reflections, masteryReports }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `lenggo_developer_reflections_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-slate-800 border border-slate-700 text-indigo-400">
              <History className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              Skill Mastery &amp; Historical Archives
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                PERSISTENT TELEMETRY
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Track problem-solving velocity, inspect AI-curated technology mastery metrics, and browse past debug logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportData}
            disabled={reflections.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070B14] hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono font-semibold disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleGenerateWeeklyReport}
            disabled={isGeneratingReport || reflections.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold shadow-md shadow-indigo-900/30 border border-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isGeneratingReport ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Generate Weekly AI Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs font-mono flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>[REPORT ERROR]: {errorMessage}</span>
        </div>
      )}

      {/* Analytics Overview Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-2">
            <span className="font-semibold uppercase tracking-wider">Total Reflections</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{reflections.length}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Logged sessions in Firestore</p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-2">
            <span className="font-semibold uppercase tracking-wider">Unique Tech Stacks</span>
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{sortedTags.length}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Active skill domains</p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-2">
            <span className="font-semibold uppercase tracking-wider">Blockers Overcome</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {difficultyCounts.blocker + difficultyCounts.complex}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Complex/Blocker hurdles solved</p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-2">
            <span className="font-semibold uppercase tracking-wider">AI Reports Generated</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{masteryReports.length}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Weekly growth milestones</p>
        </div>
      </div>

      {/* Weekly Skill Mastery Report Section */}
      {currentReport && (
        <div className="p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-md bg-slate-800 border border-slate-700 text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                  Weekly AI Skill Mastery Report
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Calendar className="w-3 h-3" />
                  Period: {currentReport.weekStartDate} • Analyzed {currentReport.totalReflections} logs
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-semibold uppercase">
              GEMINI SYNTHESIZED
            </span>
          </div>

          {/* Executive Summary */}
          <div className="p-3.5 rounded-lg bg-[#070B14] border border-slate-800">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 block mb-1">
              [01] Executive Growth Summary
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {currentReport.executiveSummary}
            </p>
          </div>

          {/* Top Skills Grid */}
          {currentReport.topSkills?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                Skill Trajectory Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentReport.topSkills.map((sk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-[#070B14] border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-xs text-white flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        {sk.skill}
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border ${
                          sk.proficiencyTrend === 'improving'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : sk.proficiencyTrend === 'steady'
                            ? 'bg-sky-950 text-sky-300 border-sky-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {sk.proficiencyTrend.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1 font-sans">
                      <p>
                        <strong className="text-slate-400 font-mono text-[10px]">STRENGTH:</strong> {sk.strengths}
                      </p>
                      <p>
                        <strong className="text-slate-400 font-mono text-[10px]">FOCUS AREA:</strong> {sk.growthAreas}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Wins & Action Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentReport.keyWins?.length > 0 && (
              <div className="p-3.5 rounded-lg bg-[#070B14] border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Key Debugging Wins
                </span>
                <ul className="space-y-1 text-xs text-slate-300 font-sans">
                  {currentReport.keyWins.map((win, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentReport.actionPlan?.length > 0 && (
              <div className="p-3.5 rounded-lg bg-[#070B14] border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  Recommended Next Steps
                </span>
                <ul className="space-y-1 text-xs text-slate-300 font-sans">
                  {currentReport.actionPlan.map((step, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Reflections List */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2 uppercase tracking-wider">
            <span>Historical Log Entries</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              [{filteredReflections.length} / {reflections.length}]
            </span>
          </h3>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter logs & code..."
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Tag Filter */}
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 text-xs font-mono text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">All Tags</option>
              {sortedTags.map(([tag, count]) => (
                <option key={tag} value={tag}>
                  #{tag} ({count})
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficultyFilter}
              onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 text-xs font-mono text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="trivial">Trivial</option>
              <option value="moderate">Moderate</option>
              <option value="complex">Complex</option>
              <option value="blocker">Blocker</option>
            </select>
          </div>
        </div>

        {/* Logs List */}
        {filteredReflections.length > 0 ? (
          <div className="space-y-2.5">
            {filteredReflections.map((entry) => {
              const isExpanded = expandedLogId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${
                            entry.difficulty === 'blocker'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : entry.difficulty === 'complex'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : entry.difficulty === 'moderate'
                              ? 'bg-sky-950 text-sky-300 border-sky-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {entry.difficulty}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {entry.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {(entry.tags || []).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#070B14] text-slate-400 border border-slate-800"
                          >
                            #{t}
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-500 font-mono ml-2">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Collapse' : 'Inspect'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => onDeleteReflection(entry.id)}
                        className="p-1 rounded-md bg-[#070B14] hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Snippet preview */}
                  {!isExpanded && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed font-sans">
                      {entry.aiAnalysis?.summary || entry.content}
                    </p>
                  )}

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-3.5 animate-in fade-in text-xs">
                      {/* Reflection Content */}
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Problem &amp; Resolution Notes:
                        </span>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                          {entry.content}
                        </p>
                      </div>

                      {/* Code Snippet */}
                      {entry.codeSnippet && (
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
                            <Code2 className="w-3.5 h-3.5" />
                            Attached Code Snippet
                          </span>
                          <CodeBlock code={entry.codeSnippet} language="typescript" />
                        </div>
                      )}

                      {/* Error Trace */}
                      {entry.errorTrace && (
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-1">
                            <Terminal className="w-3.5 h-3.5" />
                            Attached Stack Trace
                          </span>
                          <CodeBlock code={entry.errorTrace} language="bash" isError={true} />
                        </div>
                      )}

                      {/* Architecture Notes */}
                      {entry.architectureNotes && (
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-1">
                            <Layers className="w-3.5 h-3.5" />
                            Architectural Invariants &amp; Trade-offs
                          </span>
                          <p className="text-slate-300 leading-relaxed bg-[#070B14] p-3 rounded-lg border border-slate-800 font-sans">
                            {entry.architectureNotes}
                          </p>
                        </div>
                      )}

                      {/* AI Root Cause & Takeaways */}
                      {entry.aiAnalysis && (
                        <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Gemini AI Diagnostic Takeaways
                          </span>
                          <p className="text-slate-300 font-sans">
                            <strong className="text-rose-400 font-mono text-[10px]">ROOT CAUSE:</strong>{' '}
                            {entry.aiAnalysis.rootCauseAnalysis}
                          </p>
                          {entry.aiAnalysis.keyTakeaways?.length > 0 && (
                            <ul className="space-y-1 list-disc list-inside text-slate-300 font-sans">
                              {entry.aiAnalysis.keyTakeaways.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 rounded-xl bg-[#0B0F19] border border-slate-800 text-center text-slate-500 space-y-2 font-mono">
            <Search className="w-6 h-6 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300 uppercase">No matching reflections found</p>
            <p className="text-[11px] text-slate-500 font-sans">
              {searchQuery || selectedTagFilter !== 'all' || selectedDifficultyFilter !== 'all'
                ? 'Try clearing your search or filters.'
                : 'Log your first reflection in the Daily Debugger to build your knowledge archive!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
