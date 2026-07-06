import express from 'express';
import { Lead, Settings, UsageStats, Client, Contact, Conversation } from '../models';
import { identityService } from '../services/identityService';
import { sendEmail } from '../email';
import { EnvelopeResponse } from '../middlewares/envelope';
import { resolveClientId } from '../utils/resolveClient';
import { contactClassifier } from '../utils/classifier';
import { ContactImporter } from '../services/contactImporter';

const router = express.Router();

// Helper to get client ID
function getCid(req: any): string {
  return req.headers['x-client-id']?.toString() || req.query.clientId?.toString() || '';
}

// Automatic Telegram Chat ID Detail Resolver
// Ensures every client chatting via Telegram gets their username as @username and a phone number automatically
async function autoResolveTelegramDetails(clientId: string, chatId: string, originalUsername?: string, originalPhone?: string) {
  try {
    let username = originalUsername || '';
    if (username && !username.startsWith('@')) {
      username = '@' + username;
    }

    let phone = originalPhone || '';
    
    // In order to acquire their number automatically using their chat ID:
    // 1. Check if we have a Booking or Lead with this chatId or name containing their phone
    if (!phone) {
      const matchBooking = await Lead.findOne({ 
        clientId, 
        $or: [
          { 'data.telegramChatId': chatId },
          { 'data.sessionId': chatId }
        ] 
      });
      if (matchBooking && matchBooking.contactPhone) {
        phone = matchBooking.contactPhone;
      }
    }

    // 2. Do not fallback to a mock number. If no phone is found, leave it empty.
    if (!phone) {
      phone = ''; 
    }

    return { username, phone };
  } catch (e) {
    return { 
      username: originalUsername ? (originalUsername.startsWith('@') ? originalUsername : '@' + originalUsername) : '',
      phone: originalPhone || ''
    };
  }
}

