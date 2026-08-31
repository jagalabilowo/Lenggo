import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { generateContentWithFallback, Type } from './server/gemini.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Helper to strip markdown codeblocks before JSON parsing
function cleanJsonString(str: string): string {
  if (!str) return '{}';
  return str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck endpoint for Cloud Run and automated monitors
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Lenggo API Engine',
    timestamp: new Date().toISOString(),
    aiEngine: 'Gemini 1.5/Flash Hybrid Architecture',
  });
});

/**
 * 2. POST /api/reflections/analyze
 * Analyzes developer reflections, error stack traces, and code snippets
 */
app.post('/api/reflections/analyze', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const {
      title = '',
      content = '',
      codeSnippet = '',
      errorTrace = '',
      architectureNotes = '',
      difficulty = 'moderate',
      tags = [],
    } = body;

    if (!title.trim() && !content.trim() && !errorTrace.trim() && !codeSnippet.trim()) {
      res.status(400).json({ error: 'Please provide at least a title, reflection content, error trace, or code snippet.' });
      return;
    }

    const promptPayload = `
Analyze this developer learning and debugging reflection:
Title: ${title}
Difficulty: ${difficulty}
Existing Tags: ${Array.isArray(tags) ? tags.join(', ') : ''}

Reflection & Context:
${content}

${codeSnippet ? `Code Snippet:\n\`\`\`\n${codeSnippet}\n\`\`\`` : ''}
${errorTrace ? `Error Trace / Logs:\n\`\`\`\n${errorTrace}\n\`\`\`` : ''}
${architectureNotes ? `Architecture Notes:\n\`\`\`\n${architectureNotes}\n\`\`\`` : ''}

Provide a deep pedagogical breakdown for the developer. Include:
1. summary: Concise 2-sentence summary of the obstacle and resolution.
2. keyTakeaways: 3 to 5 actionable engineering takeaways.
3. rootCauseAnalysis: Clear technical diagnosis of why the bug occurred or why the architectural decision mattered.
4. actionItems: 2 to 4 proactive best practices (e.g. tests to write, linter rules to enable, docs to review).
5. recommendedTags: Suggested technology/domain tags (e.g. "TypeScript", "Docker", "Firestore", "Async/Await").
6. conceptExplanation: In-depth explanation of the underlying computer science or framework mechanism.
`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: promptPayload,
      systemInstruction: 'You are Lenggo, a Senior Principal Software Architect and pedagogical mentor. You provide empathetic, accurate, and deeply technical analysis of debugging sessions and study logs. Format your output strictly in the requested JSON schema.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyTakeaways: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          rootCauseAnalysis: { type: Type.STRING },
          actionItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          recommendedTags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          conceptExplanation: { type: Type.STRING },
        },
        required: ['summary', 'keyTakeaways', 'rootCauseAnalysis', 'actionItems', 'recommendedTags'],
      },
    });

    const parsed = JSON.parse(cleanJsonString(text));
    res.json({
      analysis: parsed,
      meta: { modelUsed },
    });
  } catch (error: any) {
    console.error('Error analyzing reflection:', error);
    res.status(500).json({
      error: 'Failed to complete AI reflection analysis. Please try again.',
      details: error?.message || String(error),
    });
  }
});

/**
 * 3. POST /api/quizzes/generate
 * Generates 3-5 active-recall flashcard questions based on user's past reflections
 */
app.post('/api/quizzes/generate', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { reflections = [], focusTopic = '' } = body;

    if (!Array.isArray(reflections) || reflections.length === 0) {
      res.status(400).json({ error: 'Please provide at least one reflection entry to generate active-recall quiz flashcards.' });
      return;
    }

    const reflectionSummaries = reflections.slice(0, 10).map((r: any, idx: number) => `
[Entry ${idx + 1}] Title: ${r.title || 'Untitled'}
Tags: ${Array.isArray(r.tags) ? r.tags.join(', ') : ''}
Content: ${(r.content || '').slice(0, 500)}
${r.codeSnippet ? `Code: ${r.codeSnippet.slice(0, 300)}` : ''}
${r.errorTrace ? `Error: ${r.errorTrace.slice(0, 300)}` : ''}
${r.aiAnalysis?.rootCauseAnalysis ? `Root Cause: ${r.aiAnalysis.rootCauseAnalysis}` : ''}
    `).join('\n---\n');

    const promptPayload = `
Based on these developer logs and debug sessions:
${reflectionSummaries}

${focusTopic ? `Special Focus Topic: ${focusTopic}` : ''}

Generate 3 to 5 high-impact Active-Recall Flashcards to test the developer's understanding of the concepts, root causes, and best practices involved.
Each card should challenge them on *why* something works, *how* to diagnose similar bugs, or *what* pattern to use.

