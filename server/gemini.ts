import { GoogleGenAI, Type } from '@google/genai';

// Lazy-initialized Gemini client instance
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is not set in environment variables. Mock or graceful degradation will be required.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-lenggo',
        },
      },
    });
  }
  return aiClient;
}

// Resilient fallback ladder per production guidelines
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

export interface FallbackOptions {
  contents: any;
  config?: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

export async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const client = getGeminiClient();
  let lastError: any = null;

  const mergedConfig: any = {
    ...(options.config || {}),
  };

  if (options.systemInstruction) {
    mergedConfig.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    mergedConfig.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    mergedConfig.responseSchema = options.responseSchema;
  }

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: options.contents,
        config: mergedConfig,
      });

      const responseText = response.text || '';
      return { text: responseText, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${model} encountered an error: ${err?.message || err}. Trying next fallback candidate...`);
      // Continue to next model in ladder
    }
  }

  throw new Error(`All Gemini fallback models exhausted. Last error: ${lastError?.message || String(lastError)}`);
}

export { Type };
