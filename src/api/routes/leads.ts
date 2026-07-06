import express from 'express';
import { Lead, Booking, Contact, Client, Notification, Ticket, Conversation } from '../models';
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
    let lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, clientId },
      { $set: req.body },
      { returnDocument: 'after' }
    );

    if (!lead) {
      // Check if ID is from Booking or Contact
      const b = await Booking.findOne({ _id: req.params.id, clientId });
      const c = await Contact.findOne({ _id: req.params.id, clientId });
      
      const email = b?.email || c?.email || req.body.contactEmail;
      const name = b?.fullName || c?.name;
      const phone = b?.phoneNumber || b?.customerPhone || c?.phone || req.body.contactPhone;
      
      if (b || c || email || phone) {
        lead = await Lead.create({
          clientId,
          contactId: c?._id || b?.contactId,
          contactEmail: email,
          contactPhone: phone,
          contactFirst: name?.split(' ')[0] || req.body.contactFirst,
          contactLast: name?.split(' ').slice(1).join(' ') || req.body.contactLast,
          source: b ? 'booking' : 'contact',
          stage: 'New',
          ...req.body
        });
      }
    }

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
            contactId: c?._id || b?.contactId,
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
              contactId: c?._id || b?.contactId,
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
         title: 'Deal Closed!',
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

