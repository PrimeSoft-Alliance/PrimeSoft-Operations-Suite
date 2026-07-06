import mongoose from 'mongoose';
import { Contact, Lead, Booking, Conversation, Ticket, Inquiry, IdentityGraph, TelegramIdentity, WhatsAppIdentity, WidgetSession, MissedCall } from '../models';
import { notificationService } from './notificationService';
import pino from 'pino';

const logger = pino({ level: 'info' });

export interface IdentityEvidence {
  email?: string;
  phone?: string;
  whatsappJid?: string;
  telegramUserId?: string;
  telegramUsername?: string;
  widgetSessionId?: string;
  name?: string;
}

export class IdentityService {
  /**
   * Resolves a contact based on provided evidence across all channels.
   * Implements the "Contact Merge Rules": If a match exists by any key, merge.
   * If no match exists, create a new contact and lead.
   */
  async resolveContact(clientId: string, evidence: IdentityEvidence, sourceChannel: string): Promise<any> {
    logger.info({ clientId, evidence, sourceChannel }, 'Resolving contact identity');

    const { email, phone, whatsappJid, telegramUserId, widgetSessionId } = evidence;

    let resolvedPhone = phone;
    if (whatsappJid && !resolvedPhone) {
      resolvedPhone = whatsappJid.split('@')[0].replace(/\D/g, '');
    }

    // 1. Identity Key Scoring & Resolution
    const query: any[] = [];
    if (email) query.push({ email: email.toLowerCase() });
    if (resolvedPhone) query.push({ phoneNumber: resolvedPhone });
    // Channel specific identities in the graph
    if (whatsappJid) query.push({ whatsappIdentity: whatsappJid });
    if (telegramUserId) query.push({ telegramId: telegramUserId });
    if (evidence.telegramUsername) {
      let username = evidence.telegramUsername;
      if (!username.startsWith('@')) username = '@' + username;
      query.push({ telegramUsername: username });
    }
    if (widgetSessionId) query.push({ widgetSessionId: widgetSessionId });

    let identityDoc = null;
    if (query.length > 0) {
      identityDoc = await (IdentityGraph as any).findOne({ clientId, $or: query }).populate('contactId');
    }

    let contact: any = identityDoc?.contactId;

    // 2. Legacy Match Fallback (only for data migrated from old systems)
    if (!contact) {
      const legacyQuery: any[] = [];
      if (email) legacyQuery.push({ email: email.toLowerCase() });
      if (resolvedPhone) legacyQuery.push({ phone: resolvedPhone });
      if (telegramUserId) legacyQuery.push({ telegramChatId: telegramUserId });
      if (evidence.telegramUsername) {
        let username = evidence.telegramUsername;
        if (!username.startsWith('@')) username = '@' + username;
        legacyQuery.push({ telegramUsername: username });
      }
      if (whatsappJid) legacyQuery.push({ whatsappJid });
      
      if (legacyQuery.length > 0) {
        contact = await Contact.findOne({ clientId, $or: legacyQuery });
      }
    }

    // 3. Process Evidence and Upsert
    if (contact) {
      logger.info({ contactId: contact._id }, 'Found existing contact');
      
      // Update contact if evidence provides CANONICAL info (real email/phone)
      const updates: any = {};
      if (email && email.toLowerCase() !== contact.email?.toLowerCase()) updates.email = email.toLowerCase();
      if (resolvedPhone && resolvedPhone !== contact.phone) updates.phone = resolvedPhone;
      if (evidence.name && evidence.name !== 'User' && evidence.name !== 'Telegram User' && evidence.name !== 'WhatsApp User' && evidence.name !== contact.name) {
        updates.name = evidence.name;
      }
      if (telegramUserId && !contact.telegramChatId) updates.telegramChatId = telegramUserId;
      if (evidence.telegramUsername && !contact.telegramUsername) {
        let username = evidence.telegramUsername;
        if (!username.startsWith('@')) username = '@' + username;
        updates.telegramUsername = username;
      }
      if (whatsappJid && !contact.whatsappJid) updates.whatsappJid = whatsappJid;
      
      if (Object.keys(updates).length > 0) {
        await Contact.findByIdAndUpdate(contact._id, { $set: updates });
        await Lead.findOneAndUpdate({ contactId: contact._id, clientId }, { $set: updates });
      }
    } else {
      // 4. Creation of New Unified Identity
      
      // If we don't have an email or phone, and NOT on social channel, DO NOT create a permanent Contact/Lead yet.
      if (!email && !resolvedPhone && !telegramUserId && !whatsappJid) {
        logger.info('Anonymous user, returning temporary identity without creating CRM Contact/Lead');
        return { isAnonymous: true, name: evidence.name || 'User', _id: null };
      }

      logger.info('Creating new unified contact record');
      
      // RULE: Never store telegram or WhatsApp name (from social profile)
      // We use a generic "User" name if it's from social channels without a real name provided
      let name = evidence.name || 'User';
      if (sourceChannel === 'telegram' || sourceChannel === 'whatsapp') {
        if (!evidence.name || evidence.name === 'User' || evidence.name === 'Anonymous User') {
          name = sourceChannel === 'telegram' ? 'Telegram User' : 'WhatsApp User';
        }
      }
      
      let username = evidence.telegramUsername || '';
      if (username && !username.startsWith('@')) {
        username = '@' + username;
      }
      
      contact = await Contact.create({
        clientId,
        name,
        email: email?.toLowerCase(),
        phone: resolvedPhone,
        source: sourceChannel,
        telegramChatId: telegramUserId,
        telegramUsername: username,
        whatsappJid: whatsappJid
      });

      // Send CRM Contact Created notification
      notificationService.sendContactCreated(clientId, contact).catch(err => {
        logger.error(`Error sending contact created notification: ${err.message}`);
      });

      // Check if lead already exists before creating
      const leadCriteria: any[] = [];
      if (email) leadCriteria.push({ contactEmail: email.toLowerCase() });
      if (resolvedPhone) leadCriteria.push({ contactPhone: resolvedPhone });
      if (telegramUserId) leadCriteria.push({ 'data.telegramChatId': telegramUserId });
      if (whatsappJid) leadCriteria.push({ 'data.whatsappJid': whatsappJid });
      
      let lead = null;
      if (leadCriteria.length > 0) {
         lead = await Lead.findOne({ clientId, $or: leadCriteria });
      }

      if (!lead) {
        lead = await Lead.create({
          clientId,
          contactId: contact._id,
          contactFirst: name === 'Telegram User' || name === 'WhatsApp User' ? 'New' : name.split(' ')[0],
          contactLast: name === 'Telegram User' || name === 'WhatsApp User' ? 'Lead' : (name.split(' ').slice(1).join(' ') || ''),
          contactEmail: email?.toLowerCase(),
          contactPhone: resolvedPhone,
          source: sourceChannel === 'telegram' || sourceChannel === 'whatsapp' ? 'chatbot' : 'contact',
          stage: 'New',
          data: {
            telegramChatId: telegramUserId,
            telegramUsername: username,
            whatsappJid: whatsappJid
          }
        });
        
        // Send Qualified New Lead notification
        notificationService.sendNewLead(clientId, lead).catch(err => {
          logger.error(`Error sending new lead notification: ${err.message}`);
        });
      }
    }

    // 5. Update Identity Graph for cross-channel tracking
    await this.updateIdentityGraph(clientId, contact._id, evidence, sourceChannel);

    // 6. Run strict deduplication and linking automatically to resolve dynamic merges
    try {
      await this.deduplicateAndLinkContacts(clientId);
      // Reload contact after merge in case it was merged into another contact
      const reloadedContact = await Contact.findById(contact._id);
      if (reloadedContact) {
        contact = reloadedContact;
      } else {
        // Find if this contact's JID/Email is now linked to another contact
        const q: any[] = [];
        if (contact.email) q.push({ email: contact.email });
        if (contact.phone) q.push({ phone: contact.phone });
        if (contact.whatsappJid) q.push({ whatsappJid: contact.whatsappJid });
        if (contact.telegramChatId) q.push({ telegramChatId: contact.telegramChatId });
        if (q.length > 0) {
          const mergedContact = await Contact.findOne({ clientId, $or: q });
          if (mergedContact) contact = mergedContact;
        }
      }
    } catch (dedupeError) {
      logger.error({ err: dedupeError }, 'Automatic deduplication failed after resolveContact');
    }

    return contact;
  }

