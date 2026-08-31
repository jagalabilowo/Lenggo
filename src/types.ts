export type DifficultyLevel = 'trivial' | 'moderate' | 'complex' | 'blocker';

export type InputFormatType = 'reflection' | 'code' | 'error_trace' | 'architecture';

export interface AIAnalysisResult {
  summary: string;
  keyTakeaways: string[];
  rootCauseAnalysis: string;
  actionItems: string[];
  recommendedTags: string[];
  conceptExplanation?: string;
}

export interface ReflectionEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  codeSnippet?: string;
  errorTrace?: string;
  architectureNotes?: string;
  tags: string[];
  difficulty: DifficultyLevel;
  aiAnalysis?: AIAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

export interface QuizCard {
  id: string;
  question: string;
  codeContext?: string;
  sampleAnswer: string;
  userAnswer?: string;
  feedback?: string;
  score?: number; // 0-100
  mastered?: boolean;
}

export interface QuizSet {
  id: string;
  userId: string;
  title: string;
  sourceReflectionIds?: string[];
  cards: QuizCard[];
  createdAt: string;
}

export interface SkillMasteryItem {
  skill: string;
  count: number;
  proficiencyTrend: 'improving' | 'steady' | 'needs_reinforcement';
  strengths: string;
  growthAreas: string;
}

export interface MasteryReport {
  id: string;
  userId: string;
  weekStartDate: string;
  totalReflections: number;
  topSkills: SkillMasteryItem[];
  executiveSummary: string;
  keyWins: string[];
  actionPlan: string[];
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}
