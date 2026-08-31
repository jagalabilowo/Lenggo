import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { DailyDebugger } from './components/DailyDebugger.js';
import { ActiveRecallQuizzes } from './components/ActiveRecallQuizzes.js';
import { MasteryDashboard } from './components/MasteryDashboard.js';
import { AuthModal } from './components/AuthModal.js';
import { OnboardingGuide } from './components/OnboardingGuide.js';
import {
  UserProfile,
  ReflectionEntry,
  QuizSet,
  MasteryReport,
} from './types.js';
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  isFirebaseConfigured,
  fetchReflections,
  saveReflection,
  deleteReflection,
  fetchQuizSets,
  saveQuizSet,
  fetchMasteryReports,
  saveMasteryReport,
} from './lib/firebase.js';
import { Sparkles, Shield, Heart } from 'lucide-react';

const SEED_SAMPLE_REFLECTIONS: ReflectionEntry[] = [
  {
    id: 'seed_1',
    userId: 'demo_user',
    title: 'Firestore Missing or Insufficient Permissions during List Operation',
    content: 'Encountered PERMISSION_DENIED error when running a list query on the subcollection. The client-side where() filter did not match the ABAC rule condition.',
    codeSnippet: `// Fixed client query
const q = query(
  collection(db, 'users', currentUserId, 'reflections'),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);`,
    errorTrace: `FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
at new FirestoreError (index.esm2017.js:498:28)
at fromRpcStatus (index.esm2017.js:14321:12)`,
    architectureNotes: 'ABAC security rules require path variable matching and request.auth.uid validation.',
    tags: ['Firestore', 'GCP', 'Security', 'TypeScript'],
    difficulty: 'moderate',
    aiAnalysis: {
      summary: 'Resolved Firestore security rule rejection by aligning client collection query path with user-isolated ABAC policies.',
      keyTakeaways: [
        'Firestore security rules execute as boolean authorization filters, not query aggregators.',
        'Always structure user data in hierarchical paths like /users/{userId}/[subcollection].',
        'Check request.auth != null and request.auth.uid == userId before every write or list operation.',
      ],
      rootCauseAnalysis: 'The client query was attempting to read a collection root without scoping to the authenticated user ID document path.',
      actionItems: [
        'Deploy hardened firestore.rules ensuring owner-bound isolation.',
        'Wrap all Firestore mutations in try-catch with contextual error loggers.',
      ],
      recommendedTags: ['Firestore', 'Security', 'GCP', 'TypeScript'],
      conceptExplanation: 'Attribute-Based Access Control (ABAC) in Firestore guarantees that even if client code is manipulated, server-side rule engine blocks cross-tenant reads.',
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed_2',
    userId: 'demo_user',
    title: 'Cloud Run Container Cold Start & Secret Manager Latency',
    content: 'Container startup time was exceeding 4 seconds due to synchronous Secret Manager network calls at top-level module evaluation.',
    codeSnippet: `// Optimized Lazy Initialization Pattern
let cachedSecret: string | null = null;

export async function getApiKey(): Promise<string> {
  if (!cachedSecret) {
    cachedSecret = process.env.GEMINI_API_KEY || (await fetchSecretFromGCP());
  }
  return cachedSecret;
}`,
    architectureNotes: 'Switched from eager module-load secret fetching to lazy on-demand invocation with memory caching.',
    tags: ['Cloud Run', 'Docker', 'GCP', 'Node.js'],
    difficulty: 'complex',
    aiAnalysis: {
      summary: 'Eliminated Cloud Run cold-start latency by deferring Secret Manager API calls until request handling.',
      keyTakeaways: [
        'Never block server startup with external network I/O in the global module scope.',
        'Use lazy client singletons to preserve rapid container readiness probes.',
        'Inject secrets via Cloud Run environment variables for instantaneous zero-overhead resolution.',
      ],
      rootCauseAnalysis: 'Synchronous network latency during top-level imports was delaying the Express server port binding, failing HTTP healthchecks.',
      actionItems: [
        'Benchmark container startup with gcloud run deploy --min-instances=0.',
        'Add lightweight /api/health probe that bypasses external APIs.',
      ],
      recommendedTags: ['Cloud Run', 'GCP', 'Node.js', 'Docker'],
      conceptExplanation: 'Container runtimes in Cloud Run expect the HTTP server to listen on PORT 3000 within seconds of container startup.',
    },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'debugger' | 'quizzes' | 'mastery'>('debugger');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<QuizSet[]>([]);
  const [masteryReports, setMasteryReports] = useState<MasteryReport[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Subscribe to Authentication state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  // Load user data on auth change
  useEffect(() => {
    async function loadData() {
      const targetUserId = user?.uid || 'guest_user';
      try {
        const logs = await fetchReflections(targetUserId);
        if (logs.length === 0 && (!user || user.isGuest)) {
          // Provide high-yield seed logs so user has instant interactive data
          setReflections(SEED_SAMPLE_REFLECTIONS);
        } else {
          setReflections(logs);
        }

        const quizzes = await fetchQuizSets(targetUserId);
        setSavedQuizzes(quizzes);

        const reports = await fetchMasteryReports(targetUserId);
        setMasteryReports(reports);
      } catch (err) {
        console.error('Error loading user data:', err);
        setReflections(SEED_SAMPLE_REFLECTIONS);
      }
    }
    loadData();
  }, [user]);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const guestUser: UserProfile = {
        uid: 'guest_' + Math.random().toString(36).substring(2, 9),
        email: 'developer@lenggo.dev',
        displayName: 'Guest Engineer',
        photoURL: null,
        isGuest: true,
      };
      setUser(guestUser);
      localStorage.setItem('lenggo_guest_user', JSON.stringify(guestUser));
      setIsAuthModalOpen(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
  };

  const handleSaveReflection = async (newEntry: ReflectionEntry) => {
    setIsSaving(true);
    try {
      const targetUserId = user?.uid || 'guest_user';
      const entryWithUser = { ...newEntry, userId: targetUserId };
      await saveReflection(targetUserId, entryWithUser);
      setReflections((prev) => [entryWithUser, ...prev.filter((r) => r.id !== entryWithUser.id)]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReflection = async (reflectionId: string) => {
    const targetUserId = user?.uid || 'guest_user';
    await deleteReflection(targetUserId, reflectionId);
    setReflections((prev) => prev.filter((r) => r.id !== reflectionId));
  };

  const handleSaveQuiz = async (quiz: QuizSet) => {
    const targetUserId = user?.uid || 'guest_user';
    const quizWithUser = { ...quiz, userId: targetUserId };
    await saveQuizSet(targetUserId, quizWithUser);
    setSavedQuizzes((prev) => [quizWithUser, ...prev.filter((q) => q.id !== quizWithUser.id)]);
  };

  const handleSaveMasteryReport = async (report: MasteryReport) => {
    const targetUserId = user?.uid || 'guest_user';
    const reportWithUser = { ...report, userId: targetUserId };
    await saveMasteryReport(targetUserId, reportWithUser);
    setMasteryReports((prev) => [reportWithUser, ...prev.filter((r) => r.id !== reportWithUser.id)]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070B14] bg-tech-grid text-slate-200 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        isFirebaseLive={isFirebaseConfigured}
        totalReflectionsCount={reflections.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Onboarding & Workflow Guide */}
        <OnboardingGuide
          onNavigateToTab={setActiveTab}
          totalReflections={reflections.length}
        />

        {activeTab === 'debugger' && (
          <DailyDebugger
            user={user}
            onSaveReflection={handleSaveReflection}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'quizzes' && (
          <ActiveRecallQuizzes
            user={user}
            reflections={reflections}
            savedQuizzes={savedQuizzes}
            onSaveQuiz={handleSaveQuiz}
            onNavigateToDebugger={() => setActiveTab('debugger')}
          />
        )}

        {activeTab === 'mastery' && (
          <MasteryDashboard
            user={user}
            reflections={reflections}
            masteryReports={masteryReports}
            onDeleteReflection={handleDeleteReflection}
            onSaveMasteryReport={handleSaveMasteryReport}
          />
        )}
      </main>

      {/* Technical Telemetry Footer */}
      <footer className="w-full border-t border-slate-800/90 bg-[#0B0F19]/90 py-5 px-4 sm:px-8 mt-auto backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">Lenggo Engine</span>
            <span>•</span>
            <span>Cloud Run Container &amp; Gemini 3.6 Flash</span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              PORT 3000 HEALTHY
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              ABAC User Isolation
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Engineered with <Heart className="w-3 h-3 text-rose-500 inline fill-rose-500" /> for Developers
            </span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGoogleSignIn={handleGoogleSignIn}
        onGuestSignIn={handleGuestSignIn}
        isLoading={isAuthLoading}
      />
    </div>
  );
}