  async updateAndConsolidate(contactId: string, updates: any): Promise<any> {
    const currentContact = await Contact.findById(contactId);
    if (!currentContact) throw new Error("Contact not found");

    let targetMasterContact = currentContact;
    let needsMerge = false;

    // Email Deduplication
    if (updates.email && updates.email !== currentContact.email) {
      const duplicateEmailContact = await Contact.findOne({ clientId: currentContact.clientId, email: updates.email.trim().toLowerCase() });
      if (duplicateEmailContact && duplicateEmailContact._id.toString() !== contactId) {
        targetMasterContact = duplicateEmailContact;
        needsMerge = true;
      }
    }

    // Phone Deduplication
    if (!needsMerge && updates.phone && updates.phone !== currentContact.phone) {
      const duplicatePhoneContact = await Contact.findOne({ clientId: currentContact.clientId, phone: updates.phone.trim() });
      if (duplicatePhoneContact && duplicatePhoneContact._id.toString() !== contactId) {
        targetMasterContact = duplicatePhoneContact;
        needsMerge = true;
      }
    }

    if (needsMerge) {
      return await this.executeProfileMerge(currentContact, targetMasterContact);
    }

    // Standard update
    const cleanedUpdates: any = {};
    if (updates.name && updates.name.trim() !== '' && updates.name !== 'Anonymous User' && updates.name !== 'User' && updates.name !== 'Telegram User' && updates.name !== 'WhatsApp User') {
      cleanedUpdates.name = updates.name.trim();
    }
    if (updates.email) cleanedUpdates.email = updates.email.trim().toLowerCase();
    if (updates.phone) cleanedUpdates.phone = updates.phone.trim();
    if (updates.telegramUsername) {
      let username = updates.telegramUsername.trim();
      if (!username.startsWith('@')) username = '@' + username;
      cleanedUpdates.telegramUsername = username;
    }
    if (updates.whatsappJid) cleanedUpdates.whatsappJid = updates.whatsappJid.trim();

    if (Object.keys(cleanedUpdates).length === 0) return currentContact;

    const updatedContact = await Contact.findByIdAndUpdate(contactId, { $set: cleanedUpdates }, { new: true });
    await this.calculateLeadScore(contactId);
    return updatedContact;
  }