// GET /v1/contacts - Central directory representing all segments
router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Target client could not be identified');

    // Retrieve active chat sessions and the persistence directories
    const [conversations, DBContacts, leads] = await Promise.all([
      Conversation.find({ clientId }).sort({ updatedAt: -1 }).lean(),
      Contact.find({ clientId }).sort({ updatedAt: -1 }).lean(),
      Lead.find({ clientId }).lean()
    ]);

    // Active linking/sync database helper:
    // "Sync contacts if user email and name is gotten from WhatsApp or Telegram or both but if on widget let it just be only on email contact until user chat on any of the social platforms then it will now link it to the account"
    const syncedContactsMap = new Map<string, any>();

    // 1. Seed with plain DB contacts (Inquiries, manual additions, imported CSVs)
    for (const c of DBContacts) {
      // Create a unique key for matching/merging
      const emailKey = c.email ? c.email.toLowerCase().trim() : '';
      const nameKey = c.name ? c.name.toLowerCase().trim() : '';
      
      const key = emailKey || nameKey;
      if (key) {
        syncedContactsMap.set(key, { ...c, id: c._id });
      } else {
        syncedContactsMap.set(c._id.toString(), { ...c, id: c._id });
      }
    }

    // 2. Merge details from active social channel conversations
    for (const conv of conversations) {
      const lastMsgObj = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
      
      // Determine if there is an email/name record from Widget to link!
      let matchedContactKey = '';
      let isMatched = false;

      // Find if we have a match in leads/contacts
      const matchedLead = leads.find((l: any) => {
        const leadPhone = l.contactPhone ? String(l.contactPhone).replace(/\D/g, '') : '';
        const convPhone = conv.customerJid.split('@')[0].replace(/\D/g, '');
        return (l.data?.whatsappJid === conv.customerJid) || 
               (l.data?.telegramChatId === conv.customerJid) ||
               (convPhone && leadPhone && (leadPhone.includes(convPhone) || convPhone.includes(leadPhone)));
      });

      const customerRawName = conv.customerName || '';
      for (const [key, existing] of Array.from(syncedContactsMap.entries())) {
        // Match condition: name matches, or chat ID / JID matches, or linked previously
        const nameMatch = customerRawName && existing.name && existing.name.toLowerCase().trim() === customerRawName.toLowerCase().trim();
        const telegramMatch = conv.platform === 'telegram' && existing.telegramChatId === conv.customerJid;
        const whatsappMatch = conv.platform === 'whatsapp' && existing.whatsappJid === conv.customerJid;
        
        if (nameMatch || telegramMatch || whatsappMatch || (matchedLead && existing.email === matchedLead.contactEmail)) {
          matchedContactKey = key;
          isMatched = true;
          break;
        }
      }

      const activePlatform: any = conv.platform || 'whatsapp';

      // Auto resolve Telegram specific details if needed using chat ID
      let resolvedTgUser = '';
      let resolvedTgPhone = '';
      if (activePlatform === 'telegram') {
        const resolution = await autoResolveTelegramDetails(clientId, conv.customerJid);
        resolvedTgUser = resolution.username;
        resolvedTgPhone = resolution.phone;
      }

      if (isMatched) {
        // Merge and link active social variables to target email-contact
        const existing = syncedContactsMap.get(matchedContactKey);
        
        // Link! Write social links directly back onto email contact record
        const updatedProps: any = {
          lastMessage: lastMsgObj ? lastMsgObj.text : (existing.lastMessage || ''),
          messageCount: (conv.messages ? conv.messages.length : 0) + (existing.messageCount || 0),
          lastActive: conv.updatedAt || existing.updatedAt || new Date(),
          leadRating: matchedLead?.leadRating || existing.leadRating || 'none',
          platform: activePlatform
        };

        if (activePlatform === 'telegram') {
          updatedProps.telegramChatId = conv.customerJid;
          updatedProps.telegramUsername = existing.telegramUsername || resolvedTgUser;
          updatedProps.phone = existing.phone || resolvedTgPhone;
        } else if (activePlatform === 'whatsapp') {
          updatedProps.whatsappJid = conv.customerJid;
          updatedProps.phone = existing.phone || conv.customerJid.split('@')[0];
        }

        syncedContactsMap.set(matchedContactKey, {
          ...existing,
          ...updatedProps
        });

        // Trigger asynchronous DB update for future persistence
        try {
          await Contact.updateOne(
            { _id: existing.id },
            { 
              $set: { 
                telegramChatId: updatedProps.telegramChatId,
                telegramUsername: updatedProps.telegramUsername,
                whatsappJid: updatedProps.whatsappJid,
                phone: updatedProps.phone
              }
            }
          );
        } catch (dbErr) {}

      } else {
        // No match, register as isolated contact row
        const newContactObj: any = {
          id: conv._id.toString(),
          name: conv.customerName || (activePlatform === 'telegram' ? 'Telegram User' : 'WhatsApp User'),
          customerJid: conv.customerJid,
          platform: activePlatform,
          lastMessage: lastMsgObj ? lastMsgObj.text : '',
          messageCount: conv.messages ? conv.messages.length : 0,
          lastActive: conv.updatedAt || new Date(),
          leadRating: matchedLead?.leadRating || 'none',
          source: activePlatform,
          clientId
        };

        if (activePlatform === 'telegram') {
          newContactObj.telegramChatId = conv.customerJid;
          newContactObj.telegramUsername = resolvedTgUser;
          newContactObj.phone = resolvedTgPhone;
        } else if (activePlatform === 'whatsapp') {
          newContactObj.whatsappJid = conv.customerJid;
          newContactObj.phone = conv.customerJid.split('@')[0];
        }

        syncedContactsMap.set(conv._id.toString(), newContactObj);
      }
    }

    const finalContacts = Array.from(syncedContactsMap.values());
    envRes.sendSuccess(finalContacts);
  } catch (err: any) {
    console.error('[GET_DIRECTORY_ERROR]', err);
    envRes.sendError(500, 'API_ERROR', err.message);
  }
});

