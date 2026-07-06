import { Lead, Settings, Client, Contact } from './models';

export async function upsertLead(params: {
  clientId: string;
  email: string;
  phone: string;
  name?: string;
  source: 'form' | 'booking' | 'contact' | 'ai';
  location?: any;
  data?: any;
  tags?: string[];
}) {
  const emailLower = (params.email || '').toLowerCase().trim();
  const phoneClean = (params.phone || '').replace(/\D/g, '');

  if (!emailLower && !phoneClean) {
     console.error('[LEAD] Cannot upsert lead without email or phone');
     return null;
  }

  // Build query criteria for deduplication
  const criteria: any = { clientId: params.clientId };
  const or = [];
  if (emailLower) or.push({ contactEmail: emailLower });
  if (phoneClean) or.push({ contactPhone: params.phone.trim() });
  
  let lead = null;
  if (or.length > 0) {
    lead = await Lead.findOne({ ...criteria, $or: or });
  }

  const nameParts = (params.name || '').trim().split(/\s+/);
  const contactFirst = nameParts[0] || '';
  const contactLast = nameParts.slice(1).join(' ') || '';

  // Normalize params.data to be a plain object, parsing it if it is a JSON-serialized string
  let incomingData: any = {};
  if (params.data) {
    if (typeof params.data === 'string') {
      try {
        incomingData = JSON.parse(params.data);
      } catch (e) {
        incomingData = { rawValue: params.data };
      }
    } else if (typeof params.data === 'object') {
      if (params.data instanceof Map) {
        incomingData = Object.fromEntries(params.data);
      } else {
        // Safe cloning that handles standard objects
        try {
          incomingData = JSON.parse(JSON.stringify(params.data));
        } catch (e) {
          incomingData = { ...params.data };
        }
      }
    }
  }

  // Extract form info if present in data
  const formId = incomingData.formId;
  const formName = incomingData.formName || 'General Inquiry';
  const stage = incomingData.stage || 'New';
  const score = incomingData.score || 50;

  if (lead) {
    console.log(`[LEAD] Updating existing lead: ${lead._id} for client: ${params.clientId}`);
    // Update existing lead
    lead.lastActivity = new Date();
    // Append tags
    const currentTags = lead.tags || [];
    const newTags = new Set([...currentTags, ...(params.tags || [])]);
    if (params.source === 'booking') newTags.add('from booking');
    if (params.source === 'contact') newTags.add('from contact');
    if (params.source === 'ai') newTags.add('from ai-chat');
    
    lead.tags = Array.from(newTags);
    
    // Update score if higher
    if (score > (lead.score || 0)) lead.score = score;
    
    // Merge data safely extraction of Mongoose Map
    let existingData: any = {};
    if (lead.data) {
      if (typeof lead.data.toJSON === 'function') {
        existingData = lead.data.toJSON();
      } else if (lead.data instanceof Map) {
        existingData = Object.fromEntries(lead.data);
      } else if (typeof lead.data === 'object') {
        existingData = { ...lead.data };
      }
    }
    lead.data = { ...existingData, ...incomingData };

    // Update name if missing or placeholder
    if (!lead.contactFirst || lead.contactFirst === 'New' || lead.contactFirst === 'User') lead.contactFirst = contactFirst;
    if (!lead.contactLast || lead.contactLast === 'Lead' || lead.contactLast === 'Import') lead.contactLast = contactLast;
    
    if (emailLower && !lead.contactEmail) lead.contactEmail = emailLower;
    if (params.phone && !lead.contactPhone) lead.contactPhone = params.phone.trim();

    // Update form info if not set
    if (formId && !lead.formId) lead.formId = formId;

    // Add activity
    lead.activities.push({
      type: 'system',
      description: `Lead updated via ${params.source} activity`,
      date: new Date(),
      metadata: { source: params.source, ...incomingData }
    });
    
    await lead.save();
    try {
      await syncLeadAndContact(params.clientId, emailLower, params.phone, { name: params.name, location: params.location });
    } catch (e) {}
    return lead;
  } else {
    console.log(`[LEAD] Creating new lead for client: ${params.clientId} source: ${params.source}`);
    // Create new lead
    const tags = params.tags || [];
    if (params.source === 'booking') tags.push('from booking');
    if (params.source === 'contact') tags.push('from contact');
    if (params.source === 'ai') tags.push('from ai-chat');

    const createdLead = await Lead.create({
      clientId: params.clientId,
      formId,
      formName,
      contactFirst,
      contactLast,
      contactEmail: emailLower,
      contactPhone: params.phone ? params.phone.trim() : '',
      source: params.source,
      location: params.location,
      tags,
      stage,
      score,
      data: incomingData,
      lastActivity: new Date(),
      activities: [{
        type: 'system',
        description: `Lead initialized via ${params.source}`,
        date: new Date(),
        metadata: { source: params.source }
      }]
    });

    try {
      await syncLeadAndContact(params.clientId, emailLower, params.phone, { name: params.name, location: params.location });
    } catch (e) {}

    return createdLead;
  }
}

