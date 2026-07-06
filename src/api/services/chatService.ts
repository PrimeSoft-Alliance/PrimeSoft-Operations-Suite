import { Settings, UsageStats, AILog, Booking, Product, Client, Contact, Lead, OnboardingSession, Conversation } from '../models';
import { KnowledgeChunk } from '../dbModels';
import { knowledgeSearchService } from './knowledgeSearchService';
import { GuardrailSanitizer } from '../utils/nlp';
import { nlpService } from './nlpService';
import { identityService } from './identityService';
import { startOfDay, endOfDay, format, addMinutes, isAfter } from 'date-fns';
import { upsertLead } from '../leads';
import { incrementAiUsage } from '../../lib/usage';
import { sendEmail } from '../email';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pino from 'pino';
import Groq from 'groq-sdk';
import { AI_MODELS } from '../utils/ai';
import axios from 'axios';

const logger = pino({ name: 'ChatService' });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

export interface ChatResult {
  text: string;
  userName?: string;
  userEmail?: string;
  imageUrl?: string;
}

export async function processChatRequest({
  clientId,
  sessionId,
  message,
  userName = '',
  userEmail = '',
  overrideHistory = null,
  knowledgeBase = '',
  platform = 'widget',
  media = null
}: {
  clientId: string;
  sessionId: string;
  message: string;
  userName?: string;
  userEmail?: string;
  overrideHistory?: {role: string, content: string}[];
  knowledgeBase?: string;
  platform?: 'telegram' | 'whatsapp' | 'widget' | 'telnyx_voice' | 'telnyx_sms';
  media?: any;
}): Promise<ChatResult> {
  const clientRecord = await Client.findOne({ clientId });
  if (!clientRecord) throw new Error('Client not found');

  const settings = await Settings.findOne({ clientId }) || { clientId, businessName: clientRecord.businessName };

  // 1. IDENTITY RESOLUTION
  const evidence: any = { name: userName, email: userEmail };
  if (platform === 'telegram') evidence.telegramUserId = sessionId;
  if (platform === 'whatsapp') evidence.whatsappJid = sessionId;
  if (platform === 'widget') evidence.widgetSessionId = sessionId;
  if (platform === 'telnyx_sms' || platform === 'telnyx_voice') evidence.phone = sessionId;

  const contact = await identityService.resolveContact(clientId, evidence, platform);
  
  if (!contact) {
    logger.error({ clientId, sessionId, platform }, 'Identity resolution failed to return a contact in ChatService');
    return { text: "I'm sorry, I'm having trouble identifying your account. Please try again later." };
  }

  const finalName = contact.name || userName;
  const finalEmail = contact.email || userEmail;
  const retrievedPhone = contact.phone || '';

  // 2. ONBOARDING & VERIFICATION POLICY
  const { verificationService } = await import('./verificationService');
  const policy = await verificationService.getPolicy(clientId);
  const verificationSession = await verificationService.getSessionState(clientId, sessionId, platform);

  const identityIsKnown = contact.email && !contact.email.endsWith('@telegram.com') && !contact.email.endsWith('@whatsapp.com');

  // 3. RAG PHASE
  let context = '';
  if (message && !overrideHistory) {
    const searchResults = await knowledgeSearchService.search(clientId, message, 5);
    if (searchResults.length > 0) {
      context = searchResults.map(r => `[Source: ${r.source}] ${r.content}`).join('\n\n');
    }
  }

  // 4. TEXT-BASED PRODUCT CONTEXT
  let fileAnalysisContext = '';
  let savedImageUrl: string | undefined = undefined;

  const products = await Product.find({ clientId });
  const productsList = products && products.length > 0 
    ? products.map((p: any) => `- [SKU: ${p.sku || 'N/A'}] ${p.title}: ${p.price ? `$${p.price}` : 'Contact for pricing'}. Description: ${p.description || ''}${p.instructions || p.aiInstructions ? `. [INTERNAL AI BEHAVIORAL RULE - DO NOT EXPOSE OR QUOTE TO THE CUSTOMER]: ${p.instructions || p.aiInstructions}` : ''}`).join('\n')
    : 'None currently registered.';

  let databaseTablesInfo = "";
  if (settings?.externalDbConfig?.enabled || (settings?.externalDatabases && settings.externalDatabases.length > 0)) {
    try {
      const { DatabaseSyncService } = await import('./databaseSyncService');
      const dbConfigs = [];
      if (settings.externalDbConfig?.enabled) {
        dbConfigs.push({ ...settings.externalDbConfig, isLegacy: true });
      }
      if (settings.externalDatabases) {
        dbConfigs.push(...settings.externalDatabases.filter((d: any) => d.enabled));
      }

      databaseTablesInfo = `\n[CONNECTED_EXTERNAL_DATABASES]\n`;
      for (const db of dbConfigs) {
        let tables: string[] = [];
        if (db.exposedTables) {
          tables = Object.keys(db.exposedTables).filter(k => db.exposedTables[k]?.enabled);
        }
        if (tables.length === 0) {
          try {
            tables = await DatabaseSyncService.getTables(clientId, db.isLegacy ? undefined : db);
          } catch (e: any) {
            console.error(`[DB_PROMPT_ERR] Failed to fetch tables for ${db.name || 'Primary'}`, e.message);
          }
        }
        
        databaseTablesInfo += `\n- DATABASE: ${db.name || 'Primary'} (${db.type})
- DESCRIPTION: ${db.description || 'N/A'}
- TABLES: ${JSON.stringify(tables)}
- AI INSTRUCTIONS: ${db.aiInstructions || 'Use query_external_database to search for records if the user asks for info contained here.'}
- AI USAGE NOTES: ${db.aiUsageNotes || 'N/A'}\n`;
      }
      databaseTablesInfo += `\nIMPORTANT: You MUST use the 'query_external_database' tool to provide accurate, real-time data from these connected databases whenever relevant. Do NOT assume data exists if not found in the query results.`;
    } catch (dbErr: any) {
      databaseTablesInfo = `\n[CONNECTED_EXTERNAL_DATABASES]\n- STATUS: Failed to resolve database metadata (${dbErr.message})`;
    }
  }

  let faqText = "";
  if (settings?.faqs && settings.faqs.length > 0) {
    faqText = `\nFAQ KNOWLEDGE:\n${settings.faqs.map((faq: any) => `Q: ${faq.question}\nA: ${faq.answer}${faq.aiInstructions ? `\n[AI INSTRUCTIONS: ${faq.aiInstructions}]` : ''}`).join('\n\n')}`;
  }

  // Build History
  let history = overrideHistory;
  if (!history) {
    const logs = await AILog.find({ clientId, sessionId }).sort({ createdAt: 1 }).limit(20);
    history = logs.map((log: any) => ({ role: log.role === 'model' ? 'assistant' : log.role, content: log.content }));
  }
  
  if (message || media) {
    savedImageUrl = undefined;
    if (media && media.data) {
      try {
        const publicPath = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
        
        const extension = media.mimeType ? media.mimeType.split('/')[1] : 'jpg';
        const safeName = `${Date.now()}-${clientId}-${Math.floor(Math.random() * 1000)}.${extension}`;
        const filePath = path.join(publicPath, safeName);
        
        const base64Data = media.data.includes(';base64,') 
          ? media.data.split(';base64,')[1] 
          : media.data;
          
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        savedImageUrl = `/uploads/${safeName}`;
        logger.info({ savedImageUrl }, 'Media saved to local storage');
      } catch (err) {
        logger.error({ err }, 'Failed to save media to local storage');
      }
    }

    // New File Analysis Step
    if (media && media.data) {
      try {
        const fileAnalysisPromptPath = path.join(PROMPTS_DIR, 'file-analysis-prompt.md');
        if (fs.existsSync(fileAnalysisPromptPath)) {
          const fileAnalysisPrompt = fs.readFileSync(fileAnalysisPromptPath, 'utf8');
          
          const base64Data = media.data.includes(';base64,') 
            ? media.data.split(';base64,')[1] 
            : media.data;

          const analysisResponse = await groq.chat.completions.create({
            model: AI_MODELS.VISION,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${media.mimeType || 'image/jpeg'};base64,${base64Data}`
                  }
                },
                {
                  type: 'text',
                  text: "Analyze this file and provide a JSON response."
                }
              ]
            }],
            max_tokens: 1024,
            system: fileAnalysisPrompt
          });

          if (analysisResponse.choices[0]?.message?.content) {
            fileAnalysisContext = `\n\n[FILE_ANALYSIS_RESULT]\n${analysisResponse.choices[0].message.content}\n\nIMPORTANT: Use this analysis to guide the customer. If the result shows a relevant support issue or custom service request, follow the RECOMMENDED_ACTION.`;
          }
        }
      } catch (analysisErr) {
        logger.error({ err: analysisErr }, 'File analysis failed');
      }
    }

    await AILog.create({ 
      clientId, 
      sessionId, 
      role: 'user', 
      content: message || '[Media/Image]',
      imageUrl: savedImageUrl || (media && media.data ? 'base64-media' : undefined)
    });
  }

  const systemPromptTemplate = fs.readFileSync(path.join(PROMPTS_DIR, 'ominirep-csr.md'), 'utf8');
  const guardrails = fs.readFileSync(path.join(PROMPTS_DIR, 'guardrails.md'), 'utf8');
  const operationRules = fs.readFileSync(path.join(PROMPTS_DIR, 'operation-rules.md'), 'utf8');
  const visionSkill = fs.readFileSync(path.join(PROMPTS_DIR, 'vision-skill.md'), 'utf8');
  const leadCaptureSkill = fs.readFileSync(path.join(PROMPTS_DIR, 'lead-capture.md'), 'utf8');
  const troubleshootingSkill = fs.readFileSync(path.join(PROMPTS_DIR, 'troubleshooting.md'), 'utf8');
  const actionJsonFormat = fs.readFileSync(path.join(PROMPTS_DIR, 'action-json.md'), 'utf8');
  
  let channelPrompt = "";
  try {
    let channelFileName = 'unified.md';
    const plat = (platform || '').toLowerCase();
    if (plat === 'telegram') {
      channelFileName = 'telegram.md';
    } else if (plat === 'whatsapp') {
      channelFileName = 'whatsapp.md';
    } else if (plat === 'facebook') {
      channelFileName = 'facebook.md';
    } else if (plat === 'instagram') {
      channelFileName = 'instagram.md';
    } else if (plat === 'sms' || plat === 'telnyx_sms') {
      channelFileName = 'sms.md';
    } else if (plat === 'email') {
      channelFileName = 'email.md';
    }

    const channelPath = path.join(process.cwd(), 'src', 'prompts', 'channels', channelFileName);
    if (fs.existsSync(channelPath)) {
      channelPrompt = "\n\n" + fs.readFileSync(channelPath, 'utf8');
    } else {
      const unifiedPath = path.join(process.cwd(), 'src', 'prompts', 'channels', 'unified.md');
      if (fs.existsSync(unifiedPath)) {
        channelPrompt = "\n\n" + fs.readFileSync(unifiedPath, 'utf8');
      }
    }
  } catch (e) {
    logger.error({ err: e }, 'Failed to load dynamic channel prompt in chatService');
  }

  const isSaved = contact && !contact.isAnonymous && contact._id && contact.name && contact.name !== 'User' && contact.name !== 'Anonymous User' && contact.name !== 'Telegram User' && contact.name !== 'WhatsApp User' && contact.email && !contact.email.endsWith('@telegram.com') && !contact.email.endsWith('@whatsapp.com');

  let isFirstTimeChatter = true;
  try {
    const conv = await Conversation.findOne({
      clientId,
      $or: [{ customerJid: sessionId }, contact?._id ? { contactId: contact._id } : null].filter(Boolean)
    });
    if (conv && conv.messages && conv.messages.length > 1) {
      isFirstTimeChatter = false;
    }
  } catch (e) {}

  const customerDetails = `[CUSTOMER DETAILS]
- CONTACT_SAVED_IN_SYSTEM: ${isSaved ? 'YES' : 'NO'}
- FIRST_TIME_CHATTER: ${isFirstTimeChatter ? 'YES' : 'NO'}
- NAME: ${isSaved ? (contact.name || '') : ''}
- EMAIL: ${isSaved ? (contact.email || '') : ''}
- PHONE: ${contact?.phone || ''}
- TELEGRAM_USERNAME: ${contact?.telegramUsername || ''}
- WHATSAPP_ID: ${contact?.whatsappJid || ''}
- TELEGRAM_CHAT_ID: ${contact?.telegramChatId || ''}
- PLATFORM: ${platform}
- PLATFORM_ID: ${sessionId}`;

  const isVerified = !policy.verificationEnabled || policy.verificationLevel === 0 || (verificationSession && verificationSession.isVerified && verificationSession.verificationLevel >= policy.verificationLevel);

  const securityPrompt = `\n[SECURITY_VERIFICATION_COMPLIANCE]
- POLICY_ENABLED: ${policy.verificationEnabled ? 'YES' : 'NO'}
- REQUIRED_COMPLIANCE_LEVEL: ${policy.verificationEnabled ? policy.verificationLevel : 0}
- USER_COMPLIANCE_LEVEL: ${verificationSession ? verificationSession.verificationLevel : 0}
- IS_VERIFIED: ${isVerified ? 'YES' : 'NO'}
- REQUIRED_FIELDS: ${JSON.stringify(policy.requiredFields || [])}
${!isVerified ? 'CRITICAL: The user has NOT completed verification. You must refuse to cancel bookings or retrieve private database records. Inform the user they must complete the identity verification challenge.' : 'User is verified to retrieve private records and perform bookings/cancellations.'}`;

  const systemPrompt = `${systemPromptTemplate}${channelPrompt}\n\n${guardrails}\n\n${operationRules}\n\n${visionSkill}\n\n${leadCaptureSkill}\n\n${troubleshootingSkill}\n\n${actionJsonFormat}

[OFFICE RECORDS & CATALOGS]
BUSINESS_NAME: ${settings.businessName || 'the business'}
KNOWLEDGE_BASE:
${context}${faqText}

PRODUCT_CATALOG:
${productsList}

${fileAnalysisContext}
${customerDetails}
${securityPrompt}
${databaseTablesInfo}

[CORE AI INSTRUCTIONS]
1. PERSONA & TONE: You are OminiRep, a professional human-like representative. You are warm, confident, and efficient. Always use first-person plural ("we", "our") when referring to company records and policies. Follow the OminiRep Representative identity guidelines strictly.
2. CORE CAPABILITIES:
   - Booking Management: Handle bookings (book, list, cancel, reschedule, update) with precision.
   - Support Ticketing: Manage tickets (create, list, update status/priority/details) professionally.
   - Inquiries: Answer questions using the KNOWLEDGE_BASE and PRODUCT_CATALOG as your sole source of truth.
3. CRITICAL - SPECIAL INSTRUCTIONS: Follow 'Special Instructions' in the catalogs for every specific service/product request.
4. SLOT FILLING & CONFIRMATION: Collect all required information (slots) for any action before proceeding. Always ask for confirmation before executing state-changing actions.
5. VERIFICATION ON FAILURE: If a record lookup fails, politely ask for verification of Tracking IDs (BKG-XXXXX / TKT-XXXXX) or contact details.
6. PRIVACY & SECURITY: Never show internal database ObjectIDs. Enforce data access rules and hide sensitive PII.
7. ESCALATION: Offer a human handoff if requested or if frustration is detected.
`;


  let capturedLeadInfo: { fullName?: string, email?: string } | null = null;

  const executeTool = async (name: string, args: any): Promise<any> => {
    try {
      if (name === 'check_availability') {
          const { date, serviceName } = args;
          const reqDate = new Date(date);
          const dayOfWeek = reqDate.getDay();
          const workingHour = settings.workingHours?.find((wh: any) => wh.day === dayOfWeek);
          if (!workingHour || !workingHour.isOpen) return { success: false, availableSlots: [] };
          
          const availableSlots = [{ startTime: '09:00', displayTime: '09:00 AM' }, { startTime: '10:00', displayTime: '10:00 AM' }];
          return { success: true, availableSlots };

      } else if (name === 'book_appointment') {
          const fullName = args.fullName || args.customerName || contact.name || 'Anonymous User';
          const phoneNumber = args.phoneNumber || args.phone || contact.phone || '';
          const email = args.email || args.customerEmail || contact.email || 'info@ominirep.com';
          const serviceName = args.serviceName || args.serviceSelection || 'Website Development';
          const date = args.date || args.preferredDate || new Date().toISOString().split('T')[0];
          const startTime = args.startTime || args.preferredStartTime || '10:00';
          const { Contact, Product } = await import('../models');
          let syncedContact = await Contact.findOne({ clientId, email: email.toLowerCase().trim() });
          if (!syncedContact) {
            syncedContact = await Contact.create({
              clientId,
              name: fullName,
              email: email.toLowerCase().trim(),
              phone: phoneNumber,
              source: platform
            });
          }

          const matchedProduct = await Product.findOne({ clientId, title: { $regex: new RegExp(serviceName, 'i') } });
          const finalNotes = args.notes || 'Booking request via OminiRep';

          let lastImageUrl = savedImageUrl || args.imageNotes;
          if (!lastImageUrl) {
            try {
              const conv = await Conversation.findOne({
                clientId,
                $or: [{ customerJid: sessionId }, contact?._id ? { contactId: contact._id } : null].filter(Boolean)
              });
              if (conv && conv.messages) {
                for (let i = conv.messages.length - 1; i >= 0; i--) {
                  if (conv.messages[i].imageUrl) {
                    lastImageUrl = conv.messages[i].imageUrl;
                    break;
                  }
                }
              }
            } catch (e) {}
          }

          const finalImageNotes = lastImageUrl;

          const trackingId = `BKG-${Math.floor(10000 + Math.random() * 90000)}`;
          const booking = await Booking.create({ 
            clientId, 
            tracking_id: trackingId,
            customerId: syncedContact?._id,
            contactId: syncedContact?._id,
            fullName, 
            phoneNumber, 
            email, 
            serviceSelection: serviceName, 
            preferredDate: new Date(date), 
            preferredStartTime: startTime, 
            status: 'pending',
            notes: finalNotes,
            imageNotes: finalImageNotes
          });

          // Dispatch Notifications and emails
          try {
            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'New Booking Request',
              message: `${fullName} requested a booking for ${serviceName}.`,
              type: 'booking',
              relatedId: booking._id,
              link: '/dashboard/bookings'
            });

            const { bookingService } = await import('./bookingService');
            await bookingService.sendBookingNotifications(booking._id.toString(), platform);
          } catch (bookingNotifErr) {
            console.error('[BOOKING_NOTIFY] Failed to dispatch booking notifications/emails:', bookingNotifErr);
          }

          return { success: true, bookingId: trackingId };

      } else if (name === 'list_my_bookings') {
          const { email } = args;
          const { Booking } = await import('../models');
          const bookings = await Booking.find({ clientId, email: email.toLowerCase().trim() }).sort({ preferredDate: -1 });
          return {
            success: true,
            bookings: bookings.map(b => ({
              id: b.tracking_id,
              service: b.serviceSelection,
              date: b.preferredDate.toISOString().split('T')[0],
              time: b.preferredStartTime,
              status: b.status
            }))
          };
      } else if (name === 'collect_lead') {
          const fullName = args.fullName || args.name || contact.name || 'Anonymous User';
          const email = args.email || contact.email || 'info@ominirep.com';
          const phone = args.phone || args.phoneNumber || contact.phone || '';
          await upsertLead({ clientId, email, phone, name: fullName, source: 'ai', tags: ['ai-lead'], data: { platform, sessionId } });
          
          try {
             const { identityService } = await import('./identityService');
             const contact = await identityService.resolveContact(clientId, {
                email, phone, name: fullName, 
                telegramUserId: platform === 'telegram' ? sessionId : undefined,
                whatsappJid: platform === 'whatsapp' ? sessionId : undefined,
                widgetSessionId: platform === 'widget' ? sessionId : undefined
             }, platform);
             
             if (contact && contact._id) {
               if (platform === 'telegram') {
                   await identityService.syncTelegramIdentity(clientId, contact._id.toString(), { id: sessionId, chat_id: sessionId, first_name: fullName });
               } else if (platform === 'whatsapp') {
                   await identityService.syncWhatsAppIdentity(clientId, contact._id.toString(), { jid: sessionId, name: fullName, phone });
               }
             }
          } catch (err) {
             console.error('[COLLECT_LEAD] Failed to link cross-channel identity:', err);
          }

          capturedLeadInfo = { fullName, email };
          return { success: true, message: 'Lead captured.' };
      } else if (name === 'create_ticket') {
          const fullName = args.fullName || args.customerName || args.name || contact.name || 'Anonymous User';
          const email = args.email || args.customerEmail || contact.email || 'info@ominirep.com';
          const issueDescription = args.issueDescription || args.description || message || 'No description provided';
          const { Ticket, TicketMessage, Contact, Lead } = await import('../models');

          // PREVENT DUPLICATES: Check if there's already an open ticket for this user in the last hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const existingTicket = await Ticket.findOne({
             clientId,
             customerEmail: email.toLowerCase().trim(),
             status: 'open',
             createdAt: { $gte: oneHourAgo }
          });
          
          if (existingTicket) {
             return { success: false, message: 'An open support ticket already exists for this user.', ticketId: existingTicket._id };
          }

          const ticket = await Ticket.create({ 
            clientId, 
            customerName: fullName, 
            customerEmail: email, 
            subject: 'AI Escalation: Support Request', 
            description: issueDescription, 
            status: 'open',
            aiSummary: issueDescription,
            tracking_id: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
            imageUrl: args.attachmentUrl || savedImageUrl,
            source: platform
          });
          
          // Module Linking: Ensure Contact and Lead exist for this ticket
          try {
            let contact = await Contact.findOne({ clientId, email: email.toLowerCase().trim() });
            if (!contact) {
              contact = await Contact.create({
                clientId,
                name: fullName,
                email: email.toLowerCase().trim(),
                source: 'support'
              });
            }

            let lead = await Lead.findOne({ clientId, contactEmail: email.toLowerCase().trim() });
            if (!lead) {
              lead = await Lead.create({
                clientId,
                contactId: contact._id,
                contactFirst: fullName.split(' ')[0],
                contactLast: fullName.split(' ').slice(1).join(' ') || '',
                contactEmail: email.toLowerCase().trim(),
                source: 'support',
                stage: 'Qualified',
                status: 'strong',
                activities: [{
                  type: 'ticket',
                  description: `Support Ticket #${ticket._id.toString().slice(-6)} created: AI Escalation: Support Request`
                }]
              });
            } else {
              lead.activities.push({
                type: 'ticket',
                description: `New Support Ticket: AI Escalation: Support Request`,
                metadata: { ticketId: ticket._id }
              });
              lead.lastActivity = new Date();
              await lead.save();
            }
          } catch (linkErr) {
            console.warn('[TICKET_LINKING] Failed to link contact/lead in chatService:', linkErr);
          }

          // Create the initial ticket message
          await TicketMessage.create({
            clientId,
            ticketId: ticket._id,
            senderRole: 'customer',
            senderName: fullName,
            content: issueDescription,
            isInternal: false,
            attachments: []
          });

          // Dispatch notifications and emails
          try {
            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'New Support Ticket Created',
              message: `Ticket #${ticket._id.toString().slice(-6)} created for ${fullName}.`,
              type: 'system',
              relatedId: ticket._id,
              link: '/dashboard/tickets'
            });

            const { notificationService } = await import('./notificationService');
            await notificationService.sendTicketOpened(clientId, ticket);
          } catch (notifErr) {
            console.error('[TICKET_NOTIFY] Failed to dispatch notifications/emails:', notifErr);
          }

          return { success: true, message: 'Support ticket successfully created. A human agent will respond shortly.', ticketId: ticket._id };
      } else if (name === 'email_booking_details') {
          const { bookingId, email } = args;
          const { Booking } = await import('../models');
          const booking = await Booking.findOne({ 
            clientId, 
            $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }] 
          });
          if (!booking) return { error: 'Booking not found' };
          
          const { notificationService } = await import('./notificationService');
          // Update email if provided
          if (email && email !== booking.email) {
            booking.email = email;
            await booking.save();
          }
          await notificationService.sendBookingCreated(clientId, booking);
          return { success: true, message: 'Booking details have been sent to your email.' };
      } else if (name === 'cancel_booking') {
          if (!isVerified) {
            return { success: false, error: 'Identity verification required before cancelling bookings. Please instruct the customer to verify their identity.' };
          }
          const { bookingId, reason } = args;
          const { Booking, Ticket } = await import('../models');
          const booking = await Booking.findOne({
            clientId,
            $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }]
          });
          if (!booking) return { success: false, error: 'Booking not found' };

          booking.status = 'cancelled';
          await booking.save();

          // Create follow-up ticket in database so client can follow up
          const reasonText = reason ? `Reason provided: "${reason}"` : 'No reason provided.';
          const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
          
          try {
            const ticket = await Ticket.create({
              clientId,
              tracking_id: ticketId,
              contactId: booking.contactId || contact?._id,
              customerId: booking.contactId || contact?._id,
              customerName: booking.fullName,
              customerEmail: booking.email || contact?.email || '',
              subject: `Follow-up: Booking Cancelled - ${booking.serviceSelection}`,
              description: `Customer ${booking.fullName} cancelled their booking #${booking.tracking_id} for ${booking.serviceSelection} scheduled for ${new Date(booking.preferredDate).toDateString()}.\n\nReason: ${reasonText}\n\nPlease follow up with the customer to see if we can help them with something else.`,
              source: platform,
              priority: 'high',
              status: 'open',
              aiSummary: `Booking ${booking.tracking_id} was cancelled. ${reasonText}`
            });

            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'Support Ticket Created (Cancellation Follow-up)',
              message: `Ticket #${ticketId} created for ${booking.fullName} cancellation follow-up.`,
              type: 'system',
              relatedId: ticket._id.toString(),
              link: '/dashboard/tickets'
            });
          } catch (ticketErr) {
            logger.error({ err: ticketErr }, '[CANCEL_TICKET] Failed to create follow-up ticket');
          }

          // Dispatch Notifications and emails
          try {
            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'Booking Cancelled',
              message: `${booking.fullName} cancelled their booking for ${booking.serviceSelection}.`,
              type: 'booking',
              relatedId: booking._id,
              link: '/dashboard/bookings'
            });

            const { notificationService } = await import('./notificationService');
            await notificationService.sendBookingCancelled(clientId, booking);
          } catch (err) {
            console.error('[CANCEL_NOTIFY] Failed to dispatch notifications/emails:', err);
          }

          return { success: true, message: 'Booking has been successfully cancelled.' };

      } else if (name === 'reschedule_booking') {
          const { bookingId, newDate, newTime } = args;
          const { Booking } = await import('../models');
          const booking = await Booking.findOne({
            clientId,
            $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }]
          });
          if (!booking) return { success: false, error: 'Booking not found' };

          booking.preferredDate = new Date(newDate);
          booking.preferredStartTime = newTime;
          booking.status = 'rescheduled';
          await booking.save();

          // Dispatch Notifications and emails
          try {
            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'Booking Rescheduled',
              message: `${booking.fullName} rescheduled their booking to ${newDate} at ${newTime}.`,
              type: 'booking',
              relatedId: booking._id,
              link: '/dashboard/bookings'
            });

            const { notificationService } = await import('./notificationService');
            await notificationService.sendBookingRescheduled(clientId, booking);
          } catch (err) {
            console.error('[RESCHEDULE_NOTIFY] Failed to dispatch notifications/emails:', err);
          }

          return { success: true, message: `Booking has been successfully rescheduled to ${newDate} at ${newTime}.` };

      } else if (name === 'update_booking_details') {
          const { bookingId, notes } = args;
          const { Booking } = await import('../models');
          const booking = await Booking.findOne({
            clientId,
            $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }]
          });
          if (!booking) return { success: false, error: 'Booking not found' };

          booking.notes = (booking.notes ? booking.notes + '\n' : '') + notes;
          await booking.save();

          // Dispatch Notifications and emails
          try {
            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'Booking Updated',
              message: `${booking.fullName}'s booking was updated.`,
              type: 'booking',
              relatedId: booking._id,
              link: '/dashboard/bookings'
            });

            const { notificationService } = await import('./notificationService');
            await notificationService.sendBookingUpdated(clientId, booking, `Booking notes updated: "${notes}"`);
          } catch (err) {
            console.error('[UPDATE_NOTIFY] Failed to dispatch notifications/emails:', err);
          }

          return { success: true, message: 'Booking notes/details have been successfully updated.' };

      } else if (name === 'update_ticket') {
          const { ticketId, status, description, priority } = args;
          const { Ticket, TicketMessage } = await import('../models');
          const ticket = await Ticket.findOne({
            clientId,
            $or: [
              { tracking_id: ticketId },
              { ticketId: ticketId },
              { _id: ticketId.length === 24 ? ticketId : undefined }
            ]
          });
          if (!ticket) return { success: false, error: 'Ticket not found' };

          const changes: string[] = [];
          const oldStatus = ticket.status;
          
          if (status && status !== ticket.status) {
            ticket.status = status;
            changes.push(`status to ${status}`);
          }
          if (description) {
            ticket.description = (ticket.description ? ticket.description + '\n' : '') + description;
            changes.push(`added notes: "${description}"`);
          }
          if (priority && priority !== ticket.priority) {
            ticket.priority = priority;
            changes.push(`priority to ${priority}`);
          }

          if (changes.length === 0) {
            return { success: true, message: 'No changes provided.' };
          }

          await ticket.save();

          // Create ticket message
          try {
            await TicketMessage.create({
              clientId,
              ticketId: ticket._id,
              senderRole: 'ai',
              senderName: 'OminiRep AI',
              content: `Ticket updated by AI: ${changes.join(', ')}`,
              isInternal: false
            });
          } catch (msgErr) {
            console.error('[TICKET_MSG] Failed to save update message:', msgErr);
          }

          // Dispatch Notifications and emails
          try {
            const { createSystemNotification } = await import('../utils/notifications');
            await createSystemNotification(clientId, {
              title: 'Ticket Updated by AI',
              message: `Ticket #${ticket._id.toString().slice(-6)} updated: ${changes.join(', ')}`,
              type: 'system',
              relatedId: ticket._id,
              link: '/dashboard/tickets'
            });

            const { notificationService } = await import('./notificationService');
            if (status === 'closed' || status === 'resolved') {
              await notificationService.sendTicketClosed(clientId, ticket);
            } else if ((status === 'open' || status === 'reopened') && oldStatus === 'closed') {
              await notificationService.sendTicketReopened(clientId, ticket);
            } else {
              await notificationService.sendTicketUpdated(clientId, ticket, changes.join(', '));
            }
          } catch (err) {
            console.error('[TICKET_NOTIFY] Failed to dispatch notifications/emails:', err);
          }

          return { success: true, message: `Ticket has been successfully updated: ${changes.join(', ')}.` };

      } else if (name === 'list_my_tickets') {
          const { email } = args;
          const { Ticket } = await import('../models');
          const tickets = await Ticket.find({ clientId, customerEmail: email.toLowerCase().trim() }).sort({ createdAt: -1 });
          return {
            success: true,
            tickets: tickets.map(t => ({
              id: t.tracking_id || t.ticketId || t._id.toString(),
              subject: t.subject,
              description: t.description,
              status: t.status,
              priority: t.priority,
              createdAt: t.createdAt.toISOString().split('T')[0]
            }))
          };
      } else if (name === 'sync_contact' || name === 'sync_lead_and_contact') {
          const fullName = args.fullName || args.name || contact.name || 'Anonymous User';
          const email = args.email || contact.email || 'info@ominirep.com';
          const phone = args.phone || args.phoneNumber || contact.phone || '';
          const { Contact } = await import('../models');
          const syncedContact = await Contact.findOneAndUpdate(
            { clientId, email: email.toLowerCase().trim() },
            { $set: { name: fullName, phone: phone } },
            { upsert: true, new: true }
          );
          return { success: true, contactId: syncedContact._id };
      } else if (name === 'test_email_config') {
          const { EmailConfigService } = await import('./emailConfigService');
          const { config, source } = await EmailConfigService.getSmtpConfig(clientId);
          if (!config) return { success: false, source, message: 'No SMTP configuration found.' };
          const result = await EmailConfigService.verifySmtp(config, source as any);
          return { success: result.working, source, message: result.working ? 'SMTP is working.' : `SMTP failed: ${result.error?.message}`, details: result };
      } else if (name === 'conclude_session') {
          const { Conversation } = await import('../models');
          await Conversation.findOneAndUpdate(
            { clientId, $or: [{ customerJid: sessionId }, { contactId: contact._id }] },
            { $set: { status: 'concluded' } }
          );
          return { success: true, session_concluded: true };
      } else if (name === 'email_support_or_chat_info') {
          const { email, type, details } = args;
          const { AILog, Contact } = await import('../models');
          const emailLower = email.toLowerCase().trim();
          
          const contactDoc = await Contact.findOne({ clientId, email: emailLower });
          const contactName = contactDoc?.name || contact?.name || 'Customer';
          
          let subject = '';
          let htmlBody = '';
          let textBody = details || '';

          if (type === 'conversation_transcript') {
            const logs = await AILog.find({ clientId, sessionId }).sort({ createdAt: 1 }).limit(50);
            let messagesToUse = logs.map((l: any) => ({
              sender: l.role === 'user' ? 'customer' : 'assistant',
              text: l.content || ''
            }));

            if (messagesToUse.length === 0) {
              const { Conversation } = await import('../models');
              const conv = await Conversation.findOne({
                clientId,
                $or: [{ customerJid: sessionId }, { contactId: contact._id }]
              });
              if (conv && conv.messages && conv.messages.length > 0) {
                messagesToUse = conv.messages.map((m: any) => ({
                  sender: m.sender,
                  text: m.text
                }));
              }
            }

            let transcriptHtml = '';
            if (messagesToUse && messagesToUse.length > 0) {
              transcriptHtml = messagesToUse.map((m: any) => {
                const isCustomer = m.sender === 'customer' || m.sender === 'user';
                const sender = isCustomer ? (contactName || 'You') : 'OminiRep AI';
                const bg = isCustomer ? '#f1f5f9' : '#e0f2fe';
                const align = isCustomer ? 'right' : 'left';
                return `
                  <div style="margin-bottom: 12px; text-align: ${align};">
                    <strong style="font-size: 11px; color: #64748b; text-transform: uppercase;">${sender}</strong>
                    <div style="display: inline-block; max-width: 85%; text-align: left; background-color: ${bg}; padding: 10px 14px; border-radius: 8px; margin-top: 4px; color: #1e293b; font-size: 14px; font-family: sans-serif;">
                      ${(m.text || '').replace(/\n/g, '<br>')}
                    </div>
                  </div>
                `;
              }).join('');
            } else {
              transcriptHtml = `<p style="color: #64748b; font-style: italic;">No active chat history found for this session.</p>`;
            }

            subject = `Support Chat Transcript`;
            htmlBody = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h2 style="color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Chat Conversation Transcript</h2>
                <p>Hello ${contactName},</p>
                <p>As requested, here is the full transcript of your recent support session with us.</p>
                ${details ? `<div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #475569;"><b>Summary/Note:</b><br>${details.replace(/\n/g, '<br>')}</div>` : ''}
                <div style="margin-top: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  ${transcriptHtml}
                </div>
                <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">This is an automated copy of your customer support chat transcript.</p>
              </div>
            `;
          } else if (type === 'chat_summary') {
            subject = `Summary of Support Chat`;
            htmlBody = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h2 style="color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Support Session Summary</h2>
                <p>Hello ${contactName},</p>
                <p>Here is the requested summary of your support conversation:</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                  ${(details || 'No summary text was provided.').replace(/\n/g, '<br>')}
                </div>
                <p>Please feel free to reach back out if you have any further questions!</p>
              </div>
            `;
          } else if (type === 'steps_to_solve') {
            subject = `Instructions: Steps to Solve Your Issue`;
            htmlBody = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h2 style="color: #10b981; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Steps to Resolve Your Issue</h2>
                <p>Hello ${contactName},</p>
                <p>As discussed during our support chat, here are the steps or instructions needed for you to solve this issue:</p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 18px; border-radius: 8px; margin: 20px 0; font-size: 15px; color: #14532d; line-height: 1.6;">
                  ${(details || 'No custom steps were provided.').replace(/\n/g, '<br>')}
                </div>
                <p>Please follow these instructions. If the problem persists, do not hesitate to contact us again!</p>
              </div>
            `;
          } else { // modification_receipt
            subject = `Receipt: Successful Account Update`;
            htmlBody = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h2 style="color: #3b82f6; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Successful Account Modification Receipt</h2>
                <p>Hello ${contactName},</p>
                <p>This email confirms a successful modification or technical support update made to your tickets, bookings, or account profile details:</p>
                <div style="background-color: #f0f7ff; border-left: 4px solid #3b82f6; padding: 18px; border-radius: 8px; margin: 20px 0; font-size: 15px; color: #1e3a8a; line-height: 1.6;">
                  ${(details || 'Modification completed successfully.').replace(/\n/g, '<br>')}
                </div>
                <p>Thank you for using our system!</p>
              </div>
            `;
          }

          const { sendEmail } = await import('../email');
          await sendEmail(emailLower, subject, textBody, htmlBody, clientId);
          return { success: true, message: `Successfully emailed the ${type.replace(/_/g, ' ')} to ${emailLower}.` };
      } else if (name === 'get_account_status') {
          const { email } = args;
          const { Contact, Ticket, Booking, Client } = await import('../models');
          const emailLower = email.toLowerCase().trim();
          
          const contactDoc = await Contact.findOne({ clientId, email: emailLower });
          const clientDoc = await Client.findOne({ email: emailLower });
          const activeTickets = await Ticket.find({ clientId, customerEmail: emailLower, status: 'open' });
          const activeBookings = await Booking.find({ clientId, email: emailLower, status: 'confirmed' });
          
          let serviceStatus = 'active';
          let plan = 'starter';
          let reason = 'none';
          
          if (clientDoc) {
              serviceStatus = clientDoc.status || 'active';
              plan = clientDoc.plan || 'starter';
          } else if (contactDoc) {
              serviceStatus = contactDoc.status === 'resolved' ? 'active' : 'active';
              if (!contactDoc.aiEnabled) {
                  serviceStatus = 'disconnected';
                  reason = 'AI assistance disabled';
              }
          }
          
          // Check for any simulated issues based on keywords in ticket subjects/descriptions
          const hasUnpaidTicket = activeTickets.some(t => 
              t.subject.toLowerCase().includes('payment') || 
              t.description?.toLowerCase().includes('payment') || 
              t.description?.toLowerCase().includes('unpaid')
          );
          if (hasUnpaidTicket) {
              serviceStatus = 'disconnected';
              reason = 'unpaid invoice';
          }
          
          // Send automatic email for successful technical support diagnostic
          try {
            const { sendEmail } = await import('../email');
            const { Settings } = await import('../models');
            const settings = await Settings.findOne({ clientId }) || { businessName: 'Our Support Team' };
            const bizName = settings.businessName || 'OminiRep Support';
            
            const diagnosticHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                <h2 style="color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Technical Support: Account Diagnostic Results</h2>
                <p>Hello,</p>
                <p>This is an automated technical support email following your account diagnostic request. Here are your account details:</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.6;">
                  <div style="margin-bottom: 8px;"><strong>Email:</strong> ${emailLower}</div>
                  <div style="margin-bottom: 8px;"><strong>Service Status:</strong> <span style="color: ${serviceStatus === 'disconnected' ? '#ef4444' : '#10b981'}; font-weight: bold;">${serviceStatus.toUpperCase()}</span></div>
                  <div style="margin-bottom: 8px;"><strong>Plan:</strong> ${plan.toUpperCase()}</div>
                  <div style="margin-bottom: 8px;"><strong>Disconnect Reason:</strong> ${reason}</div>
                  <div style="margin-bottom: 8px;"><strong>Active Bookings:</strong> ${activeBookings.length}</div>
                  <div style="margin-bottom: 8px;"><strong>Active Tickets:</strong> ${activeTickets.length}</div>
                  <div style="margin-bottom: 8px;"><strong>Last Login:</strong> ${new Date(Date.now() - 2 * 3600 * 1000).toLocaleString()}</div>
                </div>
                <p>If you need assistance resolving any disconnected services or tickets, please reply to this email or speak to our chat assistant.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Sent automatically by ${bizName}.</p>
              </div>
            `;
            
            await sendEmail(
              emailLower,
              `Technical Support Diagnostics: ${emailLower}`,
              `Here are your account diagnostic results:\nStatus: ${serviceStatus}\nPlan: ${plan}\nReason: ${reason}\nActive Bookings: ${activeBookings.length}\nActive Tickets: ${activeTickets.length}`,
              diagnosticHtml,
              clientId
            );
          } catch (emailErr) {
            console.error('[DIAGNOSTIC_EMAIL] Failed to send automatic diagnostic email:', emailErr);
          }
          
          return {
              success: true,
              email: emailLower,
              serviceStatus,
              plan,
              reason,
              activeBookingsCount: activeBookings.length,
              activeTicketsCount: activeTickets.length,
              lastLogin: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
              message: serviceStatus === 'disconnected' 
                  ? `Account is currently disconnected due to: ${reason}.` 
                  : `Account is active on the ${plan} plan.`
          };
      } else if (name === 'query_external_database') {
          if (!isVerified) {
            return { success: false, error: 'Identity verification required before querying the connected external database. Please instruct the customer to verify their identity.' };
          }
          const { tableName, searchQuery, databaseName } = args;
          const { DatabaseSyncService } = await import('./databaseSyncService');
          try {
            const rows = await DatabaseSyncService.queryTable(clientId, tableName, searchQuery, databaseName);
            return { success: true, records: rows };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
      }
    } catch (e: any) {
      return { error: e.message };
    }
    return { error: 'Unknown tool' };
  };

  const messages: any[] = [
    ...history,
    { role: 'user', content: message }
  ];

  let aiResponse = "";
  let runComplete = false;
  let iterations = 0;

  const tools = [
    {
      type: "function",
      function: {
        name: "check_availability",
        description: "Check for available slots.",
        parameters: { type: "object", properties: { date: { type: "string" }, serviceName: { type: "string" } }, required: ["date"] }
      }
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description: "Firmly book an appointment. Use the 'notes' field to provide a human-like summary of the user's specific needs for this booking. Use the 'imageNotes' field if the user has provided or sent an image reference of what they want.",
        parameters: {
          type: "object",
          properties: { 
            fullName: { type: "string" }, 
            phoneNumber: { type: "string" }, 
            email: { type: "string" }, 
            serviceName: { type: "string" }, 
            date: { type: "string" }, 
            startTime: { type: "string" },
            notes: { type: "string" },
            imageNotes: { type: "string", description: "Optional image URL or base64 photo reference of design/craft requested by user." }
          },
          required: ["fullName", "phoneNumber", "email", "serviceName", "date", "startTime", "notes"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_my_bookings",
        description: "Retrieve all bookings associated with an email address.",
        parameters: {
          type: "object",
          properties: { email: { type: "string" } },
          required: ["email"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "collect_lead",
        description: "Capture contact info.",
        parameters: { type: "object", properties: { fullName: { type: "string" }, email: { type: "string" }, phone: { type: "string" } }, required: ["fullName", "email"] }
      }
    },
    {
      type: "function",
      function: {
        name: "create_ticket",
        description: "Create a support ticket to transfer the user to a human agent. Use the 'attachmentUrl' field if the user has uploaded an image or file related to their problem.",
        parameters: {
          type: "object",
          properties: { 
            fullName: { type: "string" }, 
            email: { type: "string" }, 
            issueDescription: { type: "string" },
            attachmentUrl: { type: "string", description: "Optional URL of an uploaded image or document showing the issue." }
          },
          required: ["fullName", "email", "issueDescription"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "email_booking_details",
        description: "Send the details of a booking (ID, time, service) to the user via email.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "string", description: "The ID of the booking to email." },
            email: { type: "string", description: "Optional email address to send to. Defaults to the one in the booking." }
          },
          required: ["bookingId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "cancel_booking",
        description: "Cancel a customer booking in the database. CRITICAL: Always request user confirmation before canceling.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "string", description: "The Tracking ID of the booking to cancel (e.g. BKG-12345)." },
            reason: { type: "string", description: "The reason given by the customer for cancelling (if any)." }
          },
          required: ["bookingId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "reschedule_booking",
        description: "Reschedule a customer booking to a new date and time. CRITICAL: Always ask for confirmation first.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "string", description: "The Tracking ID of the booking to reschedule (e.g. BKG-12345)." },
            newDate: { type: "string", description: "The new date in YYYY-MM-DD format." },
            newTime: { type: "string", description: "The new time in HH:MM (24-hour format)." }
          },
          required: ["bookingId", "newDate", "newTime"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_booking_details",
        description: "Update the notes or details of an existing customer booking. For example, to add specifications or special requests.",
        parameters: {
          type: "object",
          properties: {
            bookingId: { type: "string", description: "The Tracking ID of the booking to edit." },
            notes: { type: "string", description: "The notes or details to append/update." }
          },
          required: ["bookingId", "notes"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_ticket",
        description: "Update details of an existing support ticket (e.g., closing a ticket, reopening, changing priority, adding description).",
        parameters: {
          type: "object",
          properties: {
            ticketId: { type: "string", description: "The ID or database ID of the support ticket." },
            status: { type: "string", description: "Optional. New status: 'open', 'closed', 'resolved'." },
            description: { type: "string", description: "Optional. Notes or details to add or set." },
            priority: { type: "string", description: "Optional. New priority: 'low', 'medium', 'high', 'urgent'." }
          },
          required: ["ticketId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_my_tickets",
        description: "List all support tickets opened by a user's email address.",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string", description: "The customer email to search tickets for." }
          },
          required: ["email"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "test_email_config",
        description: "Verify if the business SMTP configuration is working correctly.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_account_status",
        description: "Retrieve account diagnostic, service status, subscription plan details, or recent system error logs for a user.",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string", description: "The customer email to query account status for." }
          },
          required: ["email"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "query_external_database",
        description: "Queries the connected external business database (SQL or MongoDB) for real-time information. Only call this when the customer asks for dynamic info not present in the Knowledge Base or FAQ.",
        parameters: {
          type: "object",
          properties: {
            tableName: { type: "string", description: "The table or collection name to query." },
            databaseName: { type: "string", description: "Optional. The specific database name to query from the list of connected databases." },
            searchQuery: { type: "string", description: "A keyword search term or filter to locate the relevant records." }
          },
          required: ["tableName"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "conclude_session",
        description: "Mark the chat session as concluded when the customer says goodbye, implies they don't need further assistance, or the primary goal of the conversation has been achieved.",
        parameters: {
          type: "object",
          properties: { reason: { type: "string" } },
          required: ["reason"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "email_support_or_chat_info",
        description: "Email conversation transcripts, chat summaries, steps needed to solve an issue, or account/ticket/booking modification receipts directly to the user.",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string", description: "The customer email to send the information to." },
            type: { 
              type: "string", 
              enum: ["conversation_transcript", "chat_summary", "steps_to_solve", "modification_receipt"], 
              description: "The category of information to email." 
            },
            details: { type: "string", description: "The exact summary, troubleshooting steps, or details of the modification to include in the email body." }
          },
          required: ["email", "type", "details"]
        }
      }
    }
  ];

  while (!runComplete && iterations < 5) {
    iterations++;
    try {
      // Map contents for Groq API
      const groqMessages: any[] = [];
      for (let idx = 0; idx < messages.length; idx++) {
        const m = messages[idx];
        if (m.role === 'model' || m.role === 'assistant') {
          if (m.tool_calls) {
            groqMessages.push({
              role: 'assistant',
              content: m.content || m.text || '',
              tool_calls: m.tool_calls
            });
          } else {
            groqMessages.push({
              role: 'assistant',
              content: m.content || m.text || ''
            });
          }
        } else if (m.role === 'tool') {
          groqMessages.push({
            role: 'tool',
            content: m.content || '{}',
            tool_call_id: m.id || m.name
          });
        } else {
          const textContent = m.content || m.text || (idx === messages.length - 1 && media && media.data ? 'Attached design reference image' : 'Attached document or file');
          let messageContent: any = textContent;
          if (idx === messages.length - 1 && media && media.data) {
            const base64Data = media.data.includes(';base64,') 
              ? media.data.split(';base64,')[1] 
              : media.data;
            messageContent = [
              { type: 'text', text: textContent },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${media.mimeType || 'image/jpeg'};base64,${base64Data}`
                }
              }
            ];
          }
          groqMessages.push({
            role: 'user',
            content: messageContent
          });
        }
      }

      const isComplex = !!media || iterations > 2;
      const selectedModel = AI_MODELS.FLASH;

      const response = await groq.chat.completions.create({
        model: selectedModel,
        messages: groqMessages,
        tools: tools as any,
        system: systemPrompt,
        max_tokens: 2000,
        temperature: 0.3
      });

      const toolCalls = response.choices[0]?.message?.tool_calls || [];
      let aiResponseText = response.choices[0]?.message?.content || "";
      let jsonAction: any = null;
      let finalCalls: any[] = toolCalls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        args: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
      }));

      if (aiResponseText.trim().startsWith('{')) {
        try {
          const cleaned = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          jsonAction = JSON.parse(cleaned);
          if (jsonAction.response) {
            aiResponseText = jsonAction.response;
          }
          if (jsonAction.imageUrl) {
            savedImageUrl = jsonAction.imageUrl;
          }
          if (jsonAction.tool_action && jsonAction.tool_action.name) {
            const ja = jsonAction.tool_action;
            const mappedName = ja.name === 'create_booking' ? 'create_booking_in_database' 
                            : ja.name === 'create_ticket' ? 'create_support_ticket'
                            : ja.name;
            finalCalls.push({ name: mappedName, args: ja.args || {} });
          }
        } catch (e) {
          logger.warn('Failed to parse JSON response in chatService');
        }
      }

      if (finalCalls.length > 0) {
        // Handle tool calls
        const output = { 
          role: 'model', 
          tool_calls: finalCalls.map(fc => ({ 
            id: fc.id, 
            function: { name: fc.name, arguments: JSON.stringify(fc.args) } 
          })) 
        };
        messages.push(output);
        for (const fc of finalCalls) {
          const result = await executeTool(fc.name, fc.args);
          messages.push({ role: 'tool', name: fc.name, content: JSON.stringify(result) });
        }
      } else {
        aiResponse = aiResponseText;
        aiResponse = GuardrailSanitizer.sanitizeResponse(aiResponse);
        
        // 2. Detect if the AI extracted data
        const dataRegex = /:::DATA_EXTRACTED:([\s\S]*?):::/;
        const match = aiResponse.match(dataRegex);

        if (match && match[1]) {
          try {
            const extractedData = JSON.parse(match[1]);
            // Clean inputs
            const updates = {
              name: extractedData.name !== 'extracted_name' ? extractedData.name : undefined,
              email: extractedData.email !== 'extracted_email' ? extractedData.email : undefined,
              phone: extractedData.phone !== 'extracted_phone' ? extractedData.phone : undefined,
              telegramUsername: extractedData.telegramUsername !== 'extracted_telegram_username' ? extractedData.telegramUsername : undefined,
              whatsappJid: extractedData.whatsappJid !== 'extracted_whatsapp_jid' ? extractedData.whatsappJid : undefined,
            };
            
            // If contact was anonymous, now we might have real info, resolve to create Contact
            if (!contact._id && (updates.email || updates.phone)) {
               const newContact = await identityService.resolveContact(clientId, {
                 email: updates.email,
                 phone: updates.phone,
                 name: updates.name,
                 telegramUserId: platform === 'telegram' ? sessionId : undefined,
                 telegramUsername: updates.telegramUsername,
                 whatsappJid: platform === 'whatsapp' ? sessionId : undefined,
                 widgetSessionId: platform === 'widget' ? sessionId : undefined
               }, platform);
               
               if (newContact && newContact._id) {
                 if (platform === 'telegram') {
                     await identityService.syncTelegramIdentity(clientId, newContact._id.toString(), { id: sessionId, chat_id: sessionId, first_name: updates.name || userName });
                 } else if (platform === 'whatsapp') {
                     await identityService.syncWhatsAppIdentity(clientId, newContact._id.toString(), { jid: sessionId, name: updates.name || userName, phone: updates.phone });
                 }
               }
            } else if (contact._id) {
               // Consolidate profiles
               await identityService.updateAndConsolidate(contact._id, updates);
            }
          } catch (parseError) {
            console.error("Failed to parse extracted data:", parseError);
          }
          // Remove tracking tag
          aiResponse = aiResponse.replace(dataRegex, '').trim();
        }

        runComplete = true;
      }
    } catch (aiErr: any) {
      runComplete = true;
      aiResponse = "I'm having trouble processing that right now. Please try again.";
      logger.error({ err: aiErr, clientId }, 'Gemini chat completion failed');
    }
  }

  let finalResponse = aiResponse.trim();
  if (finalResponse) {
    await AILog.create({ clientId, sessionId, role: 'model', content: finalResponse });
  }

  return {
    text: finalResponse,
    userName: capturedLeadInfo?.fullName || finalName || undefined,
    userEmail: capturedLeadInfo?.email || finalEmail || undefined,
    imageUrl: savedImageUrl
  };
}