// GET /v1/contacts/export-csv - Export all contacts as CSV
router.get('/export-csv', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Missing client credentials');

    const contacts = await Contact.find({ clientId });

    const headers = ['Name', 'Email', 'Phone', 'Telegram Username', 'Telegram Chat ID', 'WhatsApp JID', 'Source', 'Preferred Contact Method', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const c of contacts) {
      const row = [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.telegramUsername || '').replace(/"/g, '""')}"`,
        `"${(c.telegramChatId || '').replace(/"/g, '""')}"`,
        `"${(c.whatsappJid || '').replace(/"/g, '""')}"`,
        `"${(c.source || '').replace(/"/g, '""')}"`,
        `"${(c.preferredContactMethod || 'email').replace(/"/g, '""')}"`,
        `"${new Date(c.createdAt || Date.now()).toISOString()}"`
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.status(200).send(csvContent);
  } catch (err: any) {
    envRes.sendError(500, 'EXPORT_ERROR', err.message);
  }
});

// POST /v1/contacts/classify - Classify plain values or column objects using NLP "natural" or regexes
router.post('/classify', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { values } = req.body; // Array of strings or lines
    if (!values || !Array.isArray(values)) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Request must contain a "values" array.');
    }

    const results = values.map(val => {
      const type = contactClassifier.classify(val);
      return {
        value: val,
        type,
        confidence: type !== 'unknown' ? 0.95 : 0.20
      };
    });

    envRes.sendSuccess(results);
  } catch (err: any) {
    envRes.sendError(500, 'AI_CLASSIFY_ERROR', err.message);
  }
});

// POST /v1/contacts/manual - Create contacts manually typed or classification mapped
router.post('/manual', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    const { name, email, phone, telegramUsername, whatsappJid, isBulk = false } = req.body;
    
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Missing client credentials');
    if (!name) return envRes.sendError(400, 'BAD_REQUEST', 'A contact name is required');

    // Run active lookups for Telegram to ensure usernames have @ prefix and chat ID resolved
    let tgUsername = telegramUsername || '';
    if (tgUsername) {
      if (!tgUsername.startsWith('@')) tgUsername = '@' + tgUsername;
    }

    const newContact = await Contact.create({
      clientId,
      name,
      email: email || '',
      phone: phone || '',
      telegramUsername: tgUsername,
      whatsappJid: whatsappJid || '',
      source: isBulk ? 'csv' : 'manual',
      status: 'resolved'
    });

    // Also sync to Leads structure
    try {
      const nameParts = name.trim().split(' ');
      await Lead.create({
        clientId,
        contactId: newContact._id,
        contactFirst: nameParts[0] || 'Manual',
        contactLast: nameParts.slice(1).join(' ') || 'Import',
        contactEmail: email,
        contactPhone: phone,
        stage: 'Prospect',
        source: isBulk ? 'csv' : 'manual_import',
        data: { telegramUsername: tgUsername, whatsappJid }
      });
    } catch (e) {}

    // Trigger active deduplication & identity linking
    try {
      await identityService.deduplicateAndLinkContacts(clientId);
    } catch (dedupeError) {
      console.error('[MANUAL_DEDUPE_ERROR]', dedupeError);
    }

    // Find the current contact or its merged representative to return
    const finalContact = (await Contact.findOne({ clientId, name, email })) || newContact;

    envRes.sendSuccess(finalContact);
  } catch (err: any) {
    envRes.sendError(500, 'MANUAL_CREATE_ERROR', err.message);
  }
});

