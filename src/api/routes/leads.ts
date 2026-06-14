import express from 'express';
import { Lead, Booking, Contact, Client } from '../models';
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
