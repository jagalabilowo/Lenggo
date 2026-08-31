import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Send,
  Award,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Zap,
  Tag,
  BookOpen,
} from 'lucide-react';
import { QuizSet, QuizCard, ReflectionEntry, UserProfile } from '../types.js';
import { CodeBlock } from './CodeBlock.js';

interface ActiveRecallQuizzesProps {
  user: UserProfile | null;
  reflections: ReflectionEntry[];
  savedQuizzes: QuizSet[];
  onSaveQuiz: (quiz: QuizSet) => Promise<void>;
  onNavigateToDebugger: () => void;
}

export const ActiveRecallQuizzes: React.FC<ActiveRecallQuizzesProps> = ({
  user,
  reflections,
  savedQuizzes,
  onSaveQuiz,
  onNavigateToDebugger,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizSet | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [cardId: string]: string }>({});
  const [evaluations, setEvaluations] = useState<{
    [cardId: string]: { score: number; feedback: string; mastered: boolean; reminder?: string };
  }>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSampleAnswer, setShowSampleAnswer] = useState<{ [cardId: string]: boolean }>({});

  // Unique tags extracted from reflections
  const availableTags = Array.from(
    new Set(reflections.flatMap((r) => r.tags || []).filter(Boolean))
  );

  const handleGenerateQuiz = async () => {
    let sourceReflections = reflections;
    if (selectedTag !== 'all') {
      sourceReflections = reflections.filter((r) => r.tags?.includes(selectedTag));
    }

    if (sourceReflections.length === 0) {
      setErrorMessage(
        `No reflections found for tag "${selectedTag}". Log some study notes in the Daily Debugger first!`
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setEvaluations({});
    setUserAnswers({});
    setShowSampleAnswer({});
    setActiveCardIndex(0);

    try {
      const response = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflections: sourceReflections,
          focusTopic: selectedTag !== 'all' ? selectedTag : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate active recall quiz.');
      }

      const generatedSet: QuizSet = {
        id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: user?.uid || 'guest_user',
        title: data.quiz?.title || `Active Recall Quiz (${selectedTag})`,
        sourceReflectionIds: sourceReflections.map((r) => r.id),
        cards: data.quiz?.cards || [],
        createdAt: new Date().toISOString(),
      };

      setCurrentQuiz(generatedSet);
      await onSaveQuiz(generatedSet);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error generating quiz with Gemini backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluateAnswer = async (card: QuizCard) => {
    const answer = userAnswers[card.id]?.trim();
    if (!answer) {
      setErrorMessage('Please type your answer before requesting AI evaluation.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/quizzes/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.question,
          codeContext: card.codeContext,
          sampleAnswer: card.sampleAnswer,
          userAnswer: answer,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate answer.');
      }

      const evalData = data.evaluation;
      setEvaluations((prev) => ({
        ...prev,
        [card.id]: {
          score: evalData.score,
          feedback: evalData.feedback,
          mastered: evalData.mastered,
          reminder: evalData.keyConceptReminder,
        },
      }));

      // Update quiz state in Firestore
      if (currentQuiz) {
        const updatedCards = currentQuiz.cards.map((c) =>
          c.id === card.id
            ? {
                ...c,
                userAnswer: answer,
                score: evalData.score,
                feedback: evalData.feedback,
                mastered: evalData.mastered,
              }
            : c
        );
        const updatedQuiz = { ...currentQuiz, cards: updatedCards };
        setCurrentQuiz(updatedQuiz);
        await onSaveQuiz(updatedQuiz);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error evaluating quiz answer.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const activeCard = currentQuiz?.cards[activeCardIndex];
  const activeEval = activeCard ? evaluations[activeCard.id] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-slate-800 border border-slate-700 text-indigo-400">
              <BrainCircuit className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              Active-Recall Flashcard Engine
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                RETRIEVAL VERIFICATION
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            AI synthesizes high-yield retrieval questions from your stored Firestore reflection logs to solidify conceptual mastery.
          </p>
        </div>

        {/* Generator Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 text-xs font-mono">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B0F19] text-slate-200">
                All Topics ({reflections.length} logs)
              </option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag} className="bg-[#0B0F19] text-slate-200">
                  #{tag} ({reflections.filter((r) => r.tags?.includes(tag)).length})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={isGenerating || reflections.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold shadow-md shadow-indigo-900/30 border border-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Synthesizing Cards...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Synthesize Flashcards</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs font-mono flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>[EVALUATION ERROR]: {errorMessage}</span>
        </div>
      )}

      {/* Main Flashcard Practice Area */}
      {currentQuiz && activeCard ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Card Surface (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-5 sm:p-6 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
              {/* Card Meta & Step Indicator */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-xs font-mono font-bold">
                    CARD {activeCardIndex + 1} OF {currentQuiz.cards.length}
                  </span>
                  <span className="text-xs font-mono text-slate-300">{currentQuiz.title}</span>
                </div>

                {activeEval && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                        activeEval.score >= 80
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : activeEval.score >= 50
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      SCORE: {activeEval.score}/100
                    </span>
                    {activeEval.mastered && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-semibold">
                        <Award className="w-3 h-3 text-indigo-400" />
                        MASTERED
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Question */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
                  <h3 className="text-sm sm:text-base font-semibold text-white leading-relaxed font-sans">
                    {activeCard.question}
                  </h3>
                </div>

                {/* Optional Code Context */}
                {activeCard.codeContext && (
                  <CodeBlock
                    code={activeCard.codeContext}
                    language="typescript"
                    title="Buffer: Code Context / Bug Trigger"
                  />
                )}
              </div>

              {/* Interactive User Answer Box */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                    Your Technical Answer &amp; Mental Model:
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">INPUT BUFFER</span>
                </div>
                <textarea
                  rows={4}
                  value={userAnswers[activeCard.id] || ''}
                  onChange={(e) =>
                    setUserAnswers({
                      ...userAnswers,
                      [activeCard.id]: e.target.value,
                    })
                  }
                  placeholder="Recall and describe why the bug occurs, what architectural invariant prevents it, or how to resolve it..."
                  className="w-full p-3.5 rounded-lg bg-[#070B14] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 outline-none resize-y leading-relaxed font-sans"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setShowSampleAnswer({
                        ...showSampleAnswer,
                        [activeCard.id]: !showSampleAnswer[activeCard.id],
                      })
                    }
                    className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>[{showSampleAnswer[activeCard.id] ? 'Hide' : 'Reveal'} Reference Answer]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEvaluateAnswer(activeCard)}
                    disabled={isEvaluating || !userAnswers[activeCard.id]?.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold shadow-md shadow-indigo-900/30 border border-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Grading with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for AI Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Reference Answer Reveal */}
              {showSampleAnswer[activeCard.id] && (
                <div className="mt-4 p-3.5 rounded-lg bg-[#070B14] border border-slate-800 animate-in fade-in">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    [REFERENCE SPEC / MODEL SOLUTION]:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                    {activeCard.sampleAnswer}
                  </p>
                </div>
              )}

              {/* Live AI Grading Feedback */}
              {activeEval && (
                <div className="mt-4 p-4 rounded-lg bg-[#070B14] border border-slate-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Telemetry &amp; Critique
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {activeEval.score} / 100
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeEval.feedback}
                  </p>
                  {activeEval.reminder && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300/90 font-mono">
                      💡 <strong>RETENTION INVARIANT:</strong> {activeEval.reminder}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-5">
                <button
                  onClick={() => setActiveCardIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeCardIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous Card
                </button>

                <div className="flex items-center gap-1.5">
                  {currentQuiz.cards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCardIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        activeCardIndex === i
                          ? 'bg-indigo-500 scale-125'
                          : evaluations[currentQuiz.cards[i].id]
                          ? 'bg-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                      title={`Card ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() =>
                    setActiveCardIndex((prev) => Math.min(currentQuiz.cards.length - 1, prev + 1))
                  }
                  disabled={activeCardIndex === currentQuiz.cards.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono disabled:opacity-40 cursor-pointer"
                >
                  Next Card
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Active Quiz Overview (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 sm:p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Retrieval Performance Grid
              </h4>

              <div className="space-y-2">
                {currentQuiz.cards.map((c, idx) => {
                  const ev = evaluations[c.id];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveCardIndex(idx)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        activeCardIndex === idx
                          ? 'bg-slate-900 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-[#070B14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold text-slate-200">#0{idx + 1} Question</span>
                        {ev ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              ev.score >= 80 ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'
                            }`}
                          >
                            {ev.score}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">PENDING</span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-slate-400 font-sans text-xs">{c.question}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Saved Quizzes History */}
            {savedQuizzes.length > 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#0B0F19] border border-slate-800 shadow-xl shadow-black/20">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Historical Quizzes ({savedQuizzes.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {savedQuizzes.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuiz(q);
                        setActiveCardIndex(0);
                      }}
                      className="w-full text-left p-2.5 rounded-lg bg-[#070B14] hover:bg-slate-900 border border-slate-800 text-xs font-mono transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate font-medium text-slate-300">{q.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 rounded-xl bg-[#0B0F19] border border-slate-800 text-center space-y-3.5 shadow-xl font-mono">
          <div className="p-3.5 rounded-xl bg-[#070B14] border border-slate-800 text-indigo-400">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Active Flashcard Session</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
              {reflections.length === 0 ? (
                <>
                  No reflection logs found. Switch to the{' '}
                  <strong className="text-indigo-400">Daily Debugger</strong> to document a coding obstacle or stack trace.
                </>
              ) : (
                <>
                  Found <strong className="text-indigo-400 font-mono">{reflections.length}</strong> reflection entries logged in Firestore. Trigger{' '}
                  <strong className="text-indigo-300 font-mono">Synthesize Flashcards</strong> above to test your mental models.
                </>
              )}
            </p>
          </div>

          {reflections.length === 0 ? (
            <button
              onClick={onNavigateToDebugger}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold shadow-md shadow-indigo-900/30 border border-indigo-500 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Go to Daily Debugger</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold shadow-md shadow-indigo-900/30 border border-indigo-500 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Quiz Now</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