// POST /v1/contacts/import-csv - Parse and import contacts from CSV or VCF intelligently using LLM, NLP, ML
router.post('/import-csv', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    const { rows, fileText, fileType = 'auto', dataType = 'All' } = req.body;
    
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Client identification failed');

    let textToParse = fileText || '';
    let typeToUse: 'csv' | 'vcf' | 'auto' = fileType;

    // Fallback: If rows are provided as parsed objects but no raw text, convert back to a simple CSV string
    if (!textToParse && rows && Array.isArray(rows) && rows.length > 0) {
      typeToUse = 'csv';
      const headers = Object.keys(rows[0]);
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(headers.map(h => {
          const val = String(row[h] || '').replace(/"/g, '""');
          return val.includes(',') ? `"${val}"` : val;
        }).join(','));
      }
      textToParse = csvLines.join('\n');
    }

    if (!textToParse) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Missing valid import data. Please upload a CSV or VCF file.');
    }

    // Call the intelligent contact importer service (which uses LLM/Gemini)
    const parsedContacts = await ContactImporter.parseAndValidate(textToParse, typeToUse, dataType);

    const imported = [];
    let skippedCount = 0;

    for (const item of parsedContacts) {
      // Respect user's selected datatype filter:
      if (dataType === 'Email' && (!item.email || !item.email.includes('@'))) {
        skippedCount++;
        continue;
      }
      if (dataType === 'WhatsApp' && !item.whatsappJid && !item.phone) {
        skippedCount++;
        continue;
      }
      if (dataType === 'Telegram' && !item.telegramUsername) {
        skippedCount++;
        continue;
      }
      if (dataType === 'Number' && !item.phone) {
        skippedCount++;
        continue;
      }

      if (item.validationStatus === 'invalid') {
        skippedCount++;
        continue;
      }

      // Save record!
      const contact = await Contact.create({
        clientId,
        name: item.name,
        email: item.email || '',
        phone: item.phone || '',
        telegramUsername: item.telegramUsername || '',
        whatsappJid: item.whatsappJid || '',
        source: typeToUse === 'vcf' ? 'vcf_import' : 'csv_import',
        status: 'resolved'
      });

      imported.push(contact);

      // Save to CRM Leads
      try {
        const nameParts = item.name.trim().split(' ');
        await Lead.create({
          clientId,
          contactId: contact._id,
          contactFirst: nameParts[0],
          contactLast: nameParts.slice(1).join(' ') || '',
          contactEmail: item.email || '',
          contactPhone: item.phone || '',
          stage: 'Prospect',
          source: typeToUse === 'vcf' ? 'vcf_import' : 'csv_import',
          data: { telegramUsername: item.telegramUsername, whatsappJid: item.whatsappJid }
        });
      } catch (lErr) {}
    }

    // Trigger active deduplication & identity linking after importing
    try {
      await identityService.deduplicateAndLinkContacts(clientId);
    } catch (dedupeError) {
      console.error('[IMPORT_DEDUPE_ERROR]', dedupeError);
    }

    envRes.sendSuccess({ 
      count: imported.length, 
      skippedCount, 
      dataType,
      contacts: imported 
    });
  } catch (err: any) {
    console.error('[IMPORT_ROUTE_ERROR]', err);
    envRes.sendError(500, 'IMPORT_ERROR', err.message);
  }
});

// POST /v1/contacts/link - Explicitly link a WhatsApp/Telegram account conversation to an Email profile
router.post('/link', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    const { emailContactId, socialJid, platform } = req.body;
    
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid access credentials');
    
    const contact = await Contact.findOne({ _id: emailContactId, clientId });
    if (!contact) return envRes.sendError(404, 'NOT_FOUND', 'Contact record not found');

    if (platform === 'telegram') {
      const resolution = await autoResolveTelegramDetails(clientId, socialJid);
      contact.telegramChatId = socialJid;
      contact.telegramUsername = resolution.username;
      if (!contact.phone) contact.phone = resolution.phone;
    } else if (platform === 'whatsapp') {
      contact.whatsappJid = socialJid;
      if (!contact.phone) contact.phone = socialJid.split('@')[0];
    }

    await contact.save();
    envRes.sendSuccess({ success: true, contact });
  } catch (err: any) {
    envRes.sendError(500, 'LINK_ERROR', err.message);
  }
});

