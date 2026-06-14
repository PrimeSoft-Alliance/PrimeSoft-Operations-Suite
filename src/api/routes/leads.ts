import express from 'express';
import { Lead, Booking, Contact, Client, Notification } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';
import { sendEmail } from '../email';
import { emitToClient } from '../utils/socket';

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
  
  cid = String(cid);

  (req as any).clientId = cid;
  return cid;
};

router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  console.log(`[LEADS] Fetching for clientId: ${clientId}`);
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    // 1. Fetch all leads, bookings, and contacts from source collections
    console.log(`[LEADS] Querying Leads, Bookings, Contacts collections for ${clientId}`);
    
    const leadQuery = { clientId };
    const bookingQuery = { clientId };
    const contactQuery = { clientId };

    const [leadsRaw, bookings, contacts, client] = await Promise.all([
      Lead.find(leadQuery).lean(),
      Booking.find(bookingQuery).lean(),
      Contact.find(contactQuery).lean(),
      Client.findOne({ clientId }).lean()
    ]);
    
    // Combine them into a unified format
    const combined = [
      ...leadsRaw.map((l: any) => ({
        ...l,
        stage: l.stage || 'New',
        type: 'lead'
      })),
      ...bookings.map((b: any) => ({
        _id: b._id,
        clientId: b.clientId,
        contactFirst: b.fullName?.split(' ')[0] || b.customerName?.split(' ')[0] || 'Unknown',
        contactLast: b.fullName?.split(' ').slice(1).join(' ') || b.customerName?.split(' ').slice(1).join(' ') || '',
        contactEmail: b.email || b.customerEmail,
        contactPhone: b.phoneNumber || b.customerPhone,
        status: b.status || 'new',
        stage: 'New', // Ensure bookings show up in Kanban
        source: 'booking',
        location: b.location || { city: 'Unknown', country: 'Unknown' },
        createdAt: b.createdAt,
        lastActivity: b.createdAt,
        type: 'booking',
        data: {
          service: b.serviceSelection || b.serviceName,
          date: b.preferredDate || b.date,
          time: b.preferredStartTime || b.time,
          notes: b.notes,
          bookingId: b._id
        }
      })),
      ...contacts.map((c: any) => ({
        _id: c._id,
        clientId: c.clientId,
        contactFirst: c.name?.split(' ')[0] || 'Unknown',
        contactLast: c.name?.split(' ').slice(1).join(' ') || '',
        contactEmail: c.email,
        contactPhone: c.phone,
        status: c.status || 'unread',
        stage: 'New', // Ensure contacts show up in Kanban
        source: 'contact',
        location: c.location || { city: 'Unknown', country: 'Unknown' },
        createdAt: c.createdAt,
        lastActivity: c.createdAt,
        type: 'contact',
        data: {
          subject: c.subject || 'General Inquiry',
          message: c.message,
          contactId: c._id
        }
      }))
    ];

    // Deduplicate by email and phone, prioritize Lead records
    const deduplicatedMap = new Map();
    
    combined.forEach(record => {
      const emailLower = record.contactEmail ? String(record.contactEmail).toLowerCase().trim() : '';
      const phoneClean = record.contactPhone ? String(record.contactPhone).replace(/\D/g, '') : '';
      // If neither email nor phone is present, use ID so it doesn't get squashed with others
      const dedupeKey = emailLower || (phoneClean ? `phone_${phoneClean}` : null) || record._id.toString();

      if (deduplicatedMap.has(dedupeKey)) {
        const existing = deduplicatedMap.get(dedupeKey);
        
        let primary = existing;
        let secondary = record;
        // Prioritize type 'lead' (database collection) because it has the user specified stage/assignment/score
        if (record.type === 'lead' && existing.type !== 'lead') {
          primary = record;
          secondary = existing;
        }

        const mergedTags = Array.from(new Set([
          ...(primary.tags || []),
          ...(secondary.tags || [])
        ]));

        let finalSource = primary.source || secondary.source;
        if (primary.source && secondary.source && primary.source !== secondary.source) {
          finalSource = 'multi-channel';
        }

        const mergedData = {
          ...(secondary.data || {}),
          ...(primary.data || {})
        };

        if (secondary.bookingId || secondary.data?.bookingId) {
          mergedData.bookingId = secondary.bookingId || secondary.data?.bookingId;
        }
        if (secondary.contactId || secondary.data?.contactId) {
          mergedData.contactId = secondary.contactId || secondary.data?.contactId;
        }

        deduplicatedMap.set(dedupeKey, {
          ...secondary,
          ...primary,
          source: finalSource,
          tags: mergedTags,
          data: mergedData,
          lastActivity: new Date(Math.max(
            new Date(primary.lastActivity || primary.createdAt || 0).getTime(),
            new Date(secondary.lastActivity || secondary.createdAt || 0).getTime()
          )),
          _id: primary.type === 'lead' ? primary._id : (secondary.type === 'lead' ? secondary._id : primary._id),
          type: (primary.type === 'lead' || secondary.type === 'lead') ? 'lead' : primary.type
        });
      } else {
        deduplicatedMap.set(dedupeKey, { ...record });
      }
    });

    const finalLeads = Array.from(deduplicatedMap.values());
    finalLeads.sort((a: any, b: any) => new Date(b.createdAt || b.lastActivity || 0).getTime() - new Date(a.createdAt || a.lastActivity || 0).getTime());

    console.log(`[LEADS] Found ${finalLeads.length} combined deduplicated records for ${clientId}`);

    envRes.sendSuccess(finalLeads, { clientId, businessName: client?.businessName });
  } catch (error) {
    console.error('[LEADS_FETCH] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch leads', String(error));
  }
});