  private async executeProfileMerge(source: any, target: any): Promise<any> {
    // Combine IDs and fields
    const mergedIdentity: any = {};
    if (!target.telegramUsername && source.telegramUsername) mergedIdentity.telegramUsername = source.telegramUsername;
    if (!target.whatsappJid && source.whatsappJid) mergedIdentity.whatsappJid = source.whatsappJid;
    if (!target.phone && source.phone) mergedIdentity.phone = source.phone;
    if (!target.email && source.email) mergedIdentity.email = source.email;
    
    const targetIsGenericName = !target.name || target.name === 'Anonymous User' || target.name === 'User' || target.name === 'Telegram User' || target.name === 'WhatsApp User';
    const sourceIsRealName = source.name && source.name !== 'Anonymous User' && source.name !== 'User' && source.name !== 'Telegram User' && source.name !== 'WhatsApp User';
    
    if (targetIsGenericName && sourceIsRealName) {
      mergedIdentity.name = source.name;
    }

    if (Object.keys(mergedIdentity).length > 0) {
      await Contact.findByIdAndUpdate(target._id, { $set: mergedIdentity });
    }

    // Re-route tickets, messages, leads
    await Ticket.updateMany({ customerId: source._id.toString() }, { $set: { customerId: target._id.toString() } });
    // Assuming messages is handled by conversation or similar
    await Conversation.updateMany({ contactId: source._id }, { $set: { contactId: target._id } });

    await this.calculateLeadScore(target._id.toString());
    await Contact.findByIdAndDelete(source._id);

    return await Contact.findById(target._id);
  }

  private async calculateLeadScore(contactId: string): Promise<number> {
    const contact = await Contact.findById(contactId);
    if (!contact) return 0;

    let score = 0;
    if (contact.name && contact.name !== 'Anonymous User') score += 20;
    if (contact.email) score += 30;
    if (contact.phone) score += 30;
    if (contact.telegramUsername || contact.whatsappJid) score += 20;

    await Lead.findOneAndUpdate(
      { clientId: contact.clientId, contactId: contact._id },
      { $set: { score, updatedAt: new Date(), contactEmail: contact.email, contactPhone: contact.phone } },
      { upsert: true }
    );

    return score;
  }

