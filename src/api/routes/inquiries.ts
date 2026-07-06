import express from 'express';
import { Inquiry, Contact, Lead, Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';

const router = express.Router();

router.use(authMiddleware);

const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  let queryCid = req.query.clientId;
  let headerCid = req.headers['x-client-id'];
  
  if (typeof queryCid === 'object' && queryCid !== null && 'clientId' in queryCid) queryCid = queryCid.clientId;
  if (typeof headerCid === 'object' && headerCid !== null && 'clientId' in headerCid) headerCid = headerCid.clientId;

  let cid = userCid || reqCid || headerCid || queryCid;
  if (!cid) return null;
  return String(cid);
};

// POST /v1/inquiries/sync - Sync new emails via IMAP
router.post('/sync', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const { syncInquiriesFromImap } = await import('../services/emailSupportService');
    const result = await syncInquiriesFromImap(clientId);
    if (result.success) {
      envRes.sendSuccess({ success: true, message: 'Synced emails via IMAP' });
    } else {
      envRes.sendError(500, 'API_ERROR', 'IMAP Sync Failed', result.error);
    }
  } catch (error: any) {
    console.error('[IMAP_SYNC_ENDPOINT] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'IMAP Sync endpoint error', error.message);
  }
});

// GET /v1/inquiries - List all inquiries for the client
router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const inquiries = await Inquiry.find({ clientId }).sort({ createdAt: -1 }).lean();
    envRes.sendSuccess(inquiries);
  } catch (error: any) {
    console.error('[INQUIRIES_FETCH] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch inquiries', error.message);
  }
});

// POST /v1/inquiries - Create a new inquiry manually or programmatic webhook proxy
router.post('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  const { senderEmail, subject, body, priority = 'medium', status = 'unread', threadId } = req.body;

  if (!senderEmail || !body) {
    return envRes.sendError(400, 'BAD_REQUEST', 'Sender email and body are required.');
  }

  try {
    // Check if Contact exists, if not, create one to enforce relationship rules
    let contact = await Contact.findOne({ clientId, email: senderEmail.toLowerCase().trim() });
    if (!contact) {
      contact = await Contact.create({
        clientId,
        name: senderEmail.split('@')[0],
        email: senderEmail.toLowerCase().trim(),
        subject: subject || 'New Inquiry',
        message: body,
        source: 'email'
      });
    }

    // Check or create a matching Lead to prevent orphan flows
    let lead = await Lead.findOne({ clientId, contactEmail: senderEmail.toLowerCase().trim() });
    if (!lead) {
      lead = await Lead.create({
        clientId,
        contactId: contact._id,
        source: 'chatbot',
        contactFirst: senderEmail.split('@')[0],
        contactEmail: senderEmail.toLowerCase().trim(),
        stage: 'New',
        value: 0,
        activities: [{
          type: 'inquiry',
          description: `Formulated inquiry: ${subject || 'No Subject'}`
        }]
      });
    }

    const tId = threadId || `th_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const inquiry = await Inquiry.create({
      clientId,
      threadId: tId,
      senderEmail: senderEmail.toLowerCase().trim(),
      subject: subject || 'Inquiry Request',
      body,
      status,
      priority,
      customerId: contact._id.toString()
    });

    // Link activity to Lead
    lead.activities.push({
      type: 'inquiry',
      description: `Inquiry submitted: ${subject || 'No Subject'}. Status: ${status}.`,
      metadata: { inquiryId: inquiry._id }
    });
    lead.lastActivity = new Date();
    await lead.save();

    envRes.sendSuccess(inquiry);
  } catch (error: any) {
    console.error('[INQUIRY_CREATE] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to create inquiry', error.message);
  }
});

// PUT /v1/inquiries/:id - Update an inquiry (status, priority, assignment)
router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const inquiry = await Inquiry.findOneAndUpdate(
      { _id: req.params.id, clientId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return envRes.sendError(404, 'NOT_FOUND', 'Inquiry not found');
    }

    // Sync state to related Lead activity logs if present
    const lead = await Lead.findOne({ clientId, contactEmail: inquiry.senderEmail });
    if (lead) {
      lead.activities.push({
        type: 'status_change',
        description: `Inquiry status changed to ${inquiry.status}.`,
        metadata: { inquiryId: inquiry._id }
      });
      lead.lastActivity = new Date();
      await lead.save();
    }

    // AI learning: If ticket closed, extract general procedures to knowledge base
    if (req.body.status === 'closed') {
      const { processClosedTicketForAI } = await import('../services/emailSupportService');
      processClosedTicketForAI(clientId, inquiry._id.toString());
    }

    envRes.sendSuccess(inquiry);
  } catch (error: any) {
    console.error('[INQUIRY_UPDATE] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to update inquiry', error.message);
  }
});

// DELETE /v1/inquiries/:id - Delete / archive an inquiry
router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const inquiry = await Inquiry.findOneAndDelete({ _id: req.params.id, clientId });
    if (!inquiry) {
      return envRes.sendError(404, 'NOT_FOUND', 'Inquiry not found');
    }
    envRes.sendSuccess({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error: any) {
    console.error('[INQUIRY_DELETE] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to delete inquiry', error.message);
  }
});

// DELETE /v1/inquiries - Bulk delete inquiries
router.delete('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid credentials');

    const idsString = req.body.ids || req.query.ids;
    const ids = Array.isArray(idsString) ? idsString : (typeof idsString === 'string' ? idsString.split(',') : []);

    if (ids.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'No IDs provided for deletion');
    }

    await Inquiry.deleteMany({ _id: { $in: ids }, clientId });
    envRes.sendSuccess({ success: true, message: `${ids.length} inquiries deleted.` });
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to delete inquiries', error.message);
  }
});

// POST /v1/inquiries/:id/reply - Reply to an inquiry via SMTP and add message to thread
router.post('/:id/reply', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  const { message } = req.body;
  if (!message) return envRes.sendError(400, 'BAD_REQUEST', 'Reply message is required.');

  try {
    const inquiry = await Inquiry.findOne({ _id: req.params.id, clientId });
    if (!inquiry) return envRes.sendError(404, 'NOT_FOUND', 'Inquiry not found');

    const threadId = inquiry.threadId || `inquiry-${inquiry._id}@ominirep.com`;

    const { sendSupportEmail } = await import('../services/emailSupportService');
    await sendSupportEmail(clientId, inquiry.senderEmail, `Re: ${inquiry.subject}`, message, `<p>${message.replace(/\n/g, '<br/>')}</p>`, {
      inReplyTo: threadId,
      references: threadId
    });

    // If inquiry was closed, reopen it
    let newStatus = inquiry.status;
    if (inquiry.status === 'closed' || inquiry.status === 'archived') {
      newStatus = 'inbox'; // Move back to open/inbox
      inquiry.status = newStatus;
    }
    
    // Append reply to body (simplified thread tracking)
    inquiry.body = `${inquiry.body}\n\n--- Reply from Support ---\n${message}`;
    await inquiry.save();

    envRes.sendSuccess({ success: true, status: newStatus, inquiry });
  } catch (error: any) {
    console.error('[INQUIRY_REPLY] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to send reply', error.message);
  }
});

export default router;