// POST /v1/contacts/:id - Update Contact details (manual intervention)
router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    const { name, email, phone, telegramUsername, whatsappJid, aiEnabled } = req.body;

    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

    const contact = await Contact.findOne({ _id: req.params.id, clientId });
    if (!contact) return envRes.sendError(404, 'NOT_FOUND', 'Contact record not found');

    if (name) contact.name = name;
    if (email) contact.email = email;
    if (phone) contact.phone = phone;
    if (telegramUsername) {
      contact.telegramUsername = telegramUsername.startsWith('@') ? telegramUsername : '@' + telegramUsername;
    }
    if (whatsappJid) contact.whatsappJid = whatsappJid;
    if (aiEnabled !== undefined) {
      contact.aiEnabled = aiEnabled;
    }

    await contact.save();

    // Trigger active deduplication & identity linking after manual update
    try {
      await identityService.deduplicateAndLinkContacts(clientId);
    } catch (dedupeError) {
      console.error('[UPDATE_DEDUPE_ERROR]', dedupeError);
    }

    // Return the updated contact or its merged representative
    const finalContact = (await Contact.findById(req.params.id)) || contact;
    envRes.sendSuccess(finalContact);
  } catch (err: any) {
    envRes.sendError(500, 'UPDATE_ERROR', err.message);
  }
});

// Standard contact Web form submission
router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const { name, email, phone, subject, message, preferredContactMethod } = req.body;
    const clientId = await resolveClientId(req);
    
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Target client could not be identified');

    const ip = (req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '').split(',')[0].trim();
    let location = { ip, city: 'Unknown', country: 'Unknown' };
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = { ip, city: geoData.city, country: geoData.country };
      }
    } catch (e) {}

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) usage = await UsageStats.create({ clientId, month: currentMonth });

    const clientRecord = await Client.findOne({ clientId });
    let storageLimit = clientRecord?.storageLimitBytes || 52428800;

    if (usage.storageBytesUsed >= storageLimit) {
      return envRes.sendError(401, 'QUOTA_EXCEEDED', 'Storage Limit reached. Cannot accept new messages right now.');
    }

    const nameParts = (name || '').trim().split(' ');
    const contactFirst = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : name;
    const contactLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    const settings = await Settings.findOne({ clientId });

    if (settings) {
      sendEmail(
        settings.contactEmail,
        `New Inquiry: ${subject || 'No Subject'}`,
        `From: ${name}\nEmail: ${email}\nPhone: ${phone}\nPrefers: ${preferredContactMethod}\n\nMessage:\n${message}`,
        undefined,
        clientId
      );
      
      const businessName = settings.businessName || 'our team';
      sendEmail(
        email,
        `Message Received - ${businessName}`,
        `Hello ${name},\n\nWe received your message and will get back to you shortly.\n\nThank you,\n${businessName}`,
        undefined,
        clientId
      );
    }
    
    const contact = await Contact.create({
      clientId,
      name,
      email,
      phone,
      subject: subject || 'General Inquiry',
      message,
      preferredContactMethod,
      location,
      status: 'unread'
    });

    try {
      const { Notification } = await import('../models');
      await Notification.create({
        clientId,
        title: 'New Inquiry Message',
        message: `${name} has sent a new message: "${subject || 'General Inquiry'}"`,
        type: 'alert',
        relatedId: contact._id
      });
      const io = req.app.get('io');
      if (io) io.to(clientId).emit('notification', { title: 'New Inquiry Message', type: 'alert' });
    } catch (err) {}

    // Sync to Leads logic
    let savedLead = null;
    try {
      const criteria: any = { clientId };
      const or = [];
      if (email) or.push({ contactEmail: email.toLowerCase().trim() });
      if (phone) or.push({ contactPhone: phone.trim() });
      
      let existingLead = null;
      if (or.length > 0) existingLead = await Lead.findOne({ ...criteria, $or: or });

      if (existingLead) {
        existingLead.lastActivity = new Date();
        const tags = new Set([...(existingLead.tags || []), 'inquiry']);
        existingLead.tags = Array.from(tags);
        if (location) existingLead.location = location;
        const existingData = existingLead.data instanceof Map ? Object.fromEntries(existingLead.data) : (existingLead.data || {});
        existingLead.data = { ...existingData, lastContactMessage: message, subject, preferredContactMethod };
        
        existingLead.activities.push({
           type: 'email',
           description: `Submitted inquiry: ${subject || 'No Subject'}`,
           date: new Date(),
           metadata: { message }
        });
        
        await existingLead.save();
        savedLead = existingLead;
      } else {
        savedLead = await Lead.create({
          clientId,
          contactId: contact._id,
          contactFirst: contactFirst || 'Unknown',
          contactLast: contactLast || '',
          contactEmail: email,
          contactPhone: phone,
          source: 'contact',
          tags: ['inquiry'],
          stage: 'New',
          location,
          lastActivity: new Date(),
          data: { lastContactMessage: message, subject, preferredContactMethod },
          activities: [{
             type: 'email',
             description: `Submitted inquiry: ${subject || 'No Subject'}`,
             date: new Date(),
             metadata: { message }
          }]
        });
      }
    } catch (err) {
      console.warn('[LEAD-SYNC] Failed to sync contact to lead:', err);
    }

    envRes.sendSuccess(savedLead);
  } catch (error: any) {
    console.error('[CONTACT_ROUTE_ERROR]', error);
    if (error.name === 'ValidationError') {
      return envRes.sendError(400, 'VALIDATION_ERROR', Object.values(error.errors).map((e: any) => e.message).join(', '));
    }
    envRes.sendError(500, 'SERVER_ERROR', 'Contact submission failed: ' + (error.message || 'Unknown error'));
  }
});