router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, clientId },
      { $set: req.body },
      { new: true }
    );
    if (!lead) return envRes.sendError(404, 'NOT_FOUND', 'Lead not found');
    envRes.sendSuccess(lead);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update lead');
  }
});

router.post('/:id/reply', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  const { message, subject } = req.body;

  if (!message) return envRes.sendError(400, 'BAD_REQUEST', 'Message is required');

  try {
    // 1. Find the lead (or create if it's a booking/contact)
    let lead = await Lead.findOne({ _id: req.params.id, clientId });
    
    // If not found by ID, it might be an email/phone from a booking/contact passed as ID if we are clever, 
    // but usually front-end sends the ID it has. 
    // For simplicity, let's assume the frontend sends the Lead ID if it has it, or we handle it.
    
    if (!lead) {
       // Check if ID is from Booking or Contact
       const b = await Booking.findOne({ _id: req.params.id, clientId });
       const c = await Contact.findOne({ _id: req.params.id, clientId });
       
       const email = b?.email || c?.email;
       const name = b?.fullName || c?.name;
       
       if (email) {
          lead = await Lead.create({
            clientId,
            contactEmail: email,
            contactFirst: name?.split(' ')[0],
            contactLast: name?.split(' ').slice(1).join(' '),
            source: b ? 'booking' : 'contact',
            stage: 'New'
          });
       }
    }

    if (!lead || !lead.contactEmail) return envRes.sendError(404, 'NOT_FOUND', 'Lead or contact email not found');

    // 2. Send the actual email
    const finalSubject = subject || `Reply regarding your inquiry`;
    await sendEmail(lead.contactEmail, finalSubject, message, undefined, clientId);

    // 3. Record activity
    lead.activities.push({
      type: 'email',
      description: `Sent email: ${finalSubject}`,
      date: new Date(),
      metadata: { body: message }
    });
    lead.stage = (lead.stage === 'New') ? 'Contacted' : lead.stage;
    lead.lastActivity = new Date();
    await lead.save();

    emitToClient(req, 'activity_update', { leadId: lead._id, activity: lead.activities[lead.activities.length - 1] });
    envRes.sendSuccess({ success: true });
  } catch (err: any) {
    console.error('[LEAD_REPLY] Error:', err);
    envRes.sendError(500, 'API_ERROR', 'Failed to send reply');
  }
});

router.post('/:id/status', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  const { stage } = req.body;

  try {
    let lead = await Lead.findOne({ _id: req.params.id, clientId });
    
    if (!lead) {
        // Handle conversion from booking/contact to lead if needed
        const b = await Booking.findOne({ _id: req.params.id, clientId });
        const c = await Contact.findOne({ _id: req.params.id, clientId });

        const email = b?.email || c?.email;
        const name = b?.fullName || c?.name;

        if (email) {
           lead = await Lead.create({
              clientId,
              contactEmail: email,
              contactFirst: name?.split(' ')[0],
              contactLast: name?.split(' ').slice(1).join(' '),
              source: b ? 'booking' : 'contact',
              stage: 'New'
           });
        }
    }

    if (!lead) return envRes.sendError(404, 'NOT_FOUND', 'Lead not found');

    const oldStage = lead.stage;
    lead.stage = stage;
    lead.activities.push({
      type: 'status_change',
      description: `Changed stage from ${oldStage} to ${stage}`,
      date: new Date()
    });
    lead.lastActivity = new Date();
    await lead.save();

    emitToClient(req, 'lead_update', lead);

    // Notify if Won
    if (stage === 'Closed Won') {
       const notif = await Notification.create({
         clientId,
         title: 'Deal Closed! 🎉',
         message: `Congratulations! ${lead.contactFirst} ${lead.contactLast} has been marked as WON.`,
         type: 'lead',
         relatedId: lead._id
       });
       emitToClient(req, 'notification', notif);
    }

    envRes.sendSuccess(lead);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update status');
  }
});

router.post('/:id/simulate-reply', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  const { message, type = 'email' } = req.body;

  try {
    const lead = await Lead.findOne({ _id: req.params.id, clientId });
    if (!lead) return envRes.sendError(404, 'NOT_FOUND', 'Lead not found');

    const incomingMessage = message || (type === 'whatsapp' ? "Simulated WhatsApp reply." : "This is a simulated reply from the customer.");

    lead.activities.push({
      type: type,
      description: `${type === 'whatsapp' ? 'WhatsApp' : 'Email'} Received: ${incomingMessage.substring(0, 50)}...`,
      date: new Date(),
      metadata: { body: incomingMessage, incoming: true, platform: type }
    });
    lead.lastActivity = new Date();
    await lead.save();

    const notif = await Notification.create({
      clientId,
      title: `New ${type === 'whatsapp' ? 'WhatsApp' : 'Reply'} Received`,
      message: `${lead.contactFirst} replied: "${incomingMessage.substring(0, 30)}..."`,
      type: 'lead',
      relatedId: lead._id
    });

    emitToClient(req, 'activity_update', { leadId: lead._id, activity: lead.activities[lead.activities.length - 1] });
    emitToClient(req, 'notification', notif);

    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Simulation failed');
  }
});

router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    await Lead.findOneAndDelete({ _id: req.params.id, clientId });
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to delete lead');
  }
});

export default router;
