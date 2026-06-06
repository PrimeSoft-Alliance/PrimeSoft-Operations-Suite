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

  if (req.user?.role === 'superadmin' && (queryCid || headerCid)) {
    cid = queryCid || headerCid;
  }

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
    // 1. Fetch all leads and bookings
    console.log(`[LEADS] Querying Leads collection for ${clientId}`);
    
    // For SuperAdmin, if clientId is platform-prime (the host default) or missing, they might want to see EVERYTHING.
    // However, let's be explicit. If clientId is 'all' and req.user.role === 'superadmin', return all.
    const user = (req as any).user;
    const isSuperAdminAll = user?.role === 'superadmin' && (!req.headers['x-client-id'] || req.headers['x-client-id'] === 'all');
    
    const leadQuery = isSuperAdminAll ? {} : { clientId };
    const bookingQuery = isSuperAdminAll ? {} : { clientId };

    const [leadsRaw, bookings, client] = await Promise.all([
      Lead.find(leadQuery).lean(),
      Booking.find(bookingQuery).lean(),
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
        location: { city: 'Unknown', country: 'Unknown' },
        createdAt: b.createdAt,
        lastActivity: b.createdAt,
        type: 'booking',
        data: {
          service: b.serviceSelection || b.serviceName,
          date: b.preferredDate || b.date,
          time: b.preferredStartTime || b.time,
          notes: b.notes
        }
      }))
    ];

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Deduplicate by email and phone
    const deduplicatedMap = new Map();
    
    combined.forEach(record => {
      const emailMatch = record.contactEmail ? String(record.contactEmail).toLowerCase().trim() : null;
      const phoneMatch = record.contactPhone ? String(record.contactPhone).toLowerCase().trim() : null;
      // If neither email nor phone is present, use ID so it doesn't get squashed with others
      const dedupeKey = emailMatch || phoneMatch || record._id.toString();

      if (deduplicatedMap.has(dedupeKey)) {
        const existing = deduplicatedMap.get(dedupeKey);
        if (existing.source !== record.source && existing.source !== 'multi-channel') {
          existing.source = 'multi-channel';
        }
        existing.lastActivity = new Date(Math.max(new Date(existing.lastActivity || 0).getTime(), new Date(record.lastActivity || record.createdAt || 0).getTime()));
        if (!existing.formName && record.formName) existing.formName = record.formName;
        if (!existing.contactPhone && record.contactPhone) existing.contactPhone = record.contactPhone;
        if (!existing.contactEmail && record.contactEmail) existing.contactEmail = record.contactEmail;
        deduplicatedMap.set(dedupeKey, existing);
      } else {
        deduplicatedMap.set(dedupeKey, { ...record });
      }
    });

    const finalLeads = Array.from(deduplicatedMap.values());
    finalLeads.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`[LEADS] Found ${finalLeads.length} combined records for ${clientId}`);

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