// DELETE /v1/contacts/:id - Clean database entries or active conversation trackers
router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

    // Attempt deleting both persistent records and active conversation buffers
    const [contactResult, convResult] = await Promise.all([
      Contact.findOneAndDelete({ _id: req.params.id, clientId }),
      Conversation.findOneAndDelete({ _id: req.params.id, clientId })
    ]);

    if (!contactResult && !convResult) {
      return envRes.sendError(404, 'NOT_FOUND', 'Contact or Conversation session not found');
    }

    envRes.sendSuccess({ success: true, message: 'Contact record purged successfully.' });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_ERROR', err.message);
  }
});

// DELETE /v1/contacts - Bulk delete contacts
router.delete('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Identification failure');

    const idsString = req.body.ids || req.query.ids;
    const ids = Array.isArray(idsString) ? idsString : (typeof idsString === 'string' ? idsString.split(',') : []);

    if (ids.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'No IDs provided for deletion');
    }

    await Promise.all([
      Contact.deleteMany({ _id: { $in: ids }, clientId }),
      Conversation.deleteMany({ _id: { $in: ids }, clientId })
    ]);

    envRes.sendSuccess({ success: true, message: `${ids.length} contacts successfully deleted.` });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_ERROR', err.message);
  }
});

// POST /v1/contacts/mass-send - Broadcast outbound marketing & followups with automatic logs
router.post('/mass-send', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    const { recipients, message, name, type } = req.body; // recipients: Array of { customerJid, platform }

    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid credentials');
    if (!message || !message.trim()) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Message body is required for broadcast');
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Recipients map cannot be empty');
    }

    const { WhatsAppService } = await import('../services/whatsappService');
    const { telegramManager } = await import('../services/telegramManager');
    const { telnyxService } = await import('../services/telnyxService');
    const { TelnyxNumber, Client } = await import('../models');

    const client = await Client.findOne({ clientId });

    const results = [];
    for (const rec of recipients) {
      const { customerJid, platform } = rec;
      const statusObj = { customerJid, platform, success: false, error: '' };

      try {
        if (platform === 'whatsapp') {
          if (!client?.whatsappAccessToken || !client?.whatsappPhoneNumberId) {
            throw new Error('WhatsApp Business API credentials are not configured');
          }
          await WhatsAppService.sendMessage(client.whatsappPhoneNumberId, customerJid, message);
          statusObj.success = true;
        } else if (platform === 'telegram') {
          await telegramManager.sendMessage(clientId, customerJid, { text: message });
          statusObj.success = true;
        } else if (platform === 'sms' || platform === 'mms') {
          const rentedNumber = await TelnyxNumber.findOne({ clientId });
          const fromNumber = rentedNumber?.phoneNumber || '+15555555555';
          await telnyxService.sendSMS(clientId, fromNumber, customerJid, message);
          statusObj.success = true;
        } else if (platform === 'email') {
          await sendEmail(customerJid, name || 'Message from OminiRep', message, undefined, clientId);
          statusObj.success = true;
        } else {
          statusObj.error = 'Unrecognized broadcast channel';
        }

        if (statusObj.success) {
          // Log outbound conversation for messaging platforms to preserve AI memory context
          let conv = await Conversation.findOne({ clientId, customerJid });
          if (!conv) {
            conv = new Conversation({ clientId, customerJid, platform, messages: [] });
          }
          conv.messages.push({
            sender: 'assistant',
            text: message,
            timestamp: new Date()
          });
          await conv.save();
        }
      } catch (err: any) {
        statusObj.error = err.message;
      }
      results.push(statusObj);
    }

    // Auto-save Campaign record
    try {
      const { Campaign } = await import('../models');
      const successCount = results.filter((r: any) => r.success).length;
      const failedCount = results.filter((r: any) => r.error).length;

      const campaign = new Campaign({
        clientId,
        campaignId: 'camp_' + Math.random().toString(36).substring(2, 9),
        name: name || `Broadcast Campaign ${new Date().toLocaleDateString()}`,
        type: type || (recipients[0]?.platform || 'email'),
        status: 'completed',
        metrics: {
          sent: recipients.length,
          delivered: successCount,
          failed: failedCount,
          opened: 0,
          clicked: 0
        }
      });
      await campaign.save();
    } catch (campErr) {
      console.error('[CAMPAIGN_AUTO_SAVE_ERROR]', campErr);
    }

    envRes.sendSuccess({ success: true, results });
  } catch (err: any) {
    envRes.sendError(500, 'MASS_SEND_ERROR', err.message);
  }
});

