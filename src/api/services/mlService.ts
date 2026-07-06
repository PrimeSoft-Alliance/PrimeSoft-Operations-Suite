import { AI_MODELS, callWithRetry } from '../utils/ai';
import pino from 'pino';
import Groq from "groq-sdk";
import fs from 'fs';
import path from 'path';

const logger = pino({ name: 'MLService' });
const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY!
});

const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'ml-predictions.md');
const SYSTEM_PROMPT = fs.existsSync(PROMPT_PATH) ? fs.readFileSync(PROMPT_PATH, 'utf8') : '';

export interface MLPredictions {
  leadScore: number; // 0 to 100
  churnRisk: number; // 0 to 1
  satisfactionScore: number; // 0 to 100
  bookingProbability: number; // 0 to 1
  purchaseProbability: number; // 0 to 1
  fraudProbability: number; // 0 to 1
  nextBestAction: string;
}

export class MLService {
  async predict(context: any): Promise<MLPredictions> {
    try {
        const result = await callWithRetry(() => groq.chat.completions.create({
            model: AI_MODELS.LITE,
            contents: [
                { role: 'user', parts: [{ text: JSON.stringify(context) }] }
            ],
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.2,
                responseMimeType: 'application/json',
            },
        }));

        const content = result.choices[0]?.message?.content || '{}';
        let cleanText = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (err) {
      logger.error({ err }, 'ML prediction failed');
      return {
        leadScore: 50,
        churnRisk: 0.1,
        satisfactionScore: 80,
        bookingProbability: 0.2,
        purchaseProbability: 0.1,
        fraudProbability: 0,
        nextBestAction: 'Continue helpful conversation.'
      };
    }
  }
}

export const mlService = new MLService();
