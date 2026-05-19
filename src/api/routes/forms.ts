import express from 'express';
import { Form, Lead, Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware } from '../auth';

const router = express.Router();

router.use(authMiddleware);

const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  const queryCid = req.query.clientId;
  const headerCid = req.headers['x-client-id'];

  let cid = 'plumber-001';

  if (req.user?.role === 'superadmin') {
    cid = queryCid || headerCid || 'plumber-001';
  } else {
    cid = userCid || reqCid || 'plumber-001';
  }

  (req as any).clientId = cid;
  return cid;
};

router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const [forms, client] = await Promise.all([
      Form.find({ clientId, status: 'active' }),
      Client.findOne({ clientId })
    ]);
    envRes.sendSuccess(forms, { clientId, businessName: client?.businessName });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch forms');
  }
});

router.post('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  const { name, description, fields, tags, theme, expiresAt } = req.body;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (!name) return envRes.sendError(422, 'VALIDATION_FAILED', 'name is required');
  
  try {
    const form = await Form.create({
      clientId,
      name,
      description,
      fields,
      tags,
      theme,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    envRes.sendSuccess(form);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const updateData = { ...req.body };
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    } else if (updateData.expiresAt === null) {
      // Allow clearing date
      updateData.$unset = { expiresAt: 1 };
      delete updateData.expiresAt;
    }

    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, clientId },
      Object.keys(updateData.$unset || {}).length > 0 ? updateData : { $set: updateData },
      { new: true }
    );
    if (!form) return envRes.sendError(404, 'NOT_FOUND', 'Form not found');
    envRes.sendSuccess(form);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    await Form.findOneAndDelete({ _id: req.params.id, clientId });
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to delete form');
  }
});

router.post('/generate-design', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Generate a full form configuration based on this prompt: "${req.body.description}". 
      Return ONLY valid JSON.
      JSON structure:
      {
        "name": "Generated Form Title",
        "description": "Generated form description text",
        "theme": { "primaryColor": "#hex", "backgroundColor": "#hex", "buttonStyle": "rounded|square|pill" },
        "fields": [
          { "name": "field_name", "label": "Label", "type": "text|email|phone|textarea|select|checkbox|radio", "required": true, "options": [] }
        ]
      }
      Feel free to include 'type': 'page-break' to separate sections if it makes sense logically.
      Do NOT include markdown, just the JSON.`
    });
    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      envRes.sendSuccess({ result: JSON.parse(jsonMatch[0]) });
    } else {
      envRes.sendError(400, 'API_ERROR', 'Could not generate valid design');
    }
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'AI error: ' + error.message);
  }
});

export default router;