// POST /v1/contacts/deduplicate - Manually trigger identity consolidation & deduplication
router.post('/deduplicate', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid access credentials');
    
    await identityService.deduplicateAndLinkContacts(clientId);
    envRes.sendSuccess({ success: true, message: 'Deduplication completed successfully' });
  } catch (err: any) {
    envRes.sendError(500, 'DEDUPE_ERROR', err.message);
  }
});

// GET /v1/contacts/campaigns - Retrieve all marketing campaigns for this tenant
router.get('/campaigns', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid access credentials');

    const { Campaign } = await import('../models');
    const campaigns = await Campaign.find({ clientId }).sort({ createdAt: -1 });
    envRes.sendSuccess(campaigns);
  } catch (err: any) {
    envRes.sendError(500, 'FETCH_CAMPAIGNS_ERROR', err.message);
  }
});

// DELETE /v1/contacts/campaigns/:id - Delete a single campaign
router.delete('/campaigns/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid access credentials');

    const { Campaign } = await import('../models');
    const result = await Campaign.findOneAndDelete({ _id: req.params.id, clientId });

    if (!result) {
      return envRes.sendError(404, 'NOT_FOUND', 'Campaign not found');
    }

    envRes.sendSuccess({ success: true, message: 'Campaign deleted successfully.' });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_CAMPAIGN_ERROR', err.message);
  }
});

// DELETE /v1/contacts/campaigns - Bulk delete campaigns
router.delete('/campaigns', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid access credentials');

    const idsString = req.body.ids || req.query.ids;
    const ids = Array.isArray(idsString) ? idsString : (typeof idsString === 'string' ? idsString.split(',') : []);

    if (ids.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'No Campaign IDs provided for deletion');
    }

    const { Campaign } = await import('../models');
    await Campaign.deleteMany({ _id: { $in: ids }, clientId });

    envRes.sendSuccess({ success: true, message: `${ids.length} campaigns successfully deleted.` });
  } catch (err: any) {
    envRes.sendError(500, 'DELETE_CAMPAIGNS_ERROR', err.message);
  }
});

export default router;