router.get('/:id/unified', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const id = req.params.id;
    const mongoose = await import('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return envRes.sendError(400, 'BAD_REQUEST', 'Invalid customer seed ID format');
    }
    console.log(`[UNIFIED] Fetching unified customer profile for seed ID: ${id}`);

    // 1. Locate the seed document from of any of the collections
    let email: string[] = [];
    let phone: string[] = [];
    let name = '';
    let telegramChatId = '';
    let telegramUsername = '';
    let whatsappJid = '';

    const [lead, booking, contact, conversation] = await Promise.all([
      Lead.findOne({ _id: id, clientId }).lean(),
      Booking.findOne({ _id: id, clientId }).lean(),
      Contact.findOne({ _id: id, clientId }).lean(),
      Conversation.findOne({ _id: id, clientId }).lean()
    ]);

    if (lead) {
      if (lead.contactEmail) email.push(lead.contactEmail.toLowerCase().trim());
      if (lead.contactPhone) phone.push(lead.contactPhone.replace(/\D/g, ''));
      name = `${lead.contactFirst || ''} ${lead.contactLast || ''}`.trim();
      if (lead.data?.telegramChatId) telegramChatId = String(lead.data.telegramChatId);
      if (lead.data?.telegramUsername) telegramUsername = String(lead.data.telegramUsername);
      if (lead.data?.whatsappJid) whatsappJid = String(lead.data.whatsappJid);
    } else if (booking) {
      if (booking.email) email.push(booking.email.toLowerCase().trim());
      if (booking.phoneNumber) phone.push(booking.phoneNumber.replace(/\D/g, ''));
      name = booking.fullName;
    } else if (contact) {
      if (contact.email) email.push(contact.email.toLowerCase().trim());
      if (contact.phone) phone.push(contact.phone.replace(/\D/g, ''));
      name = contact.name;
      if (contact.telegramChatId) telegramChatId = contact.telegramChatId;
      if (contact.telegramUsername) telegramUsername = contact.telegramUsername;
      if (contact.whatsappJid) whatsappJid = contact.whatsappJid;
    } else if (conversation) {
      name = conversation.customerName;
      if (conversation.platform === 'telegram') {
        telegramChatId = conversation.customerJid;
      } else if (conversation.platform === 'whatsapp') {
        whatsappJid = conversation.customerJid;
        const potentialPhone = conversation.customerJid.split('@')[0];
        if (potentialPhone) phone.push(potentialPhone.replace(/\D/g, ''));
      }
    } else {
      return envRes.sendError(404, 'NOT_FOUND', 'Seed customer record not found');
    }

    // Expand search criteria using seed details
    // Gather all matching emails and phones from any matching document
    const queryEmail = email.filter(Boolean);
    const queryPhone = phone.filter(Boolean);

    const conditions: any[] = [];
    if (queryEmail.length > 0) {
      conditions.push({ contactEmail: { $in: queryEmail } });
      conditions.push({ email: { $in: queryEmail } });
      conditions.push({ customerEmail: { $in: queryEmail } });
    }
    if (queryPhone.length > 0) {
      const phoneRegexes = queryPhone.map(p => new RegExp(p.slice(-8)));
      conditions.push({ contactPhone: { $in: phoneRegexes } });
      conditions.push({ phoneNumber: { $in: phoneRegexes } });
      conditions.push({ phone: { $in: phoneRegexes } });
    }
    if (telegramChatId) {
      conditions.push({ telegramChatId });
      conditions.push({ customerJid: telegramChatId });
      conditions.push({ 'data.telegramChatId': telegramChatId });
    }
    if (telegramUsername) {
      conditions.push({ telegramUsername });
      conditions.push({ 'data.telegramUsername': telegramUsername });
    }
    if (whatsappJid) {
      conditions.push({ whatsappJid });
      conditions.push({ customerJid: whatsappJid });
      conditions.push({ 'data.whatsappJid': whatsappJid });
    }

    const searchQuery = conditions.length > 0 ? { clientId, $or: conditions } : { clientId, _id: id };

    // Fetch related records
    const [allLeads, allBookings, allContacts, allConversations, allTickets] = await Promise.all([
      Lead.find(searchQuery).lean(),
      Booking.find(searchQuery).lean(),
      Contact.find(searchQuery).lean(),
      Conversation.find({ clientId, customerJid: { $in: [telegramChatId, whatsappJid].filter(Boolean) } }).sort({ updatedAt: -1 }).lean(),
      Ticket.find(searchQuery).lean()
    ]);

    // Consolidate list of emails, phones
    allLeads.forEach((l: any) => {
      if (l.contactEmail && !email.includes(l.contactEmail.toLowerCase().trim())) email.push(l.contactEmail.toLowerCase().trim());
      if (l.contactPhone && !phone.includes(l.contactPhone.replace(/\D/g, ''))) phone.push(l.contactPhone.replace(/\D/g, ''));
    });
    allBookings.forEach((b: any) => {
      if (b.email && !email.includes(b.email.toLowerCase().trim())) email.push(b.email.toLowerCase().trim());
      if (b.phoneNumber && !phone.includes(b.phoneNumber.replace(/\D/g, ''))) phone.push(b.phoneNumber.replace(/\D/g, ''));
    });
    allContacts.forEach((c: any) => {
      if (c.email && !email.includes(c.email.toLowerCase().trim())) email.push(c.email.toLowerCase().trim());
      if (c.phone && !phone.includes(c.phone.replace(/\D/g, ''))) phone.push(c.phone.replace(/\D/g, ''));
      if (c.telegramChatId && !telegramChatId) telegramChatId = c.telegramChatId;
      if (c.telegramUsername && !telegramUsername) telegramUsername = c.telegramUsername;
      if (c.whatsappJid && !whatsappJid) whatsappJid = c.whatsappJid;
    });

    // Extract best location
    let finalLocation = { city: 'Unknown', country: 'Unknown', region: 'Unknown' };
    const docsWithLocation = [...allLeads, ...allBookings, ...allContacts];
    for (const d of docsWithLocation) {
      if (d.location && d.location.city && d.location.city !== 'Unknown' && d.location.city !== 'Local') {
        finalLocation = {
          city: d.location.city,
          country: d.location.country || 'Unknown',
          region: d.location.region || 'Unknown'
        };
        break;
      }
    }

    // Compile a beautiful timeline/activity profile
    const activities: any[] = [];
    allLeads.forEach((l: any) => {
      if (l && l.activities) {
        l.activities.forEach((act: any) => {
          if (!act) return;
          activities.push({
            type: act.type || 'system',
            description: act.description,
            date: act.date || l.updatedAt || l.createdAt,
            metadata: { ...act.metadata, source: 'Lead' }
          });
        });
      }
    });

    allConversations.forEach((conv: any) => {
      if (conv && conv.messages) {
        conv.messages.forEach((msg: any) => {
          if (!msg) return;
          activities.push({
            type: conv.platform === 'telegram' ? 'telegram' : 'whatsapp',
            description: `${msg.sender === 'customer' ? 'Customer' : 'AI Assistant'}: ${msg.text || ''}`,
            date: msg.timestamp || msg.date || conv.updatedAt || new Date(),
            metadata: { incoming: msg.sender === 'customer', body: msg.text, platform: conv.platform }
          });
        });
      }
    });

    allBookings.forEach((b: any) => {
      if (!b) return;
      activities.push({
        type: 'booking',
        description: `Booked appointment for ${b.serviceSelection || 'services'} on ${b.preferredDate || 'N/A'} at ${b.preferredStartTime || 'N/A'}`,
        date: b.createdAt || b.preferredDate || new Date(),
        metadata: { bookingId: b._id, status: b.status }
      });
    });

    allTickets.forEach((t: any) => {
      if (!t) return;
      activities.push({
        type: 'ticket',
        description: `Support Ticket: "${t.subject || 'No Subject'}" (Status: ${t.status || 'open'})`,
        date: t.createdAt || new Date(),
        metadata: { ticketId: t._id, status: t.status }
      });
    });

    allContacts.forEach((c: any) => {
      if (c && c.source === 'web_form') {
        activities.push({
          type: 'email',
          description: `Submitted web form inquiry: "${c.subject || 'Inquiry'}" - ${c.message || ''}`,
          date: c.createdAt || new Date(),
          metadata: { contactId: c._id }
        });
      }
    });

    // Filter out activities without dates and sort timeline descending (newest first)
    const validActivities = activities.filter(a => a.date && !isNaN(new Date(a.date).getTime()));
    validActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const profile = {
      name: name || (lead ? `${lead.contactFirst || ''} ${lead.contactLast || ''}`.trim() : (booking?.fullName || contact?.name || conversation?.customerName || 'Unified Customer')),
      emails: [...new Set(email.filter(Boolean))],
      phones: [...new Set(phone.filter(Boolean))],
      telegramChatId,
      telegramUsername,
      whatsappJid,
      location: finalLocation,
      leads: allLeads,
      leadRating: allLeads[0]?.leadRating || 'none',
      bookings: allBookings,
      contacts: allContacts,
      tickets: allTickets,
      conversations: allConversations,
      timeline: validActivities
    };

    envRes.sendSuccess(profile);
  } catch (err: any) {
    console.error('[UNIFIED_PROFILE_ERROR]', err);
    envRes.sendError(500, 'API_ERROR', 'Failed to trace unified profile: ' + err.message);
  }
});

router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  try {
    const id = req.params.id;
    await Promise.all([
      Lead.findOneAndDelete({ _id: id, clientId }),
      Contact.findOneAndDelete({ _id: id, clientId }),
      Booking.findOneAndDelete({ _id: id, clientId })
    ]);
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to delete lead');
  }
});

// DELETE /v1/leads - Bulk delete leads
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

    await Promise.all([
      Lead.deleteMany({ _id: { $in: ids }, clientId }),
      Contact.deleteMany({ _id: { $in: ids }, clientId }),
      Booking.deleteMany({ _id: { $in: ids }, clientId })
    ]);

    envRes.sendSuccess({ success: true, message: `${ids.length} leads successfully deleted.` });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_ERROR', err.message);
  }
});

export default router;
