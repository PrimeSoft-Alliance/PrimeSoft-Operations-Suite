import express from 'express';
import { EmailTemplate, Settings } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';
import { EmailTemplateService } from '../services/emailTemplate.service';
import Groq from "groq-sdk";
import { AI_MODELS } from '../utils/ai';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
  }
});
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

// Middleware: Extract client ID securely
const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  let queryCid = req.query.clientId;
  let headerCid = req.headers['x-client-id'];
  
  if (typeof queryCid === 'object' && queryCid !== null && 'clientId' in queryCid) queryCid = queryCid.clientId;
  if (typeof headerCid === 'object' && headerCid !== null && 'clientId' in headerCid) headerCid = headerCid.clientId;

  let cid = userCid || reqCid || headerCid || queryCid;
  if (!cid) return null;
  cid = String(cid);

  (req as any).clientId = cid;
  return cid;
};

// GET /api/email-templates - Get all templates
router.get('/', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const templates = await EmailTemplate.find({ clientId }).sort({ updatedAt: -1 }).lean();
    envRes.sendSuccess(templates);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// GET /api/email-templates/marketplace - Get marketplace templates (system templates)
router.get('/marketplace', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const templates = await EmailTemplate.find({ 
      $or: [
        { isMarketplace: true },
        { type: 'system' }
      ]
    }).sort({ updatedAt: -1 }).lean();
    envRes.sendSuccess(templates);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// GET /api/email-templates/:id - Get specific template details
router.get('/:id', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const template = await EmailTemplate.findOne({ _id: req.params.id, clientId }).lean();
    if (!template) {
      return envRes.sendError(404, 'NOT_FOUND', 'Email template not found');
    }
    envRes.sendSuccess(template);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates - Create a new email template
router.post('/', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const { name, description, category, tags, type, subject, projectData, htmlSource, mjmlSource, variables } = req.body;
    if (!name) {
      return envRes.sendError(400, 'BAD_REQUEST', 'A template name is required');
    }

    let finalHtml = htmlSource || '';
    // If it is MJML, pre-compile it for preview
    if (type === 'mjml' && mjmlSource) {
      const compileRes = await EmailTemplateService.compileMjml(mjmlSource);
      finalHtml = compileRes.html || finalHtml;
    }

    const template = await EmailTemplateService.createTemplate(clientId, {
      name,
      description,
      category,
      tags,
      type,
      subject,
      projectData,
      htmlSource: finalHtml,
      mjmlSource,
      variables,
      createdBy: (req as any).user?.username || 'user',
      status: req.body.status || 'draft'
    });

    envRes.sendSuccess(template);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// PUT /api/email-templates/:id - Update an email template
router.put('/:id', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const { type, htmlSource, mjmlSource } = req.body;
    let finalHtml = htmlSource || '';

    if (type === 'mjml' && mjmlSource) {
      const compileRes = await EmailTemplateService.compileMjml(mjmlSource);
      finalHtml = compileRes.html || finalHtml;
    }

    const template = await EmailTemplateService.updateTemplate(clientId, req.params.id, {
      ...req.body,
      htmlSource: finalHtml,
      updatedBy: (req as any).user?.username || 'user'
    });

    envRes.sendSuccess(template);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// DELETE /api/email-templates/:id - Delete an email template
router.delete('/:id', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    await EmailTemplateService.deleteTemplate(clientId, req.params.id);
    envRes.sendSuccess({ message: 'Template successfully deleted' });
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// DELETE /api/email-templates - Bulk delete email templates
router.delete('/', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const idsString = req.body.ids || req.query.ids;
    const ids = Array.isArray(idsString) ? idsString : (typeof idsString === 'string' ? idsString.split(',') : []);

    if (ids.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'No IDs provided for deletion');
    }

    const { EmailTemplate } = await import('../models');
    await EmailTemplate.deleteMany({ _id: { $in: ids }, clientId });

    envRes.sendSuccess({ message: `${ids.length} templates successfully deleted` });
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates/duplicate - Duplicate an email template
router.post('/duplicate', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const { templateId } = req.body;
    if (!templateId) return envRes.sendError(400, 'BAD_REQUEST', 'templateId is required');

    const duplicate = await EmailTemplateService.duplicateTemplate(clientId, templateId);
    envRes.sendSuccess(duplicate);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates/import - Import template
router.post('/import', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const templateData = req.body;
    const template = await EmailTemplateService.importTemplate(clientId, templateData);
    envRes.sendSuccess(template);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates/export - Export template
router.post('/export', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const { templateId } = req.body;
    if (!templateId) return envRes.sendError(400, 'BAD_REQUEST', 'templateId is required');

    const templateData = await EmailTemplateService.exportTemplate(clientId, templateId);
    envRes.sendSuccess(templateData);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates/preview - Preview template with compilation
router.post('/preview', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const { templateId, variables } = req.body;
    if (!templateId) return envRes.sendError(400, 'BAD_REQUEST', 'templateId is required');

    const preview = await EmailTemplateService.previewTemplate(clientId, templateId, variables);
    envRes.sendSuccess(preview);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates/send-test - Test send template
router.post('/send-test', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

  try {
    const { to, subject, templateId, variables, overrideSmtp } = req.body;
    if (!to || !templateId) {
      return envRes.sendError(400, 'BAD_REQUEST', 'recipient address ("to") and "templateId" are required');
    }

    const result = await EmailTemplateService.sendTestEmail(
      clientId,
      to,
      subject,
      templateId,
      variables,
      overrideSmtp
    );

    envRes.sendSuccess(result);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

// POST /api/email-templates/ai-generate - AI Template Generation via Groq
router.post('/ai-generate', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { businessType, campaignType, campaignGoal, brandName, brandColors, cta, templateType = 'html' } = req.body;
    
    if (!businessType || !campaignType || !brandName) {
      return envRes.sendError(400, 'BAD_REQUEST', 'businessType, campaignType, and brandName are required.');
    }

    const isMjml = templateType === 'mjml';

    const systemPrompt = fs.readFileSync(path.join(PROMPTS_DIR, 'email-template.md'), 'utf8');

    const result = await groq.chat.completions.create({
      model: AI_MODELS.FLASH,
      contents: [
        { role: 'user', parts: [{ text: `Generate an email template with the following specs:
- Business Type: ${businessType}
- Campaign Type: ${campaignType}
- Campaign Goal: ${campaignGoal || 'engagement'}
- Brand Name: ${brandName}
- Brand Colors: ${brandColors || '#4f46e5'}
- CTA Label: ${cta || 'Get Started Now'}
- Output Format: ${isMjml ? 'MJML code starting with <mjml> and ending with </mjml>' : 'Standard Responsive HTML with inline styles'}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    let generatedCode = result.choices[0]?.message?.content || '';
    
    // Sanitize any occasional markdown codeblock ticks
    generatedCode = generatedCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();

    let compiledHtml = '';
    if (isMjml) {
      const compileRes = await EmailTemplateService.compileMjml(generatedCode);
      compiledHtml = compileRes.html;
    } else {
      compiledHtml = generatedCode;
    }

    envRes.sendSuccess({
      type: templateType,
      mjmlSource: isMjml ? generatedCode : '',
      htmlSource: compiledHtml,
      subject: `Special Invitation from ${brandName}`
    });

  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', 'AI Generation failed: ' + err.message);
  }
});

// Image routes removed due to text-only pivot

export default router;
