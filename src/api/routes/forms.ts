import express from 'express';
import { Form, Lead, Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Groq } from 'groq-sdk';
import { incrementAiUsage } from '../../lib/usage';
import { authMiddleware } from '../auth';

const router = express.Router();
let groqClient: Groq | null = null;
const getGroq = () => {
    if (!groqClient) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });
    }
    return groqClient;
};

router.use(authMiddleware);

const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  const queryCid = req.query.clientId;
  const headerCid = req.headers['x-client-id'];

  let cid = userCid || reqCid || headerCid || queryCid;

  if (req.user?.role === 'superadmin' && (queryCid || headerCid)) {
    cid = queryCid || headerCid;
  }

  if (!cid) return null;

  (req as any).clientId = String(cid);
  return String(cid);
};

const sanitizeFields = (fields: any[]) => {
  return fields.map(field => {
    let options = field.options || [];
    if (typeof options === 'string') {
        try {
            options = JSON.parse(options);
        } catch (e) {
            options = [options];
        }
    }
    return {
      ...field,
      options: Array.isArray(options) ? options.map((o: any) => typeof o === 'string' ? o : JSON.stringify(o)) : [String(options)]
    };
  });
};

router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const [forms, client] = await Promise.all([
      Form.find({ clientId }).sort({ createdAt: -1 }),
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
      fields: sanitizeFields(fields || []),
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
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;
    delete updateData.clientId;
    if (updateData.fields) {
        updateData.fields = sanitizeFields(updateData.fields);
    }
    
    let updateObj: any = { $set: updateData };
    
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    } else if (updateData.expiresAt === null) {
      // Allow clearing date
      updateObj.$unset = { expiresAt: 1 };
      delete updateData.expiresAt;
    }

    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, clientId },
      updateObj,
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
    const completion = await getGroq().chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an AI form architect. Generate a full form configuration based on user prompts.
          Return ONLY a JSON object with this structure:
          {
            "name": "Generated Form Title",
            "description": "Generated form description text",
            "theme": { "primaryColor": "#hex", "backgroundColor": "#hex", "buttonStyle": "rounded|square|pill" },
            "fields": [
              { "name": "field_name", "label": "Label", "type": "text|email|phone|textarea|select|checkbox|radio", "required": true, "options": ["option1", "option2"] }
            ]
          }
          Output only the JSON object, no markdown.`
        },
        {
          role: 'user',
          content: `Generate a form for this prompt: "${req.body.description}"`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    
    const text = completion.choices[0].message.content || '{}';
    await incrementAiUsage(clientId, 'form-gen', 'assistant', 'AI Form Design Generation');
    envRes.sendSuccess({ result: JSON.parse(text) });
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'AI error: ' + error.message);
  }
});

export default router;