  private async updateIdentityGraph(clientId: string, contactId: string, evidence: IdentityEvidence, source: string) {
    const { email, phone, whatsappJid, telegramUserId, widgetSessionId } = evidence;
    
    const set: any = { lastSeenAt: new Date(), sourceChannel: source };
    if (email) set.email = email.toLowerCase();
    if (phone) set.phoneNumber = phone;
    if (whatsappJid) set.whatsappIdentity = whatsappJid;
    if (telegramUserId) set.telegramId = telegramUserId;
    if (evidence.telegramUsername) {
      let username = evidence.telegramUsername;
      if (!username.startsWith('@')) username = '@' + username;
      set.telegramUsername = username;
    }
    if (widgetSessionId) set.widgetSessionId = widgetSessionId;

    await (IdentityGraph as any).findOneAndUpdate(
      { clientId, contactId },
      { $set: set },
      { upsert: true, new: true }
    );
  }

  async syncTelegramIdentity(clientId: string, contactId: string, tgData: any) {
    let username = tgData.username || '';
    if (username && !username.startsWith('@')) {
      username = '@' + username;
    }

    await (TelegramIdentity as any).findOneAndUpdate(
      { clientId, telegramUserId: tgData.id.toString() },
      { 
        $set: {
          contactId,
          chatId: tgData.chat_id?.toString() || tgData.id.toString(),
          username,
          firstName: tgData.first_name,
          lastName: tgData.last_name,
          languageCode: tgData.language_code,
          lastActivityAt: new Date()
        }
      },
      { upsert: true }
    );
    // Sync to Contact table too
    await Contact.findByIdAndUpdate(contactId, {
      telegramUsername: username,
      telegramChatId: tgData.chat_id?.toString() || tgData.id.toString()
    });
    // Trigger deduplication after sync
    await this.deduplicateAndLinkContacts(clientId).catch(() => {});
  }

  async syncWhatsAppIdentity(clientId: string, contactId: string, waData: any) {
    await (WhatsAppIdentity as any).findOneAndUpdate(
      { clientId, whatsappId: waData.jid },
      {
        $set: {
          contactId,
          displayName: waData.name,
          verifiedPhoneNumber: waData.phone,
          transportSource: waData.transport,
          lastActivityAt: new Date()
        }
      },
      { upsert: true }
    );
    // Sync to Contact table too
    await Contact.findByIdAndUpdate(contactId, {
      whatsappJid: waData.jid
    });
    // Trigger deduplication after sync
    await this.deduplicateAndLinkContacts(clientId).catch(() => {});
  }

  /**
   * Evaluates if two contacts likely represent the same real person based on deterministic & fuzzy matching rules.
   */
  private areContactsSimilar(c1: any, c2: any): boolean {
    const email1 = c1.email ? c1.email.toLowerCase().trim() : '';
    const email2 = c2.email ? c2.email.toLowerCase().trim() : '';
    
    // Check if real email matches (excluding placeholders)
    const isRealEmail = (email: string) => 
      email && 
      !email.endsWith('@whatsapp.com') && 
      !email.endsWith('@telegram.com') && 
      !email.endsWith('@import.com') && 
      !email.endsWith('@manual.com');

    if (isRealEmail(email1) && isRealEmail(email2) && email1 === email2) {
      return true;
    }

    // Normalized phone match
    const p1 = c1.phone ? c1.phone.replace(/\D/g, '') : '';
    const p2 = c2.phone ? c2.phone.replace(/\D/g, '') : '';
    if (p1 && p2) {
      // Compare last 8 digits (covers international vs local format difference)
      const p1Tail = p1.slice(-8);
      const p2Tail = p2.slice(-8);
      if (p1Tail === p2Tail) {
        return true;
      }
    }

    // WhatsApp JID match
    if (c1.whatsappJid && c2.whatsappJid && c1.whatsappJid === c2.whatsappJid) {
      return true;
    }

    // Telegram ID or username match
    if (c1.telegramChatId && c2.telegramChatId && c1.telegramChatId === c2.telegramChatId) {
      return true;
    }
    const tgUser1 = c1.telegramUsername ? c1.telegramUsername.toLowerCase().replace('@', '').trim() : '';
    const tgUser2 = c2.telegramUsername ? c2.telegramUsername.toLowerCase().replace('@', '').trim() : '';
    if (tgUser1 && tgUser2 && tgUser1 === tgUser2) {
      return true;
    }

    // Name similarity (exact match after stripping spaces/punctuation)
    const cleanName = (name: string) => 
      name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    const name1 = cleanName(c1.name);
    const name2 = cleanName(c2.name);
    
    const isGeneric = (n: string, c: any) => 
      !n || 
      n.startsWith('user') || 
      n.startsWith('whatsapp') || 
      n.startsWith('telegram') || 
      c.source === 'whatsapp' && n === 'whatsappuser' ||
      c.source === 'telegram' && n === 'telegramuser';

    if (name1 && name2 && name1 === name2 && !isGeneric(name1, c1) && !isGeneric(name2, c2)) {
      return true;
    }

    return false;
  }

