import express from 'express';
import { aiOrchestrator } from '../services/aiOrchestrator';
import { extractionService } from '../utils/extraction';
import { analyticsService } from '../services/analyticsService';
import { MissedCall } from '../models';
import { Contact, Lead, Client } from '../models';

const router = express.Router();

// 0. Client Settings
router.get('/client-settings/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ success: true, data: client });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Unified AI Endpoint
router.post('/ai/chat', async (req, res) => {
  const { message, sessionId, imageUrl } = req.body;
  const clientId = (req as any).clientId;

  try {
    const aiResult = await aiOrchestrator.processMessage({
      clientId,
      sessionId,
      platform: 'web',
      message: message,
      imageUrl: imageUrl || undefined
    });

    res.json({ success: true, data: aiResult?.response, imageUrl: aiResult?.imageUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Advanced Analytics
router.get('/analytics/dashboard', async (req, res) => {
  const clientId = (req as any).clientId;
  try {
    const data = await analyticsService.getDashboardSummary(clientId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Missed Calls List
router.get('/missed-calls', async (req, res) => {
  const clientId = (req as any).clientId;
  const { status = 'new' } = req.query;

  try {
    const query: any = { clientId };
    if (status !== 'all') {
      query.status = status;
    }

    const calls = await (MissedCall as any).find(query)
      .populate('contactId')
      .populate('leadId')
      .sort({ timestamp: -1 })
      .lean();

    res.json({ success: true, data: { calls } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Missed Calls - Submit Outreach & Reach Out
router.post('/missed-calls/:id/reached-out', async (req, res) => {
  const clientId = (req as any).clientId;
  const { id } = req.params;
  const { name, phone, email, notes, outcome, leadStage } = req.body;

  try {
    const missedCall = await (MissedCall as any).findOne({ _id: id, clientId });
    if (!missedCall) {
      return res.status(404).json({ success: false, error: 'Missed call not found' });
    }

    // 1. Create or update Contact to keep relationships sync'd
    let contact = await Contact.findOne({ clientId, $or: [{ phone: phone || missedCall.callerNumber }, { email }] });
    if (!contact) {
      contact = await Contact.create({
        clientId,
        name: name || `Caller ${phone || missedCall.callerNumber}`,
        phone: phone || missedCall.callerNumber,
        email: email || undefined,
        message: notes || 'Callback outreach notes.',
        source: 'phone'
      });
    } else {
      if (name) contact.name = name;
      if (email) contact.email = email;
      if (phone) contact.phone = phone;
      await contact.save();
    }

    // 2. Create or update CRM Lead
    let lead = await Lead.findOne({ clientId, $or: [{ contactEmail: email }, { contactPhone: phone || missedCall.callerNumber }] });
    if (!lead) {
      lead = await Lead.create({
        clientId,
        contactId: contact._id,
        source: 'chatbot',
        contactFirst: name ? name.split(' ')[0] : 'Unknown',
        contactLast: name ? name.split(' ').slice(1).join(' ') : '',
        contactEmail: email || undefined,
        contactPhone: phone || missedCall.callerNumber,
        stage: leadStage === 'new' ? 'New' : leadStage === 'warm' ? 'Contacted' : 'Qualified',
        activities: [{
          type: 'call',
          description: `Logged outreach callback for missed call. Outcome: ${outcome}. Notes: ${notes}`
        }]
      });
    } else {
      lead.activities.push({
        type: 'call',
        description: `Logged callback outreach. Outcome: ${outcome}. Notes: ${notes}`
      });
      lead.lastActivity = new Date();
      await lead.save();
    }

    // 3. Update Missed Call
    missedCall.status = 'reached_out';
    missedCall.outreachNotes = notes;
    missedCall.outreachOutcome = outcome;
    missedCall.contactId = contact._id;
    missedCall.leadId = lead._id;
    await missedCall.save();

    res.json({ success: true, message: 'Outreach saved successfully', data: { missedCall, contact, lead } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
