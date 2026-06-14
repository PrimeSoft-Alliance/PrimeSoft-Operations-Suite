import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { getGroqClient, DEFAULT_MODEL as AI_MODEL } from '../utils/ai';
import { incrementAiUsage } from '../../lib/usage';
import { Settings } from '../models';

const router = express.Router();
const groq = getGroqClient();

// AI Form Generator
router.post('/generate-form', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { prompt } = req.body;
    if (!prompt) return envRes.sendError(400, 'BAD_REQUEST', 'Prompt is required');

    const response = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert lead generation strategist and technical form architect. 
          Generate a high-converting lead funnel structure.
          Return ONLY a valid JSON object that defines a form. 
          The object must have:
          - name: A catchy title for the form
          - description: A value-driven description
          - fields: An array of field objects, each with:
            - id: random string
            - type: one of [text, textarea, email, select, rating, checkbox, radio, file]
            - label: clear, friendly label
            - name: camelCase identifier
            - required: boolean
            - placeholder: optional text
            - helpText: optional guidance
            - options: array of strings (only for select, radio, checkbox)
          - theme: object with primaryColor (hex)`
        },
        { role: 'user', content: `Generate a lead funnel for: "${prompt}"` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const clientId = (req as any).clientId;
    if (clientId) {
      await incrementAiUsage(clientId, 'form-gen', 'assistant', `AI Form Generation: ${prompt}`);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Form Generation Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate form structure. Ensure you have a valid Groq API key.');
  }
});

// AI Brand Generator
router.post('/generate-branding', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { businessName, services, prompt: userPrompt } = req.body;

    const response = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a world-class brand strategist and UI/UX designer.
          Return ONLY a valid JSON object with:
          {
            "primaryColor": "A hex code that matches the industry vibe",
            "fontFamily": "One of: Inter, Outfit, Space Grotesk, Montserrat",
            "heroTitle": "A high-converting 3-6 word headline",
            "heroSubtitle": "A compelling 15-25 word value proposition",
            "heroImage": "A high-quality Unsplash image URL that matches the brand (landscape focus)",
            "aiBehaviorInstructions": "Specific tone and style instructions for an AI receptionist for this business"
          }`
        },
        { 
          role: 'user', 
          content: userPrompt || `Generate a professional brand identity for a business named "${businessName || 'Our Partner'}". Services offered: ${services || 'various professional services'}.` 
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const clientId = (req as any).clientId;
    if (clientId) {
      await incrementAiUsage(clientId, 'branding-gen', 'assistant', 'AI Branding Generation');
    }

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    
    // For the KnowledgeManager.tsx "Polish" button, it might expect heroSubtitle as the prompt
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Branding Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate branding. Ensure you have a valid Groq API key.');
  }
});

// AI Website Content Generator (Gemini)
router.post('/generate-website-section', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { section, businessName, services } = req.body;

    let userContent = `Generate content for the "${section}" section of a website for a business named "${businessName || 'Our Partner'}" offering ${services || 'services'}.`;

    if (section === 'landing-hero') {
      userContent += `
        Return ONLY a JSON object with:
        {
          "heroBadge": "Short badge text",
          "heroTitle": "Catchy title",
          "heroSubtitle": "Compelling subtitle"
        }`;
    } else if (section === 'landing-services') {
      userContent += `
        Return ONLY a JSON object with:
        {
          "servicesBadge": "Short badge text",
          "servicesTitle": "Services title",
          "servicesSubtitle": "Services description"
        }`;
    } else if (section === 'landing-cta') {
      userContent += `
        Return ONLY a JSON object with:
        {
          "ctaTitle": "CTA title",
          "ctaSubtitle": "CTA subtitle",
          "ctaPrimaryBtn": "Button text",
          "ctaSecondaryBtn": "Button text"
        }`;
    } else {
      return envRes.sendError(400, 'API_ERROR', 'Unsupported section');
    }

    const response = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You are a professional web copywriter. Return ONLY a valid JSON object matching requested schema.' },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const clientId = (req as any).clientId;
    if (clientId) {
      await incrementAiUsage(clientId, 'website-gen', 'assistant', `AI Website Content Generation: ${section}`);
    }

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Website Generation Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate website content. Ensure you have a valid Groq API key.');
  }
});

export default router;