  /**
   * Run multi-pass deduplication and physical merging of Contact and Lead records
   */
  async deduplicateAndLinkContacts(clientId: string): Promise<void> {
    logger.info({ clientId }, 'Running strict deduplication and identity linking');

    // 1. Fetch all Contacts and Leads for this client
    const contacts = await Contact.find({ clientId });
    if (contacts.length <= 1) return;

    // Disjoint-Set forest helper
    const parent = new Map<string, string>();
    const find = (id: string): string => {
      if (!parent.has(id)) parent.set(id, id);
      if (parent.get(id) === id) return id;
      const root = find(parent.get(id)!);
      parent.set(id, root);
      return root;
    };
    const union = (id1: string, id2: string) => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) {
        parent.set(root1, root2);
      }
    };

    // Cluster contacts together based on similarity rules
    const n = contacts.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.areContactsSimilar(contacts[i], contacts[j])) {
          union(contacts[i]._id.toString(), contacts[j]._id.toString());
        }
      }
    }

    // Group contacts by root
    const groups = new Map<string, any[]>();
    for (const contact of contacts) {
      const root = find(contact._id.toString());
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(contact);
    }

    // Process each cluster of duplicates
    for (const [rootId, group] of groups.entries()) {
      if (group.length <= 1) continue;

      logger.info({ rootId, size: group.length }, 'Merging duplicate contact group');

      // 1. Choose canonical contact
      // Priority: non-placeholder email, then non-social source, then newest
      const sortedGroup = [...group].sort((a, b) => {
        const isRealEmail = (email?: string) => 
          email && 
          !email.endsWith('@whatsapp.com') && 
          !email.endsWith('@telegram.com') && 
          !email.endsWith('@import.com') && 
          !email.endsWith('@manual.com');

        const emailA = isRealEmail(a.email) ? 1 : 0;
        const emailB = isRealEmail(b.email) ? 1 : 0;
        if (emailA !== emailB) return emailB - emailA;

        const sourceA = (a.source !== 'whatsapp' && a.source !== 'telegram') ? 1 : 0;
        const sourceB = (b.source !== 'whatsapp' && b.source !== 'telegram') ? 1 : 0;
        if (sourceA !== sourceB) return sourceB - sourceA;

        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      });

      const canonicalContact = sortedGroup[0];
      const duplicates = sortedGroup.slice(1);
      const duplicateIds = duplicates.map(d => d._id);

      // 2. Merge details into canonical Contact
      const originalCanonicalValues = {
        name: canonicalContact.name,
        email: canonicalContact.email,
        phone: canonicalContact.phone,
        telegramUsername: canonicalContact.telegramUsername,
        telegramChatId: canonicalContact.telegramChatId,
        whatsappJid: canonicalContact.whatsappJid
      };

      const numbersSet = new Set(canonicalContact.numbers?.map((n: any) => n.phoneNumber) || []);
      const additionalNumbers: any[] = canonicalContact.numbers || [];

      let mergedName = canonicalContact.name;
      let mergedEmail = canonicalContact.email;
      let mergedPhone = canonicalContact.phone;
      let mergedTelegramUsername = canonicalContact.telegramUsername;
      let mergedTelegramChatId = canonicalContact.telegramChatId;
      let mergedWhatsappJid = canonicalContact.whatsappJid;
      let mergedPreferredMethod = canonicalContact.preferredContactMethod;
      let mergedLocation = canonicalContact.location || {};

      for (const dup of duplicates) {
        // Name enrichment
        if (mergedName.startsWith('User ') && dup.name && !dup.name.startsWith('User ')) {
          mergedName = dup.name;
        }
        // Email enrichment
        if ((!mergedEmail || mergedEmail.includes('@whatsapp.com') || mergedEmail.includes('@telegram.com')) && dup.email) {
          mergedEmail = dup.email;
        }
        // Phone enrichment
        if (!mergedPhone && dup.phone) {
          mergedPhone = dup.phone;
        }
        // Save secondary numbers
        if (dup.phone && !numbersSet.has(dup.phone)) {
          numbersSet.add(dup.phone);
          additionalNumbers.push({
            name: dup.name || 'Secondary Phone',
            phoneNumber: dup.phone,
            addedAt: dup.createdAt || new Date()
          });
        }
        // Merge subnumbers array
        if (dup.numbers && dup.numbers.length > 0) {
          for (const sub of dup.numbers) {
            if (sub.phoneNumber && !numbersSet.has(sub.phoneNumber)) {
              numbersSet.add(sub.phoneNumber);
              additionalNumbers.push(sub);
            }
          }
        }
        // Social channel merges
        if (!mergedTelegramUsername && dup.telegramUsername) mergedTelegramUsername = dup.telegramUsername;
        if (!mergedTelegramChatId && dup.telegramChatId) mergedTelegramChatId = dup.telegramChatId;
        if (!mergedWhatsappJid && dup.whatsappJid) mergedWhatsappJid = dup.whatsappJid;

        // Location merge
        if ((!mergedLocation.city || mergedLocation.city === 'Unknown') && dup.location && dup.location.city) {
          mergedLocation = dup.location;
        }
      }

      // Update canonical Contact in database
      await Contact.findByIdAndUpdate(canonicalContact._id, {
        $set: {
          name: mergedName,
          email: mergedEmail,
          phone: mergedPhone,
          telegramUsername: mergedTelegramUsername,
          telegramChatId: mergedTelegramChatId,
          whatsappJid: mergedWhatsappJid,
          preferredContactMethod: mergedPreferredMethod,
          location: mergedLocation,
          numbers: additionalNumbers
        }
      });

      // 3. Consolidate Lead records
      const allEmailsInGroup = [mergedEmail, ...group.map(c => c.email)].filter(Boolean);
      const allPhonesInGroup = [mergedPhone, ...group.map(c => c.phone)].filter(Boolean);

      const queryConditions: any[] = [
        { contactEmail: { $in: allEmailsInGroup } }
      ];
      if (allPhonesInGroup.length > 0) {
        queryConditions.push({ contactPhone: { $in: allPhonesInGroup } });
      }

      const matchingLeads = await Lead.find({ clientId, $or: queryConditions });
      
      if (matchingLeads.length > 0) {
        // Choose canonical Lead
        const sortedLeads = [...matchingLeads].sort((a, b) => {
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
        });

        const canonicalLead = sortedLeads[0];
        const duplicateLeads = sortedLeads.slice(1);
        const duplicateLeadIds = duplicateLeads.map(l => l._id);

        let mergedLeadTags = new Set(canonicalLead.tags || []);
        let mergedLeadActivities = [...(canonicalLead.activities || [])];
        let mergedLeadScore = canonicalLead.score || 0;
        let mergedLeadValue = canonicalLead.value || 0;
        let mergedLeadData = canonicalLead.data instanceof Map ? Object.fromEntries(canonicalLead.data) : (canonicalLead.data || {});

        const nameParts = mergedName.trim().split(/\s+/);
        const leadFirst = nameParts[0] || canonicalLead.contactFirst || '';
        const leadLast = nameParts.slice(1).join(' ') || canonicalLead.contactLast || '';

        // Record merge audit trail in activities
        const mergeAuditDescription = `Unified Profile Merged. Consolidated ${group.length} duplicates. Original Identity: Name: "${originalCanonicalValues.name}", Email: "${originalCanonicalValues.email}", Phone: "${originalCanonicalValues.phone}"`;
        const mergeActivity = {
          type: 'system',
          description: mergeAuditDescription,
          date: new Date(),
          metadata: {
            mergedContactIds: duplicateIds,
            mergedLeadIds: duplicateLeadIds,
            originalIdentity: originalCanonicalValues
          }
        };
        mergedLeadActivities.push(mergeActivity);

        for (const dupLead of duplicateLeads) {
          // Merge tags
          if (dupLead.tags && dupLead.tags.length > 0) {
            dupLead.tags.forEach((t: string) => mergedLeadTags.add(t));
          }
          // Merge score / value
          if (dupLead.score && dupLead.score > mergedLeadScore) mergedLeadScore = dupLead.score;
          if (dupLead.value && dupLead.value > mergedLeadValue) mergedLeadValue = dupLead.value;

          // Merge activities timeline
          if (dupLead.activities && dupLead.activities.length > 0) {
            dupLead.activities.forEach((act: any) => {
              if (act && act.description) {
                mergedLeadActivities.push(act);
              }
            });
          }

          // Merge custom data safely
          const dupData = dupLead.data instanceof Map ? Object.fromEntries(dupLead.data) : (dupLead.data || {});
          mergedLeadData = { ...dupData, ...mergedLeadData };
        }

        // Sort activities chronologically by date
        const validActivities = mergedLeadActivities.filter(a => a && a.date && !isNaN(new Date(a.date).getTime()));
        validActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Update canonical Lead
        await Lead.findByIdAndUpdate(canonicalLead._id, {
          $set: {
            contactFirst: leadFirst,
            contactLast: leadLast,
            contactEmail: mergedEmail,
            contactPhone: mergedPhone,
            tags: Array.from(mergedLeadTags),
            score: mergedLeadScore,
            value: mergedLeadValue,
            activities: validActivities,
            data: mergedLeadData,
            lastActivity: new Date()
          }
        });

        // 4. Update References in all related tables
        // Booking
        if (mergedEmail || mergedPhone) {
          const bookingQuery: any[] = [];
          if (mergedEmail) bookingQuery.push({ email: mergedEmail });
          if (mergedPhone) bookingQuery.push({ phoneNumber: mergedPhone });
          await Booking.updateMany(
            { clientId, $or: bookingQuery },
            { $set: { fullName: mergedName, email: mergedEmail, phoneNumber: mergedPhone } }
          );
        }

        // Ticket
        await Ticket.updateMany(
          { customerId: { $in: duplicateIds.map(id => id.toString()) } },
          { $set: { customerId: canonicalContact._id.toString(), customerName: mergedName, customerEmail: mergedEmail } }
        );
        if (mergedEmail) {
          await Ticket.updateMany(
            { clientId, customerEmail: mergedEmail },
            { $set: { customerId: canonicalContact._id.toString(), customerName: mergedName } }
          );
        }

        // Inquiry
        await Inquiry.updateMany(
          { customerId: { $in: duplicateIds.map(id => id.toString()) } },
          { $set: { customerId: canonicalContact._id.toString() } }
        );
        if (mergedEmail) {
          await Inquiry.updateMany(
            { clientId, senderEmail: mergedEmail },
            { $set: { customerId: canonicalContact._id.toString() } }
          );
        }

        // MissedCall
        await MissedCall.updateMany(
          { contactId: { $in: duplicateIds } },
          { $set: { contactId: canonicalContact._id, leadId: canonicalLead._id } }
        );
        await MissedCall.updateMany(
          { leadId: { $in: duplicateLeadIds } },
          { $set: { contactId: canonicalContact._id, leadId: canonicalLead._id } }
        );

        // TelegramIdentity
        await (TelegramIdentity as any).updateMany(
          { contactId: { $in: duplicateIds } },
          { $set: { contactId: canonicalContact._id } }
        );

        // WhatsAppIdentity
        await (WhatsAppIdentity as any).updateMany(
          { contactId: { $in: duplicateIds } },
          { $set: { contactId: canonicalContact._id } }
        );

        // WidgetSession
        await (WidgetSession as any).updateMany(
          { contactId: { $in: duplicateIds } },
          { $set: { contactId: canonicalContact._id } }
        );

        // IdentityGraph
        await (IdentityGraph as any).deleteMany({ contactId: { $in: duplicateIds } });
        await this.updateIdentityGraph(clientId, canonicalContact._id, {
          email: mergedEmail,
          phone: mergedPhone,
          whatsappJid: mergedWhatsappJid,
          telegramUserId: mergedTelegramChatId
        }, canonicalContact.source);

        // Delete duplicate Lead records from the DB
        if (duplicateLeadIds.length > 0) {
          await Lead.deleteMany({ _id: { $in: duplicateLeadIds } });
        }
      }

      // Delete duplicate Contact records from the DB
      await Contact.deleteMany({ _id: { $in: duplicateIds } });
    }

    // Pass 2: Deduplicate Lead records independently
    try {
      const allLeads = await Lead.find({ clientId });
      if (allLeads.length > 1) {
        const leadParent = new Map<string, string>();
        const findLead = (id: string): string => {
          if (!leadParent.has(id)) leadParent.set(id, id);
          if (leadParent.get(id) === id) return id;
          const root = findLead(leadParent.get(id)!);
          leadParent.set(id, root);
          return root;
        };
        const unionLead = (id1: string, id2: string) => {
          const root1 = findLead(id1);
          const root2 = findLead(id2);
          if (root1 !== root2) {
            leadParent.set(root1, root2);
          }
        };

        const areLeadsSimilar = (l1: any, l2: any): boolean => {
          const email1 = l1.contactEmail ? l1.contactEmail.toLowerCase().trim() : '';
          const email2 = l2.contactEmail ? l2.contactEmail.toLowerCase().trim() : '';
          const isRealEmail = (email: string) => 
            email && 
            !email.endsWith('@whatsapp.com') && 
            !email.endsWith('@telegram.com') && 
            !email.endsWith('@import.com') && 
            !email.endsWith('@manual.com');

          if (isRealEmail(email1) && isRealEmail(email2) && email1 === email2) return true;

          const p1 = l1.contactPhone ? l1.contactPhone.replace(/\D/g, '') : '';
          const p2 = l2.contactPhone ? l2.contactPhone.replace(/\D/g, '') : '';
          if (p1 && p2) {
            const p1Tail = p1.slice(-8);
            const p2Tail = p2.slice(-8);
            if (p1Tail === p2Tail) return true;
          }
          return false;
        };

        const len = allLeads.length;
        for (let i = 0; i < len; i++) {
          for (let j = i + 1; j < len; j++) {
            if (areLeadsSimilar(allLeads[i], allLeads[j])) {
              unionLead(allLeads[i]._id.toString(), allLeads[j]._id.toString());
            }
          }
        }

        const leadGroups = new Map<string, any[]>();
        for (const lead of allLeads) {
          const root = findLead(lead._id.toString());
          if (!leadGroups.has(root)) leadGroups.set(root, []);
          leadGroups.get(root)!.push(lead);
        }

        for (const [rootLeadId, lGroup] of leadGroups.entries()) {
          if (lGroup.length <= 1) continue;

          logger.info({ rootLeadId, size: lGroup.length }, 'Merging duplicate lead group');

          // Choose canonical Lead
          const sortedLeads = [...lGroup].sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
          });

          const canonicalLead = sortedLeads[0];
          const duplicateLeads = sortedLeads.slice(1);
          const duplicateLeadIds = duplicateLeads.map(l => l._id);

          let mergedLeadTags = new Set(canonicalLead.tags || []);
          let mergedLeadActivities = [...(canonicalLead.activities || [])];
          let mergedLeadScore = canonicalLead.score || 0;
          let mergedLeadValue = canonicalLead.value || 0;
          let mergedLeadData = canonicalLead.data instanceof Map ? Object.fromEntries(canonicalLead.data) : (canonicalLead.data || {});

          for (const dupLead of duplicateLeads) {
            if (dupLead.tags && dupLead.tags.length > 0) {
              dupLead.tags.forEach((t: string) => mergedLeadTags.add(t));
            }
            if (dupLead.score && dupLead.score > mergedLeadScore) mergedLeadScore = dupLead.score;
            if (dupLead.value && dupLead.value > mergedLeadValue) mergedLeadValue = dupLead.value;

            if (dupLead.activities && dupLead.activities.length > 0) {
              dupLead.activities.forEach((act: any) => {
                if (act && act.description) {
                  mergedLeadActivities.push(act);
                }
              });
            }

            const dupData = dupLead.data instanceof Map ? Object.fromEntries(dupLead.data) : (dupLead.data || {});
            mergedLeadData = { ...dupData, ...mergedLeadData };
          }

          const validActivities = mergedLeadActivities.filter(a => a && a.date && !isNaN(new Date(a.date).getTime()));
          validActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          await Lead.findByIdAndUpdate(canonicalLead._id, {
            $set: {
              tags: Array.from(mergedLeadTags),
              score: mergedLeadScore,
              value: mergedLeadValue,
              activities: validActivities,
              data: mergedLeadData,
              lastActivity: new Date()
            }
          });

          if (duplicateLeadIds.length > 0) {
            await Lead.deleteMany({ _id: { $in: duplicateLeadIds } });
          }
        }
      }
    } catch (leadDedupeError) {
      logger.error({ err: leadDedupeError }, 'Independent lead deduplication failed');
    }
  }
}

export const identityService = new IdentityService();
