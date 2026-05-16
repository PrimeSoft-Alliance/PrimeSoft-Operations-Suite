import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Groq } from 'groq-sdk';
import { Settings } from '../models';

const router = express.Router();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

// AI Brand Generator
router.post('/generate-branding', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { businessName, services } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return envRes.sendError(500, 'API_ERROR', 'Groq API Key not configured');
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional brand designer. Return ONLY a JSON object with primaryColor, secondaryColor, fontFamily (Inter, Outfit, Space Grotesk, or Montserrat), heroTitle (high-converting), heroSubtitle (persuasive), and a layoutStyle (modern, minimal, or bold). No markdown, no prose.'
        },
        {
          role: 'user',
          content: `You are a world-class brand strategist and UI/UX designer. 
Generate a professional brand identity for a business named "${businessName}". 
Services offered: ${services}.

Return ONLY a JSON object with:
{
  "primaryColor": "A hex code that matches the industry vibe",
  "fontFamily": "One of: Inter, Outfit, Space Grotesk, Montserrat",
  "heroTitle": "A high-converting 3-6 word headline",
  "heroSubtitle": "A compelling 15-25 word value proposition",
  "heroImage": "A high-quality Unsplash image URL that matches the brand",
  "aiBehaviorInstructions": "Specific tone and style instructions for an AI receptionist for this business"
}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Branding Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate branding');
  }
});

export default router;