Format output in strict JSON.
`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: promptPayload,
      systemInstruction: 'You are an expert technical interviewer and educator designing active-recall flashcards for software engineers. Questions must be challenging, insightful, and practical.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quizTitle: { type: Type.STRING },
          cards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                codeContext: { type: Type.STRING },
                sampleAnswer: { type: Type.STRING },
              },
              required: ['id', 'question', 'sampleAnswer'],
            },
          },
        },
        required: ['quizTitle', 'cards'],
      },
    });

    const parsed = JSON.parse(cleanJsonString(text));
    // Ensure cards have unique IDs
    const cards = (parsed.cards || []).map((card: any, i: number) => ({
      ...card,
      id: card.id || `card_${Date.now()}_${i}`,
      score: null,
      feedback: null,
      mastered: false,
    }));

    res.json({
      quiz: {
        title: parsed.quizTitle || 'Active Recall Quiz Session',
        cards,
      },
      meta: { modelUsed },
    });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      error: 'Failed to generate active recall quiz flashcards.',
      details: error?.message || String(error),
    });
  }
});

/**
 * 4. POST /api/quizzes/evaluate
 * Evaluates a user's answer to a flashcard question with real-time scoring and feedback
 */
app.post('/api/quizzes/evaluate', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { question = '', sampleAnswer = '', userAnswer = '', codeContext = '' } = body;

    if (!question.trim() || !userAnswer.trim()) {
      res.status(400).json({ error: 'Both question and user answer are required for evaluation.' });
      return;
    }

    const promptPayload = `
Question: ${question}
${codeContext ? `Code Context:\n\`\`\`\n${codeContext}\n\`\`\`` : ''}
Ideal / Reference Answer: ${sampleAnswer}

User Submitted Answer:
"${userAnswer}"

Grade this answer objectively. Provide:
1. score: Integer between 0 and 100.
2. mastered: Boolean (true if score >= 80).
3. feedback: Constructive explanation highlighting what was accurate and what nuances or technical details were missed.
4. keyConceptReminder: 1-sentence memorable tip for long-term retention.
`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: promptPayload,
      systemInstruction: 'You are a supportive yet rigorous technical educator. You score user responses fairly, rewarding conceptual comprehension even if wording differs, but pointing out critical gaps.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          mastered: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
          keyConceptReminder: { type: Type.STRING },
        },
        required: ['score', 'mastered', 'feedback'],
      },
    });

    const parsed = JSON.parse(cleanJsonString(text));
    res.json({
      evaluation: parsed,
      meta: { modelUsed },
    });
  } catch (error: any) {
    console.error('Error evaluating quiz answer:', error);
    res.status(500).json({
      error: 'Failed to evaluate quiz answer.',
      details: error?.message || String(error),
    });
  }
});

/**
 * 5. POST /api/mastery/generate-report
 * Summarizes weekly learning progress, categorizes skill mastery, and builds a roadmap
 */
app.post('/api/mastery/generate-report', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { reflections = [], timeframe = 'Past 7 Days' } = body;

    if (!Array.isArray(reflections) || reflections.length === 0) {
      res.status(400).json({ error: 'Please provide logged reflections to synthesize a mastery report.' });
      return;
    }

    const logsSummary = reflections.slice(0, 20).map((r: any, idx: number) => `
Log #${idx + 1}: ${r.title} | Tags: ${(r.tags || []).join(', ')} | Difficulty: ${r.difficulty}
Date: ${r.createdAt}
Summary: ${r.aiAnalysis?.summary || r.content?.slice(0, 250)}
    `).join('\n');

    const promptPayload = `
Developer Reflection History (${timeframe}):
Total Entries: ${reflections.length}
${logsSummary}

Synthesize a comprehensive Weekly Skill Mastery Report.
Include:
1. executiveSummary: Inspiring, data-backed summary of progress and problem-solving velocity.
2. topSkills: An array of skills identified from tags & content, with:
   - skill: Name of language, tool, or domain (e.g. Python, Docker, GCP, React)
   - count: Number of logs touching it
   - proficiencyTrend: "improving" | "steady" | "needs_reinforcement"
   - strengths: What the developer handled well
   - growthAreas: High-leverage area to focus on next
3. keyWins: 3 bullet points celebrating specific debugging breakthroughs.
4. actionPlan: 3 actionable learning steps for the coming week.
`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: promptPayload,
      systemInstruction: 'You are an engineering VP and developer coach creating a Weekly Skill Mastery and Growth Report.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          topSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                count: { type: Type.INTEGER },
                proficiencyTrend: { type: Type.STRING },
                strengths: { type: Type.STRING },
                growthAreas: { type: Type.STRING },
              },
              required: ['skill', 'count', 'proficiencyTrend', 'strengths', 'growthAreas'],
            },
          },
          keyWins: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          actionPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['executiveSummary', 'topSkills', 'keyWins', 'actionPlan'],
      },
    });

    const parsed = JSON.parse(cleanJsonString(text));
    res.json({
      report: {
        ...parsed,
        weekStartDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        totalReflections: reflections.length,
        createdAt: new Date().toISOString(),
      },
      meta: { modelUsed },
    });
  } catch (error: any) {
    console.error('Error generating mastery report:', error);
    res.status(500).json({
      error: 'Failed to generate weekly mastery report.',
      details: error?.message || String(error),
    });
  }
});

// Vite middleware configuration for dev & static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Lenggo Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();
