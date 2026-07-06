import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { AI_MODELS } from '../utils/ai';
import { incrementAiUsage } from '../../lib/usage';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

// AI Brand Generator with Extended Thinking (Groq)
router.post('/generate-branding', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { businessName, services, prompt: userPrompt } = req.body;

    const promptPath = path.join(PROMPTS_DIR, 'brand-strategist.md');
    const systemPrompt = fs.existsSync(promptPath) 
      ? fs.readFileSync(promptPath, 'utf8').replace('${businessName}', businessName || 'Our Partner')
      : 'You are a brand strategist expert. Generate comprehensive branding strategies in JSON format.';

    const result = await groq.chat.completions.create({
      model: AI_MODELS.FLASH,
      messages: [
        {
          role: 'user',
          content: userPrompt || `Generate branding for ${businessName || 'Our Partner'}. Services: ${services || 'various'}. Return valid JSON format.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      system: systemPrompt,
    });

    const clientId = (req as any).clientId;
    if (clientId) {
      await incrementAiUsage(clientId, 'branding-gen', 'assistant', 'AI Branding Generation');
    }

    const content = result.choices[0]?.message?.content || '{}';
    const resultJson = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
    
    envRes.sendSuccess(resultJson);
  } catch (error: any) {
    console.error('AI Branding Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate branding. Ensure you have a valid Groq API key in GROQ_API_KEY.');
  }
});

// POST /v1/ai/format-message
router.post('/format-message', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { message, instruction } = req.body;
    if (!message) {
      return envRes.sendError(400, 'MISSING_FIELDS', 'Message is required');
    }

    const promptPath = path.join(PROMPTS_DIR, 'copywriter.md');
    const systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf8').replace('${instruction}', instruction || 'Make it more professional and engaging')
      : 'You are a professional copywriter. Polish and improve messages while maintaining the original meaning. Make them more engaging and professional.';

    const result = await groq.chat.completions.create({
      model: AI_MODELS.FLASH,
      messages: [
        {
          role: 'user',
          content: `Message to polish:\n"${message}"\n\nInstruction: ${instruction || 'Make it more professional and engaging'}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      system: systemPrompt,
    });

    const formattedText = result.choices[0]?.message?.content || message;
    envRes.sendSuccess({ formattedText: formattedText.trim() });
  } catch (error: any) {
    console.error('AI Format Message Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to format message. Ensure your Groq API key is properly configured.');
  }
});

export default router;
