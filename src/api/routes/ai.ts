import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Groq } from 'groq-sdk';
import { incrementAiUsage } from '../../lib/usage';
import { Settings, Client } from '../models';
import { getClientBusinessInfo, getClientServices, getClientBranding } from '../utils/aiDataLoaders';

const router = express.Router();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

// AI Form Generator (Groq)
router.post('/generate-form', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = (req as any).clientId;
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    
    const { prompt } = req.body;
    if (!prompt) return envRes.sendError(400, 'BAD_REQUEST', 'Prompt is required');

    if (!process.env.GROQ_API_KEY) {
      return envRes.sendError(500, 'API_ERROR', 'Groq API Key not configured');
    }

    // VALIDATE: Ensure client exists and load business context
    const client = await Client.findOne({ clientId });
    if (!client) {
      return envRes.sendError(404, 'NOT_FOUND', 'Client not found in database');
    }

    // Get branding if available
    const branding = await getClientBranding(clientId);
    const themeColor = branding?.primaryColor || '#3b82f6';

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert lead generation strategist and technical form architect for the business "${client.businessName}". 
          Generate a high-converting lead funnel structure aligned with their services.
          Return ONLY a JSON object that defines a form. 
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
          - theme: object with primaryColor (hex)
          
          No markdown, no prose, strictly JSON.`
        },
        {
          role: 'user',
          content: `Generate a lead funnel for: "${prompt}"`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    await incrementAiUsage(clientId, 'form-gen', 'assistant', `AI Form Generation: ${prompt}`);

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    // Ensure theme color is set to client's branding
    result.theme = result.theme || {};
    result.theme.primaryColor = themeColor;
    
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Form Generation Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate form structure: ' + (error.message || 'Unknown error'));
  }
});

// AI Brand Generator
router.post('/generate-branding', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = (req as any).clientId;
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    
    if (!process.env.GROQ_API_KEY) {
      return envRes.sendError(500, 'API_ERROR', 'Groq API Key not configured');
    }

    // VALIDATE: Load actual client data from database instead of assuming
    const clientData = await getClientBusinessInfo(clientId);
    if (!clientData) {
      return envRes.sendError(404, 'NOT_FOUND', 'Client business information not found in database');
    }

    const services = await getClientServices(clientId);
    if (!services || services.length === 0) {
      return envRes.sendError(400, 'VALIDATION_FAILED', 'Client has no services defined in database');
    }

    const servicesText = services.join(', ');

     const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional brand designer. Return ONLY a JSON object with primaryColor, secondaryColor, fontFamily (Inter, Outfit, Space Grotesk, or Montserrat), heroTitle (high-converting), heroSubtitle (persuasive), and a layoutStyle (modern, minimal, or bold). No markdown, no prose.'
        },
        {
          role: 'user',
          content: `You are a world-class brand strategist and UI/UX designer. 
Generate a professional brand identity for a business named "${clientData.businessName}". 
Services offered: ${servicesText}.

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

    await incrementAiUsage(clientId, 'branding-gen', 'assistant', `AI Branding Generation for ${clientData.businessName}`);

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Branding Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate branding: ' + (error.message || 'Unknown error'));
  }
});

// AI Website Content Generator
router.post('/generate-website-section', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = (req as any).clientId;
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    
    const { section } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return envRes.sendError(500, 'API_ERROR', 'Groq API Key not configured');
    }

    // VALIDATE: Load actual client data from database
    const clientData = await getClientBusinessInfo(clientId);
    if (!clientData) {
      return envRes.sendError(404, 'NOT_FOUND', 'Client business information not found in database');
    }

    const services = await getClientServices(clientId);
    const servicesText = services.length > 0 ? services.join(', ') : 'professional services';

    let userContent = `Generate content for the "${section}" section of a website for a business named "${clientData.businessName}" offering ${servicesText}.`;

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
        return envRes.sendError(400, 'API_ERROR', 'Unsupported section type');
    }

     const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional web copywriter. Return ONLY a JSON object. No markdown, no prose.' },
        { role: 'user', content: userContent }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    await incrementAiUsage(clientId, 'website-gen', 'assistant', `AI Website Content Generation: ${section}`);

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    envRes.sendSuccess(result);
  } catch (error: any) {
    console.error('AI Website Generation Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to generate website content: ' + (error.message || 'Unknown error'));
  }
});

export default router;
