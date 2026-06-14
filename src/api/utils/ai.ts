import Groq from 'groq-sdk';

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY') {
      console.error('[AI_CONFIG] CRITICAL: GROQ_API_KEY is not set correctly. AI chat will fail.');
      // We still create the instance but will handle the failure in the route
    }
    groqInstance = new Groq({
      apiKey: apiKey || 'missing_key'
    });
  }
  return groqInstance;
}

export const AI_MODELS = {
  VERSATILE: 'llama-3.3-70b-versatile',
  STABLE: 'llama-3-3-70b-specdec',
  FAST: 'llama-3.1-8b-instant'
};

export const DEFAULT_MODEL = AI_MODELS.VERSATILE;
