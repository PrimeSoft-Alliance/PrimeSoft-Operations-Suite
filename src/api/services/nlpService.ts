import Groq from "groq-sdk";
import { AI_MODELS, callWithRetry } from '../utils/ai';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = pino({ name: 'NLPService' });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
  }
});

const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'nlp.md');
const DEFAULT_NLP_PROMPT = `Extract the following details from the user's message in JSON format:
{
  "language": "string (ISO 639-1)",
  "intent": "string (e.g. greeting, support, booking, inquiry, pricing, complaint)",
  "entities": {
    "names": ["string"],
    "emails": ["string"],
    "phones": ["string"],
    "dates": ["string"],
    "products": ["string"],
    "services": ["string"],
    "locations": ["string"]
  },
  "sentiment": "positive | neutral | negative | angry | confused",
  "urgency": number (0 to 1),
  "classification": ["string"]
}
Only return valid JSON. No markdown blocks.`;
const SYSTEM_PROMPT = fs.existsSync(PROMPT_PATH) ? fs.readFileSync(PROMPT_PATH, 'utf8') : DEFAULT_NLP_PROMPT;

export interface NLPExtraction {
  language: string;
  intent: string;
  entities: {
    names: string[];
    emails: string[];
    phones: string[];
    dates: string[];
    products: string[];
    services: string[];
    locations: string[];
  };
  sentiment: 'positive' | 'neutral' | 'negative' | 'angry' | 'confused';
  urgency: number; // 0 to 1
  classification: string[];
}

export class NLPService {
  async extract(text: string): Promise<NLPExtraction> {
    if (!text || !text.trim()) {
      return {
        language: 'en',
        intent: 'unknown',
        entities: { names: [], emails: [], phones: [], dates: [], products: [], services: [], locations: [] },
        sentiment: 'neutral',
        urgency: 0.5,
        classification: []
      };
    }
    try {
        const result = await groq.chat.completions.create({ 
          model: AI_MODELS.LITE,
          contents: text,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.2,
            responseMimeType: 'application/json',
          }
        });

        const rawText = result.choices[0]?.message?.content || '{}';
      let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(cleanText);
      } catch (e) {
        try {
          const match = cleanText.match(/\{[\s\S]*\}/);
          if (match) {
            return JSON.parse(match[0]);
          }
        } catch (innerErr) {}
        logger.warn({ rawText }, 'JSON parse failed in NLP extraction, falling back');
        return {
          language: 'en',
          intent: 'unknown',
          entities: { names: [], emails: [], phones: [], dates: [], products: [], services: [], locations: [] },
          sentiment: 'neutral',
          urgency: 0.5,
          classification: []
        };
      }
    } catch (err) {
      logger.error({ err }, 'NLP extraction failed');
      return {
        language: 'en',
        intent: 'unknown',
        entities: { names: [], emails: [], phones: [], dates: [], products: [], services: [], locations: [] },
        sentiment: 'neutral',
        urgency: 0.5,
        classification: []
      };
    }
  }
}

export const nlpService = new NLPService();
