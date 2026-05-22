import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

/**
 * Endpoint: POST /v1/dashboard/ai/generate-content
 * AI-powered content generation with tone control
 */
router.post('/generate-content', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { fieldKey, businessName, services, tone, currentContent, context, section } = req.body;

    if (!fieldKey && !section) {
      return envRes.sendError(400, 'BAD_REQUEST', 'fieldKey or section is required');
    }

    // Build prompt based on field type and tone
    const prompt = buildPrompt(fieldKey, businessName, services, tone, currentContent, context);

    // Call AI service (using Groq via AI SDK)
    const response = await generateContent(prompt, tone);

    if (!response) {
      return envRes.sendError(500, 'AI_ERROR', 'Content generation failed');
    }

    envRes.sendSuccess(
      {
        content: response,
        fieldKey,
        tone,
        timestamp: new Date()
      },
      'Content generated successfully'
    );
  } catch (error: any) {
    console.error('[AI-CONTENT] Generation error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to generate content');
  }
});

/**
 * Build AI prompt based on field type
 */
function buildPrompt(
  fieldKey: string | undefined,
  businessName: string,
  services: string,
  tone: string,
  currentContent: string | undefined,
  context: any
): string {
  const toneGuide = {
    professional: 'Use formal language, corporate tone, emphasize expertise and reliability.',
    casual: 'Use conversational language, friendly tone, make it relatable and approachable.',
    creative: 'Use imaginative language, unique phrasing, be memorable and engaging.',
    technical: 'Use technical language, detailed explanations, emphasize innovation and expertise.'
  };

  const toneInstruction = toneGuide[tone as keyof typeof toneGuide] || toneGuide.professional;

  // Build specific prompts based on field
  const fieldPrompts: Record<string, string> = {
    heroBadge: `Generate a short, punchy badge/label (max 5 words) for a hero section of ${businessName}. ${toneInstruction} Make it compelling.`,
    heroTitle: `Generate a powerful, engaging main headline for ${businessName}'s hero section. Keep it under 10 words. ${toneInstruction}`,
    heroSubtitle: `Generate a compelling subtitle (2-3 sentences) for ${businessName} that explains their core value proposition. ${toneInstruction}`,
    servicesBadge: `Generate a short label (max 4 words) for the services section of ${businessName}. ${toneInstruction} Make it attention-grabbing.`,
    servicesTitle: `Generate a catchy title for the services section of ${businessName}. ${toneInstruction} Keep it under 10 words.`,
    servicesSubtitle: `Generate a 2-3 sentence description of the services offered by ${businessName}: ${services}. ${toneInstruction}`,
    ctaTitle: `Generate a persuasive call-to-action title for ${businessName}. ${toneInstruction} Make it motivating and clear.`,
    ctaSubtitle: `Generate a compelling CTA subtitle for ${businessName} (2-3 sentences). ${toneInstruction}`,
    trustTitle: `Generate a title for the trust/credibility section of ${businessName}. ${toneInstruction} Make it inspiring.`,
    contactTitle: `Generate an inviting title for the contact section of ${businessName}. ${toneInstruction}`,
    aboutHeroTitle: `Generate a compelling prefix for an about page hero title for ${businessName}. ${toneInstruction} Keep it under 5 words.`,
    aboutText: `Generate a detailed company bio (150-200 words) for ${businessName} in the ${context?.industry || 'Technology'} industry. ${toneInstruction}`,
  };

  // Get field-specific prompt or use generic
  let prompt = fieldPrompts[fieldKey] || `Generate compelling content for the "${fieldKey}" field of ${businessName}. ${toneInstruction}`;

  // Add editing instruction if content already exists
  if (currentContent) {
    prompt += `\n\nExisting content: "${currentContent}"\n\nMake this content better while keeping the same core message.`;
  }

  // Add context information
  if (context?.tagline) {
    prompt += `\n\nBusiness tagline: "${context.tagline}"`;
  }

  return prompt;
}

/**
 * Generate content using AI
 * In production, this would call the AI SDK with Groq or similar
 */
async function generateContent(prompt: string, tone: string): Promise<string> {
  try {
    // For now, return smart mock responses
    // In production, integrate with AI SDK:
    // const { text } = await generateText({
    //   model: groqModel('mixtral-8x7b-32768'),
    //   prompt: prompt
    // });

    // Mock implementations based on tone and prompt
    if (prompt.includes('Badge')) {
      const badges: Record<string, string[]> = {
        professional: ['Excellence & Innovation', 'Enterprise Solutions', 'Industry Leadership'],
        casual: ['Let\'s Build Together', 'Your Success Partner', 'Making Things Happen'],
        creative: ['Future Forward', 'Breaking Boundaries', 'Ideas in Motion'],
        technical: ['Advanced Technology', 'Cutting Edge Solutions', 'Next Generation']
      };
      const options = badges[tone as keyof typeof badges] || badges.professional;
      return options[Math.floor(Math.random() * options.length)];
    }

    if (prompt.includes('Title')) {
      const titles: Record<string, string[]> = {
        professional: ['Building Excellence', 'Enterprise Solutions That Scale', 'Digital Transformation Experts'],
        casual: ['Let\'s Make Things Awesome', 'Creating Things You\'ll Love', 'Bringing Your Ideas to Life'],
        creative: ['Where Innovation Meets Vision', 'Crafting Tomorrow Today', 'Imagination Into Reality'],
        technical: ['Advanced Solutions for Complex Challenges', 'Next-Generation Technology Platform', 'Powered by Innovation']
      };
      const options = titles[tone as keyof typeof titles] || titles.professional;
      return options[Math.floor(Math.random() * options.length)];
    }

    if (prompt.includes('subtitle') || prompt.includes('Subtitle')) {
      const subtitles: Record<string, string[]> = {
        professional: ['We deliver enterprise-grade solutions that transform your business and drive measurable results. With decades of experience, we\'re your trusted partner for digital success.',
          'Our comprehensive suite of services is designed to help your organization overcome challenges and achieve its strategic goals. We combine expertise with innovation.'],
        casual: ['We believe in making technology simple and accessible. Let\'s work together to turn your ideas into amazing reality.',
          'From concept to launch, we\'re here to help you succeed. We\'re excited to be part of your journey.'],
        creative: ['Imagine what\'s possible when creativity meets technology. We turn bold ideas into experiences that inspire and delight.',
          'Breaking conventions and pushing boundaries is what we do. Let\'s create something extraordinary together.'],
        technical: ['Leveraging cutting-edge technologies and best practices, we deliver robust solutions that scale with your business.',
          'Our expert team specializes in building sophisticated systems that power modern enterprises and drive innovation.']
      };
      const options = subtitles[tone as keyof typeof subtitles] || subtitles.professional;
      return options[Math.floor(Math.random() * options.length)];
    }

    // Default response
    return generateSmartMockResponse(tone);
  } catch (error) {
    console.error('[AI] Generation failed:', error);
    return null as any;
  }
}

/**
 * Generate smart mock response based on tone
 */
function generateSmartMockResponse(tone: string): string {
  const responses: Record<string, string> = {
    professional: 'Delivering comprehensive solutions with proven expertise and measurable impact.',
    casual: 'Making things awesome and helping you succeed every step of the way.',
    creative: 'Turning imagination into reality with innovative ideas and bold execution.',
    technical: 'Building advanced, scalable solutions using cutting-edge technology and best practices.'
  };
  return responses[tone] || responses.professional;
}

export default router;