export async function syncLeadAndContact(
  clientId: string,
  email: string,
  phone: string,
  extra?: { telegramUsername?: string; telegramChatId?: string; whatsappJid?: string; location?: any; name?: string }
) {
  const emailLower = email ? email.toLowerCase().trim() : '';
  const phoneClean = phone ? phone.replace(/\D/g, '') : '';

  if (!emailLower && !phoneClean && !extra?.telegramChatId && !extra?.whatsappJid) return;

  try {
    // 1. Locate Lead
    const leadCriteria: any[] = [];
    if (emailLower) leadCriteria.push({ contactEmail: emailLower });
    if (phoneClean) {
      const rawPattern = phoneClean.slice(-8); // compare last 8 digits
      leadCriteria.push({ contactPhone: new RegExp(rawPattern) });
    }
    if (extra?.telegramChatId) leadCriteria.push({ 'data.telegramChatId': extra.telegramChatId });
    if (extra?.whatsappJid) leadCriteria.push({ 'data.whatsappJid': extra.whatsappJid });

    let lead = await Lead.findOne({ clientId, $or: leadCriteria });

    // 2. Locate Contact
    const contactCriteria: any[] = [];
    if (emailLower) contactCriteria.push({ email: emailLower });
    if (phoneClean) {
      const rawPattern = phoneClean.slice(-8);
      contactCriteria.push({ phone: new RegExp(rawPattern) });
    }
    if (extra?.telegramChatId) contactCriteria.push({ telegramChatId: extra.telegramChatId });
    if (extra?.whatsappJid) contactCriteria.push({ whatsappJid: extra.whatsappJid });

    let contact = await Contact.findOne({ clientId, $or: contactCriteria });

    if (lead && contact) {
      console.log(`[SYNC-CROSS] Linking Lead (${lead._id}) and Contact (${contact._id}) together...`);
      let changed = false;

      // Contact -> Lead
      const existingData = lead.data instanceof Map ? Object.fromEntries(lead.data) : (lead.data || {});
      let updatedData = { ...existingData };

      if (contact.telegramChatId && existingData.telegramChatId !== contact.telegramChatId) {
        updatedData.telegramChatId = contact.telegramChatId;
        changed = true;
      }
      if (contact.telegramUsername && existingData.telegramUsername !== contact.telegramUsername) {
        updatedData.telegramUsername = contact.telegramUsername;
        changed = true;
      }
      if (contact.whatsappJid && existingData.whatsappJid !== contact.whatsappJid) {
        updatedData.whatsappJid = contact.whatsappJid;
        changed = true;
      }
      if (contact.location && contact.location.city && (!lead.location || !lead.location.city || lead.location.city === 'Unknown')) {
        lead.location = contact.location;
        changed = true;
      }

      // Lead -> Contact
      let contactChanged = false;
      if (lead.contactEmail && contact.email !== lead.contactEmail) {
        contact.email = lead.contactEmail;
        contactChanged = true;
      }
      if (lead.contactPhone && contact.phone !== lead.contactPhone) {
        contact.phone = lead.contactPhone;
        contactChanged = true;
      }
      if (lead.location && lead.location.city && (!contact.location || !contact.location.city || contact.location.city === 'Unknown')) {
        contact.location = lead.location;
        contactChanged = true;
      }

      if (changed || !lead.contactId) {
        await Lead.updateOne({ _id: lead._id }, { $set: { contactId: contact._id, data: updatedData, location: lead.location } });
      }
      if (contactChanged) {
        await Contact.updateOne({ _id: contact._id }, { $set: { email: contact.email, phone: contact.phone, location: contact.location } });
      }
    }
  } catch (err) {
    console.warn('[SYNC-CROSS-ERROR]', err);
  }
}
