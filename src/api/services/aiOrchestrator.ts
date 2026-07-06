import Groq from "groq-sdk";
import { AI_MODELS } from '../utils/ai';
import { identityService } from './identityService';
import { knowledgeSearchService } from './knowledgeSearchService';
import { nlpService } from './nlpService';
import { mlService } from './mlService';
import { Ticket, Notification, Booking, Settings, Conversation, Product, Client, Lead } from '../models';
import { createSystemNotification } from '../utils/notifications';
import pino from 'pino';
import { Server } from 'socket.io';
import { bookingService } from './bookingService';
import fs from 'fs';
import path from 'path';

const logger = pino({ name: 'AIOS_Orchestrator' });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
  }
});

// --- Helpers ---
async function syncLeadAndContact(clientId: string, data: { name: string, email: string, source: string, phone?: string, sessionId?: string, platform?: string }) {
  try {
    const { name, email, source, phone, sessionId, platform } = data;
    const evidence: any = { name, sourceChannel: source };
    if (email) evidence.email = email;
    if (phone) evidence.phone = phone;
    
    if (sessionId && platform) {
      if (platform === 'telegram') evidence.telegramUserId = sessionId;
      if (platform === 'whatsapp') evidence.whatsappJid = sessionId;
      if (platform === 'widget') evidence.widgetSessionId = sessionId;
    }

    const newContact = await identityService.resolveContact(clientId, evidence, source);
    
    if (newContact && newContact._id && sessionId && platform) {
       if (platform === 'telegram') {
           await identityService.syncTelegramIdentity(clientId, newContact._id.toString(), { id: sessionId, chat_id: sessionId, first_name: name });
       } else if (platform === 'whatsapp') {
           await identityService.syncWhatsAppIdentity(clientId, newContact._id.toString(), { jid: sessionId, name: name, phone: phone });
       }
    }
    
    return newContact;
  } catch (err) {
    logger.error({ err }, 'Failed to sync lead/contact');
    return null;
  }
}

export class AIOrchestrator {
  private io?: Server;

  constructor() {}

  public init(io: Server) {
    this.io = io;
  }

  async processMessage(params: { clientId: string, sessionId: string, platform: string, message: string, userId?: string, chatId?: string, imageUrl?: string }) {
    const { clientId, sessionId, platform, message, userId, chatId, imageUrl } = params;

    const contact = await identityService.resolveContact(clientId, {
        [platform === 'telegram' ? 'telegramUserId' : platform === 'whatsapp' ? 'whatsappJid' : 'widgetSessionId']: userId || sessionId
    }, platform);

    if (!contact) return { response: "I'm sorry, I'm having trouble identifying your session.", imageUrl: null };
    if (contact.aiEnabled === false) return null;

    let history: any[] = [];
    try {
      const conv = await Conversation.findOne({ 
        clientId, 
        $or: [{ customerJid: chatId || sessionId }, { customerJid: userId || sessionId }, { contactId: contact._id }]
      });
      if (conv && conv.aiEnabled === false) return null;
      if (conv && conv.messages) {
        history = conv.messages.slice(-10).map((m: any) => ({
          role: m.role === 'customer' || m.sender === 'customer' ? 'user' : 'assistant',
          content: m.text || m.content || '',
          imageUrl: m.imageUrl
        }));
      }
    } catch (e) {
      logger.warn('Failed to load memory');
    }
    
    let finalImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        const publicPath = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
        
        const matches = imageUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1];
          const data = matches[2];
          const safeName = `${Date.now()}-${clientId}-${Math.floor(Math.random() * 1000)}.${extension}`;
          const filePath = path.join(publicPath, safeName);
          fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
          finalImageUrl = `/uploads/${safeName}`;
          logger.info({ finalImageUrl }, 'Image saved to local storage from aiOrchestrator');
        }
      } catch (err) {
        logger.error({ err }, 'Failed to save image from aiOrchestrator');
      }
    }

    history.push({ role: 'user', content: message, imageUrl: finalImageUrl });

    let fileAnalysisContext = "";
    if (finalImageUrl && (finalImageUrl.startsWith('/uploads') || imageUrl?.startsWith('data:image'))) {
      try {
        const fileAnalysisPromptPath = path.join(process.cwd(), 'prompts', 'file-analysis-prompt.md');
        if (fs.existsSync(fileAnalysisPromptPath)) {
          const fileAnalysisPrompt = fs.readFileSync(fileAnalysisPromptPath, 'utf8');
          
          let base64Data: string | undefined;
          let mimeType = 'image/jpeg';

          if (imageUrl?.startsWith('data:image')) {
             const matches = imageUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
             if (matches && matches.length === 3) {
               mimeType = `image/${matches[1]}`;
               base64Data = matches[2];
             }
          } else if (finalImageUrl.startsWith('/uploads')) {
             const filePath = path.join(process.cwd(), 'public', finalImageUrl);
             if (fs.existsSync(filePath)) {
               base64Data = fs.readFileSync(filePath).toString('base64');
             }
          }

          if (base64Data) {
            const analysisResponse = await groq.chat.completions.create({
              model: AI_MODELS.FLASH,
              contents: [{
                role: 'user',
                parts: [
                  { inlineData: { data: base64Data, mimeType } },
                  { text: "Analyze this file based on your instructions." }
                ]
              }],
              config: {
                systemInstruction: fileAnalysisPrompt,
                responseMimeType: 'application/json'
              }
            });

            if (analysisResponse.text) {
              fileAnalysisContext = `\n\n[FILE_ANALYSIS_RESULT]\n${analysisResponse.text}\n\nIMPORTANT: Use this analysis to guide the customer. If the result shows a relevant support issue or custom service request, follow the RECOMMENDED_ACTION. Use the 'imageUrl' or 'attachmentUrl' fields in tools if a file needs to be linked to a ticket or booking. Current file URL: ${finalImageUrl || 'N/A'}`;
            }
          }
        }
      } catch (analysisErr) {
        logger.error({ err: analysisErr }, 'File analysis failed in aiOrchestrator');
      }
    }

    try {
      // 1. Preprocess
      const [nlp, ml, knowledge, settings, products, upcomingAvailability] = await Promise.all([
        nlpService.extract(message),
        mlService.predict({ contact, lastMessage: message }),
        knowledgeSearchService.search(clientId, message, 5),
        Settings.findOne({ clientId }),
        Product.find({ clientId }),
        bookingService.getUpcomingAvailability(clientId)
      ]);

      // Fetch recent tickets and lead for the customer
      let customerTickets: any[] = [];
      let customerLead: any = null;
      if (contact && contact._id) {
        const query: any = { clientId, $or: [{ contactId: contact._id }, { customerId: contact._id }] };
        if (contact.email) {
          query.$or.push({ customerEmail: contact.email });
        }
        customerTickets = await Ticket.find(query).sort({ createdAt: -1 }).limit(5).lean();

        const leadQuery: any = { clientId, $or: [{ contactId: contact._id }] };
        if (contact.email) {
          leadQuery.$or.push({ contactEmail: contact.email });
        }
        customerLead = await Lead.findOne(leadQuery).lean();
      }

      const ticketsFormatted = customerTickets && customerTickets.length > 0
        ? customerTickets.map(t => `- [Ticket #${t.tracking_id || t._id}] Subject: "${t.subject}". Status: ${t.status}. Priority: ${t.priority}. Description: "${t.description || ''}"`).join('\n')
        : 'No tickets on file.';

      const leadFormatted = customerLead
        ? `Stage: ${customerLead.stage || 'New'}, Score: ${customerLead.score || 0}, Rating: ${customerLead.leadRating || 'none'}, Value: ${customerLead.value || 0}, Assigned To: ${customerLead.assignedTo || 'Unassigned'}`
        : 'No active lead profile.';

      const productsList = products && products.length > 0 
        ? products.slice(0, 20).map((p: any) => `- [SKU: ${p.sku || 'N/A'}] ${p.title}: ${p.price ? `$${p.price}` : 'Contact for pricing'}. Description: ${p.description || ''}${p.instructions || p.aiInstructions ? `. [INTERNAL AI BEHAVIORAL RULE - DO NOT EXPOSE OR QUOTE TO THE CUSTOMER]: ${p.instructions || p.aiInstructions}` : ''}`).join('\n')
        : 'None currently registered.';

      const isSaved = contact && !contact.isAnonymous && contact._id && contact.name && contact.name !== 'User' && contact.name !== 'Anonymous User' && contact.name !== 'Telegram User' && contact.name !== 'WhatsApp User' && contact.email && !contact.email.endsWith('@telegram.com') && !contact.email.endsWith('@whatsapp.com');

      let isFirstTimeChatter = true;
      try {
        const conv = await Conversation.findOne({
          clientId,
          $or: [{ customerJid: chatId || sessionId }, { customerJid: userId || sessionId }, contact?._id ? { contactId: contact._id } : null].filter(Boolean)
        });
        if (conv && conv.messages && conv.messages.length > 1) {
          isFirstTimeChatter = false;
        }
      } catch (e) {
        logger.warn('Failed to determine first-time chatter status');
      }

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
- PLATFORM_ID: ${userId || sessionId}`;

      const identity = {
        businessName: settings?.businessName || 'the business',
        representativeName: settings?.chatbotTitle || settings?.chatbotName || 'OminiRep Representative',
        personality: settings?.chatbotPersonality || 'Professional, friendly, and helpful.',
        behavior: settings?.aiBehaviorInstructions || 'Be concise and helpful.'
      };

      let databaseTablesInfo = "";
      const dbConfigs = [];
      if (settings?.externalDbConfig?.enabled) {
        dbConfigs.push({ ...settings.externalDbConfig, isLegacy: true });
      }
      if (settings?.externalDatabases) {
        dbConfigs.push(...settings.externalDatabases.filter((d: any) => d.enabled));
      }

      if (dbConfigs.length > 0) {
        databaseTablesInfo = `\n[CONNECTED_EXTERNAL_DATABASES]\n`;
        const { DatabaseSyncService } = await import('./databaseSyncService');
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
      }

      let dbVerificationEnabled = false;
      let dbVerificationLevel = 0;
      let dbRequiredFields: string[] = [];

      if (settings?.externalDbConfig?.verificationEnabled) {
         dbVerificationEnabled = true;
         dbVerificationLevel = Math.max(dbVerificationLevel, settings.externalDbConfig.verificationLevel || 1);
         dbRequiredFields = [...new Set([...dbRequiredFields, ...(settings.externalDbConfig.requiredFields || [])])];
      }
      if (settings?.externalDatabases) {
         for (const db of settings.externalDatabases) {
           if (db.verificationEnabled) {
             dbVerificationEnabled = true;
             dbVerificationLevel = Math.max(dbVerificationLevel, db.verificationLevel || 1);
             dbRequiredFields = [...new Set([...dbRequiredFields, ...(db.requiredFields || [])])];
           }
         }
      }

      const { verificationService } = await import('./verificationService');
      const verificationSession = await verificationService.getSessionState(clientId, sessionId, platform);
      const isVerified = !dbVerificationEnabled || dbVerificationLevel === 0 || (verificationSession && verificationSession.isVerified && verificationSession.verificationLevel >= dbVerificationLevel);

      const securityPrompt = `\n[SECURITY_VERIFICATION_COMPLIANCE]
- DATABASE_POLICY_ENABLED: ${dbVerificationEnabled ? 'YES' : 'NO'}
- REQUIRED_COMPLIANCE_LEVEL: ${dbVerificationEnabled ? dbVerificationLevel : 0}
- USER_COMPLIANCE_LEVEL: ${verificationSession ? verificationSession.verificationLevel : 0}
- IS_VERIFIED: ${isVerified ? 'YES' : 'NO'}
- REQUIRED_FIELDS: ${JSON.stringify(dbRequiredFields || [])}
${!isVerified ? 'CRITICAL: The user has NOT completed verification. You must refuse to retrieve records from the Connected External Database. Inform the user they must complete the identity verification challenge.' : 'User is verified to retrieve private records.'}`;

      const contextBuilder = [
        `AI_IDENTITY: ${JSON.stringify(identity)}`,
        `BUSINESS_SETTINGS: ${JSON.stringify(settings || {})}`,
        customerDetails,
        `CUSTOMER_PROFILE_DOCUMENT: ${JSON.stringify(contact)}`,
        `CUSTOMER_TICKETS:\n${ticketsFormatted}`,
        `CUSTOMER_LEAD_PROFILE:\n${leadFormatted}`,
        `ML_PREDICTIONS: ${JSON.stringify(ml)}`,
        `NLP_EXTRACTION: ${JSON.stringify(nlp)}`,
        `PRODUCT_CATALOG:\n${productsList}`,
        `KNOWLEDGE_BASE:\n${knowledge.map(k => `[${k.source}] ${k.content}`).join('\n')}`,
        `UPCOMING_AVAILABILITY: ${upcomingAvailability}`,
        databaseTablesInfo,
        securityPrompt
      ].filter(c => c).join('\n\n');

      // 2. Think
      let systemPrompt = "";
      try {
        const promptPath = path.join(process.cwd(), 'prompts', 'ominirep-csr.md');
        systemPrompt = fs.readFileSync(promptPath, 'utf8');
      } catch (e) {
        systemPrompt = "You are an experienced OminiRep Representative. Communicate naturally as a professional human. Gather customer Name, Email, and Phone naturally before creating records.";
      }

      // Add core instructions
      try {
        const corePath = path.join(process.cwd(), 'prompts', 'system.md');
        if (fs.existsSync(corePath)) {
            systemPrompt += "\n\n" + fs.readFileSync(corePath, 'utf8');
        }
      } catch (e) {}

      // Add guardrails
      try {
        const guardrailsPath = path.join(process.cwd(), 'prompts', 'guardrails.md');
        if (fs.existsSync(guardrailsPath)) {
          systemPrompt += "\n\n" + fs.readFileSync(guardrailsPath, 'utf8');
        }
      } catch (e) {}

      // Add operation rules
      try {
        const opRulesPath = path.join(process.cwd(), 'prompts', 'operation-rules.md');
        if (fs.existsSync(opRulesPath)) {
          systemPrompt += "\n\n" + fs.readFileSync(opRulesPath, 'utf8');
        }
      } catch (e) {}

      // Add vision skill
      try {
        const visionSkillPath = path.join(process.cwd(), 'prompts', 'vision-skill.md');
        if (fs.existsSync(visionSkillPath)) {
          systemPrompt += "\n\n" + fs.readFileSync(visionSkillPath, 'utf8');
        }
      } catch (e) {}

      // Add lead capture skill
      try {
        const leadCapturePath = path.join(process.cwd(), 'prompts', 'lead-capture.md');
        if (fs.existsSync(leadCapturePath)) {
          systemPrompt += "\n\n" + fs.readFileSync(leadCapturePath, 'utf8');
        }
      } catch (e) {}

      // Add troubleshooting skill
      try {
        const troubleshootingPath = path.join(process.cwd(), 'prompts', 'troubleshooting.md');
        if (fs.existsSync(troubleshootingPath)) {
          systemPrompt += "\n\n" + fs.readFileSync(troubleshootingPath, 'utf8');
        }
      } catch (e) {}

      // Add action json format
      try {
        const actionJsonPath = path.join(process.cwd(), 'prompts', 'action-json.md');
        if (fs.existsSync(actionJsonPath)) {
          systemPrompt += "\n\n" + fs.readFileSync(actionJsonPath, 'utf8');
        }
      } catch (e) {}

      // Add dynamic channel instructions based on platform
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
            systemPrompt += "\n\n" + fs.readFileSync(channelPath, 'utf8');
        } else {
            const unifiedPath = path.join(process.cwd(), 'src', 'prompts', 'channels', 'unified.md');
            if (fs.existsSync(unifiedPath)) {
                systemPrompt += "\n\n" + fs.readFileSync(unifiedPath, 'utf8');
            }
        }
      } catch (e) {
        logger.error({ err: e }, 'Failed to load dynamic channel prompt in aiOrchestrator');
      }

      systemPrompt += `\n\n[CONVERSATION CONTEXT]\n${contextBuilder}${fileAnalysisContext}

[CORE AI INSTRUCTIONS]
1. PERSONA & TONE: You are OminiRep, a friendly, empathetic, helpful, and professional customer support assistant. Always use first-person plural ("we", "our") to refer to the company. Maintain a warm, positive attitude, acknowledge emotions, and match the user's language.
2. CORE CAPABILITIES:
   - Booking Management: Create bookings ('create_booking_in_database'), list bookings ('list_user_bookings'), cancel ('cancel_booking'), reschedule ('reschedule_booking'), or update details ('update_booking_details').
   - Support Ticketing: Create tickets ('create_support_ticket'), list tickets ('list_my_tickets'), and update tickets ('update_ticket' - change status to closed/reopened/resolved, append details, adjust priority).
   - General Inquiries & Tech Support: Answer policies or diagnostic details strictly using the provided KNOWLEDGE_BASE and PRODUCT_CATALOG.
3. CRITICAL - SPECIAL INSTRUCTIONS: ALWAYS check and strictly follow the 'Special Instructions' in the PRODUCT_CATALOG for the specific service/product being requested. This is a absolute requirement.
4. SLOT FILLING & CONFIRMATION: Collect all required information (slots) for any action before proceeding. Always ask the user for confirmation before executing actions that change state (such as creating, rescheduling, canceling bookings or closing/updating tickets).
5. VERIFICATION ON FAILURE: If a booking or ticket lookup fails, do not immediately escalate. Politely ask the user to verify their Tracking ID (e.g. BKG-XXXXX) or their Email address first.
6. TRACKING: Only present friendly Tracking IDs (BKG-XXXXX or TKT-XXXXX) to the user. Never show internal database ObjectID formats.
7. PRIVACY & SECURITY: Enforce data access rules. Mask sensitive personally identifiable info (PII) if accidentally provided. Only act on the authenticated user's own data.
8. ESCALATION & HANDOFF: If the user explicitly asks for a human, if repeated attempts fail, or if you detect frustration/anger, offer a warm handoff to a human support agent.`;

      const contents: any[] = await Promise.all(history.map(async (m) => {
        const parts: any[] = [{ text: String(m.content || '...') }];
        if (m.imageUrl) {
          if (m.imageUrl.startsWith('data:') || m.imageUrl.includes(';base64,')) {
            try {
              const base64Data = m.imageUrl.includes(';base64,') 
                ? m.imageUrl.split(';base64,')[1] 
                : m.imageUrl;
              const mimeType = m.imageUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              });
            } catch (err) {
              logger.warn({ err }, 'Failed to parse base64 image in history');
            }
          } else {
            try {
              if (m.imageUrl.startsWith('/') || m.imageUrl.startsWith('uploads/')) {
                const relativePath = m.imageUrl.startsWith('/') ? m.imageUrl.slice(1) : m.imageUrl;
                const fullDiskPath = path.join(process.cwd(), relativePath);
                if (fs.existsSync(fullDiskPath)) {
                  const data = fs.readFileSync(fullDiskPath);
                  const ext = path.extname(fullDiskPath).toLowerCase();
                  let mimeType = 'image/jpeg';
                  if (ext === '.png') mimeType = 'image/png';
                  else if (ext === '.gif') mimeType = 'image/gif';
                  else if (ext === '.pdf') mimeType = 'application/pdf';
                  else if (ext === '.txt') mimeType = 'text/plain';
                  else if (ext === '.csv') mimeType = 'text/csv';
                  else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  
                  parts.push({
                    inlineData: {
                      mimeType,
                      data: data.toString('base64')
                    }
                  });
                }
              } else if (m.imageUrl.startsWith('http://') || m.imageUrl.startsWith('https://')) {
                const axios = (await import('axios')).default;
                const response = await axios.get(m.imageUrl, { responseType: 'arraybuffer' });
                const mimeType = response.headers['content-type'] || 'image/jpeg';
                parts.push({
                  inlineData: {
                    mimeType,
                    data: Buffer.from(response.data, 'binary').toString('base64')
                  }
                });
              }
            } catch (err) {
              logger.warn({ err, url: m.imageUrl }, 'Failed to load image url in history');
            }
          }
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      }));

      // Ensure alternating roles and start with user
      if (contents.length > 0 && contents[0].role === 'model') {
        contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
      }

      // 2. Define True Action Agent Tools
      const tools = [{
        functionDeclarations: [
          {
            name: "create_booking_in_database",
            description: "Books an appointment or service for a customer. Use this ONLY when the customer has agreed to a time and provided their Name, Email, and Phone number. Use the 'notes' field to provide a human-like summary of why the user is booking, personalized to their needs. Use 'imageNotes' if the user has provided or sent an image/photo of what they want.",
            parameters: {
              type: "OBJECT",
              properties: {
                fullName: { type: "STRING" },
                email: { type: "STRING" },
                phone: { type: "STRING" },
                serviceSelection: { type: "STRING" },
                preferredDate: { type: "STRING", description: "YYYY-MM-DD" },
                preferredStartTime: { type: "STRING", description: "HH:MM (24-hour)" },
                notes: { type: "STRING", description: "Personalized, human-like notes about the booking requirements." },
                imageNotes: { type: "STRING", description: "Optional image URL or base64 photo reference of design/craft requested by user." }
              },
              required: ["fullName", "email", "phone", "serviceSelection", "preferredDate", "preferredStartTime", "notes"]
            }
          },
          {
            name: "list_user_bookings",
            description: "Lists all active or past bookings for a user. Use this when a user asks to view, email, or manage their bookings but hasn't provided a specific ID.",
            parameters: {
              type: "OBJECT",
              properties: {
                email: { type: "STRING", description: "The user's email address to search for bookings." }
              },
              required: ["email"]
            }
          },
          {
            name: "create_support_ticket",
            description: "Create a support ticket to transfer the user to a human agent. Use the 'attachmentUrl' field if the user has uploaded an image or file related to their problem.",
            parameters: {
              type: "OBJECT",
              properties: {
                customerName: { type: "STRING" },
                customerEmail: { type: "STRING" },
                subject: { type: "STRING" },
                description: { type: "STRING" },
                attachmentUrl: { type: "STRING", description: "Optional URL of an uploaded image or document showing the issue." }
              },
              required: ["customerName", "customerEmail", "subject", "description"]
            }
          },
          {
            name: "conclude_session",
            description: "Mark the chat session as concluded when the customer says goodbye, implies they don't need further assistance, or the primary goal of the conversation has been achieved.",
            parameters: {
              type: "OBJECT",
              properties: {
                reason: { type: "STRING" }
              },
              required: ["reason"]
            }
          },
          {
            name: "email_booking_details",
            description: "Send the details of a booking (ID, time, service) to the user via email.",
            parameters: {
              type: "OBJECT",
              properties: {
                bookingId: { type: "STRING", description: "The ID of the booking to email." },
                email: { type: "STRING", description: "Optional email address to send to." }
              },
              required: ["bookingId"]
            }
          },
          {
            name: "cancel_booking",
            description: "Cancel a customer booking in the database. CRITICAL: Always request user confirmation before canceling.",
            parameters: {
              type: "OBJECT",
              properties: {
                bookingId: { type: "STRING", description: "The Tracking ID of the booking to cancel (e.g. BKG-12345)." },
                reason: { type: "STRING", description: "The reason given by the customer for cancelling (if any)." }
              },
              required: ["bookingId"]
            }
          },
          {
            name: "reschedule_booking",
            description: "Reschedule a customer booking to a new date and time. CRITICAL: Always ask for confirmation first.",
            parameters: {
              type: "OBJECT",
              properties: {
                bookingId: { type: "STRING", description: "The Tracking ID of the booking to reschedule (e.g. BKG-12345)." },
                newDate: { type: "STRING", description: "The new date in YYYY-MM-DD format." },
                newTime: { type: "STRING", description: "The new time in HH:MM (24-hour format)." }
              },
              required: ["bookingId", "newDate", "newTime"]
            }
          },
          {
            name: "update_booking_details",
            description: "Update the notes or details of an existing customer booking. For example, to add specifications or special requests.",
            parameters: {
              type: "OBJECT",
              properties: {
                bookingId: { type: "STRING", description: "The Tracking ID of the booking to edit." },
                notes: { type: "STRING", description: "The notes or details to append/update." }
              },
              required: ["bookingId", "notes"]
            }
          },
          {
            name: "update_ticket",
            description: "Update details of an existing support ticket (e.g., closing a ticket, reopening, changing priority, adding description).",
            parameters: {
              type: "OBJECT",
              properties: {
                ticketId: { type: "STRING", description: "The ID or database ID of the support ticket." },
                status: { type: "STRING", description: "Optional. New status: 'open', 'closed', 'resolved'." },
                description: { type: "STRING", description: "Optional. Notes or details to add or set." },
                priority: { type: "STRING", description: "Optional. New priority: 'low', 'medium', 'high', 'urgent'." }
              },
              required: ["ticketId"]
            }
          },
          {
            name: "list_my_tickets",
            description: "List all support tickets opened by a user's email address.",
            parameters: {
              type: "OBJECT",
              properties: {
                email: { type: "STRING", description: "The customer email to search tickets for." }
              },
              required: ["email"]
            }
          },
          {
            name: "get_account_status",
            description: "Retrieve account diagnostic, service status, subscription plan details, or recent system error logs for a user.",
            parameters: {
              type: "OBJECT",
              properties: {
                email: { type: "STRING", description: "The customer email to query account status for." }
              },
              required: ["email"]
            }
          },
          {
            name: "email_support_or_chat_info",
            description: "Email conversation transcripts, chat summaries, steps needed to solve an issue, or account/ticket/booking modification receipts directly to the user.",
            parameters: {
              type: "OBJECT",
              properties: {
                email: { type: "STRING", description: "The customer email to send the information to." },
                type: { 
                  type: "STRING", 
                  enum: ["conversation_transcript", "chat_summary", "steps_to_solve", "modification_receipt"], 
                  description: "The category of information to email." 
                },
                details: { type: "STRING", description: "The exact summary, troubleshooting steps, or details of the modification to include in the email body." }
              },
              required: ["email", "type", "details"]
            }
          },
          {
            name: "test_email_config",
            description: "Verify if the business SMTP configuration is working correctly.",
            parameters: { type: "OBJECT", properties: {} }
          },
          {
            name: "query_external_database",
            description: "Queries the connected external business database (SQL or MongoDB) for real-time information. Only call this when the customer asks for dynamic info not present in the Knowledge Base or FAQ.",
            parameters: {
              type: "OBJECT",
              properties: {
                tableName: { type: "STRING", description: "The table or collection name to query." },
                databaseName: { type: "STRING", description: "Optional. The specific database name to query from the list of connected databases." },
                searchQuery: { type: "STRING", description: "A keyword search term or filter to locate the relevant records." }
              },
              required: ["tableName"]
            }
          }
        ]
      }];

      const isComplex = (nlp.urgency > 0.8) || (ml.purchaseProbability > 0.5);
      const selectedModel = AI_MODELS.FLASH;
      
      const lastMessage = contents[contents.length - 1];

      const config = {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        tools: tools as any,
      };

      const result = await groq.chat.completions.create({ 
        model: selectedModel,
        contents,
        config
      });

      let aiResponseText = result.choices[0]?.message?.content || "";
      let jsonAction: any = null;
      let toolActionFromJson: any = null;
      let imageUrlFromJson: string | null = null;

      // 3. Check for JSON structure in response (explicit or inferred)
      if (aiResponseText.trim().startsWith('{')) {
        try {
          const cleaned = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          jsonAction = JSON.parse(cleaned);
          if (jsonAction.response) {
            aiResponseText = jsonAction.response;
          }
          if (jsonAction.tool_action) {
            toolActionFromJson = jsonAction.tool_action;
          }
          if (jsonAction.imageUrl) {
            imageUrlFromJson = jsonAction.imageUrl;
          }
        } catch (e) {
          logger.warn('Failed to parse JSON response in aiOrchestrator');
        }
      }

      // 4. Check for Function Call (Native or JSON-based)
      const nativeCall = result.functionCalls && result.functionCalls.length > 0 ? result.functionCalls[0] : null;
      let call = nativeCall;

      // Map JSON tool actions to internal tool names if needed
      if (!call && toolActionFromJson && toolActionFromJson.name) {
        const ja = toolActionFromJson;
        const mappedName = ja.name === 'create_booking' ? 'create_booking_in_database' 
                        : ja.name === 'create_ticket' ? 'create_support_ticket'
                        : ja.name;
        call = { name: mappedName, args: ja.args || {} };
      }

      if (call) {
        const actionPhrases: Record<string, string[]> = {
          create_booking_in_database: [
            "Securing that booking slot for you now.",
            "Alright, let me set that up for you.",
            "Sure, let me get that booked for you.",
            "Got it, securing that slot right away.",
            "Perfect, let me check the schedule and lock that in."
          ],
          create_support_ticket: [
            "Got it, logging this for you right away.",
            "Alright, let me get a ticket open for you.",
            "Sure thing, opening a support request for you now.",
            "Let me write this down for the team to check.",
            "Got it, setting up a ticket so our team can follow up."
          ],
          email_booking_details: [
            "Sure, let me send those booking details to your email.",
            "One moment, emailing your booking information now.",
            "Alright, I'm sending that booking confirmation to you right away."
          ],
          conclude_session: [
            "Understood. Have a great day!",
            "Got it. Let me know if you need anything else.",
            "Alright. I've noted that our session is complete."
          ]
        };

        const phrases = actionPhrases[call.name] || ["One moment, processing that for you..."];
        const actionMessage = phrases[Math.floor(Math.random() * phrases.length)];
        
        // INTERMEDIATE MAGIC TRICK (No user typing required)
        try {
          if (platform === 'whatsapp') {
            const { WhatsAppService } = await import('./whatsappService');
            const clientRec = await Client.findOne({ clientId });
            if (clientRec && clientRec.whatsappPhoneNumberId) {
               await WhatsAppService.sendMessage(clientRec.whatsappPhoneNumberId, chatId || sessionId, actionMessage, [], clientRec.whatsappAccessToken);
            }
          } else if (platform === 'telegram') {
            const { telegramManager } = await import('./telegramManager');
            await telegramManager.sendMessage(clientId, chatId || sessionId, { text: actionMessage });
          } else if (platform === 'widget') {
             // Let widget know it's loading/working
             this.io?.to(clientId).emit('agent_status', { status: 'working', text: actionMessage });
          }
        } catch (e) {
          logger.warn("Failed to send intermediate agent action message.");
        }

        let toolResultData: any = {};
        try {
          if (call.name === 'create_booking_in_database') {
            const { fullName, email, phone, serviceSelection, preferredDate, preferredStartTime, notes, imageNotes } = call.args as any;
            const syncedContact = await syncLeadAndContact(clientId, { name: fullName, email, phone, source: platform, sessionId, platform });
            
            const { Product } = await import('../models');
            const matchedProduct = await Product.findOne({ clientId, title: { $regex: new RegExp(serviceSelection, 'i') } });
            const finalNotes = notes || 'Booking request via OminiRep';

            let lastImageUrl = imageUrl;
            if (!lastImageUrl && history) {
              for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].imageUrl) {
                  lastImageUrl = history[i].imageUrl;
                  break;
                }
              }
            }
            const finalImageNotes = imageNotes || lastImageUrl;

            const bookingId = `BKG-${Math.floor(10000 + Math.random() * 90000)}`;
            const booking = await Booking.create({
              clientId, 
              tracking_id: bookingId, 
              contactId: syncedContact?._id || contact._id,
              customerId: syncedContact?._id || contact._id,
              fullName, email, phoneNumber: phone, serviceSelection, preferredDate: new Date(preferredDate), preferredStartTime, status: 'awaiting', notes: finalNotes,
              imageNotes: finalImageNotes
            });
            
            await createSystemNotification(clientId, {
              title: 'New Booking Request',
              message: `${fullName} requested a booking for ${serviceSelection}.`,
              type: 'booking',
              relatedId: booking._id.toString(),
              link: '/dashboard/bookings'
            });

            await bookingService.sendBookingNotifications(booking._id.toString(), platform);
            
            toolResultData = { success: true, bookingId: bookingId };
          } else if (call.name === 'list_user_bookings') {
            const { email } = call.args as any;
            const bookings = await Booking.find({ clientId, email: email.toLowerCase().trim() }).sort({ preferredDate: -1 });
            toolResultData = {
              success: true,
              bookings: bookings.map(b => ({
                id: b.tracking_id,
                service: b.serviceSelection,
                date: b.preferredDate.toISOString().split('T')[0],
                time: b.preferredStartTime,
                status: b.status
              }))
            };
          } else if (call.name === 'create_support_ticket') {
            const { customerName, customerEmail, subject, description, attachmentUrl } = call.args as any;
            const syncedContact = await syncLeadAndContact(clientId, { name: customerName, email: customerEmail, source: platform, sessionId, platform });
            
            let finalAttachmentUrl = attachmentUrl;
            if (!finalAttachmentUrl) {
              // Look back for last image in history
              for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].imageUrl) {
                  finalAttachmentUrl = history[i].imageUrl;
                  break;
                }
              }
            }

            const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
            const ticket = await Ticket.create({
              clientId, 
              tracking_id: ticketId, 
              contactId: syncedContact?._id || contact._id,
              customerId: syncedContact?._id || contact._id, 
              customerName, customerEmail, subject, description, source: platform, priority: 'medium', status: 'open', aiSummary: description,
              imageUrl: finalAttachmentUrl
            });

            await createSystemNotification(clientId, {
              title: 'New Support Ticket Created',
              message: `Ticket #${ticket._id.toString().slice(-6)} created for ${customerName}.`,
              type: 'system',
              relatedId: ticket._id.toString(),
              link: '/dashboard/tickets'
            });
            
            toolResultData = { success: true, ticketId: ticketId };
          } else if (call.name === 'conclude_session') {
            await Conversation.findOneAndUpdate(
              { clientId, $or: [{ customerJid: chatId || sessionId }, { customerJid: userId || sessionId }, { contactId: contact._id }] },
              { $set: { status: 'concluded' } }
            );
            toolResultData = { success: true, session_concluded: true };
          } else if (call.name === 'email_support_or_chat_info') {
            const { email, type, details } = call.args as any;
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
                  $or: [
                    { customerJid: chatId || sessionId },
                    { customerJid: userId || sessionId },
                    { contactId: contact?._id }
                  ].filter(Boolean)
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
            toolResultData = { success: true, message: `Successfully emailed the ${type.replace(/_/g, ' ')} to ${emailLower}.` };
          } else if (call.name === 'get_account_status') {
            const { email } = call.args as any;
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

            toolResultData = {
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
          } else if (call.name === 'email_booking_details') {
            const { bookingId, email } = call.args as any;
            const booking = await Booking.findOne({ 
              clientId, 
              $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }] 
            });
            if (booking) {
              if (email && email !== booking.email) {
                booking.email = email;
                await booking.save();
              }
              await bookingService.sendBookingNotifications(booking._id.toString(), platform);
              toolResultData = { success: true, message: 'Booking details emailed.' };
            } else {
              toolResultData = { success: false, error: 'Booking not found' };
            }
          } else if (call.name === 'cancel_booking') {
            if (false) {
              toolResultData = {};
            } else {
              const { bookingId, reason } = call.args as any;
              const booking = await Booking.findOne({
                clientId,
                $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }]
              });
              if (booking) {
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

                  await createSystemNotification(clientId, {
                    title: 'Support Ticket Created (Cancellation Follow-up)',
                    message: `Ticket #${ticketId} created for ${booking.fullName} cancellation follow-up.`,
                    type: 'system',
                    relatedId: ticket._id.toString(),
                    link: '/dashboard/tickets'
                  });
                } catch (ticketErr) {
                  console.error('[CANCEL_TICKET] Failed to create follow-up ticket in aiOrchestrator:', ticketErr);
                }

                try {
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

                toolResultData = { success: true, message: 'Booking successfully cancelled.' };
              } else {
                toolResultData = { success: false, error: 'Booking not found' };
              }
            }
          } else if (call.name === 'query_external_database') {
            if (!isVerified) {
              toolResultData = { success: false, error: 'Identity verification required before querying the connected external database. Please instruct the customer to verify their identity.' };
            } else {
              const { tableName, searchQuery, databaseName } = call.args as any;
              const { DatabaseSyncService } = await import('./databaseSyncService');
              try {
                const rows = await DatabaseSyncService.queryTable(clientId, tableName, searchQuery, databaseName);
                toolResultData = { success: true, records: rows };
              } catch (err: any) {
                toolResultData = { success: false, error: err.message };
              }
            }
          } else if (call.name === 'reschedule_booking') {
            const { bookingId, newDate, newTime } = call.args as any;
            const booking = await Booking.findOne({
              clientId,
              $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }]
            });
            if (booking) {
              booking.preferredDate = new Date(newDate);
              booking.preferredStartTime = newTime;
              booking.status = 'rescheduled';
              await booking.save();

              try {
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

              toolResultData = { success: true, message: `Booking rescheduled to ${newDate} at ${newTime}.` };
            } else {
              toolResultData = { success: false, error: 'Booking not found' };
            }
          } else if (call.name === 'update_booking_details') {
            const { bookingId, notes } = call.args as any;
            const booking = await Booking.findOne({
              clientId,
              $or: [{ tracking_id: bookingId }, { _id: bookingId.length === 24 ? bookingId : undefined }]
            });
            if (booking) {
              booking.notes = (booking.notes ? booking.notes + '\n' : '') + notes;
              await booking.save();

              try {
                await createSystemNotification(clientId, {
                  title: 'Booking Updated',
                  message: `${booking.fullName}'s booking notes were updated.`,
                  type: 'booking',
                  relatedId: booking._id,
                  link: '/dashboard/bookings'
                });

                const { notificationService } = await import('./notificationService');
                await notificationService.sendBookingUpdated(clientId, booking, `Booking notes updated: "${notes}"`);
              } catch (err) {
                console.error('[UPDATE_NOTIFY] Failed to dispatch notifications/emails:', err);
              }

              toolResultData = { success: true, message: 'Booking notes successfully updated.' };
            } else {
              toolResultData = { success: false, error: 'Booking not found' };
            }
          } else if (call.name === 'update_ticket') {
            const { ticketId, status, description, priority } = call.args as any;
            const { Ticket, TicketMessage } = await import('../models');
            const ticket = await Ticket.findOne({
              clientId,
              $or: [
                { tracking_id: ticketId },
                { ticketId: ticketId },
                { _id: ticketId.length === 24 ? ticketId : undefined }
              ]
            });
            if (ticket) {
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

              if (changes.length > 0) {
                await ticket.save();

                try {
                  await TicketMessage.create({
                    clientId,
                    ticketId: ticket._id,
                    senderRole: 'ai',
                    senderName: 'OminiRep AI',
                    content: `Ticket updated by AI: ${changes.join(', ')}`,
                    isInternal: false
                  });

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
                  console.error('[TICKET_NOTIFY] Failed to update ticket & notify:', err);
                }

                toolResultData = { success: true, message: `Ticket updated successfully: ${changes.join(', ')}.` };
              } else {
                toolResultData = { success: true, message: 'No changes provided.' };
              }
            } else {
              toolResultData = { success: false, error: 'Ticket not found' };
            }
          } else if (call.name === 'list_my_tickets') {
            const { email } = call.args as any;
            const { Ticket } = await import('../models');
            const tickets = await Ticket.find({ clientId, customerEmail: email.toLowerCase().trim() }).sort({ createdAt: -1 });
            toolResultData = {
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
          } else if (call.name === 'sync_contact' || call.name === 'sync_lead_and_contact') {
            const { name, email, phone } = call.args as any;
            const syncedContact = await syncLeadAndContact(clientId, { name, email, phone, source: platform, sessionId, platform });
            toolResultData = { success: true, contactId: syncedContact?._id };
          } else if (call.name === 'test_email_config') {
            const { EmailConfigService } = await import('./emailConfigService');
            const { config, source } = await EmailConfigService.getSmtpConfig(clientId);
            if (!config) {
              toolResultData = { success: false, source, message: 'No SMTP configuration found.' };
            } else {
              const result = await EmailConfigService.verifySmtp(config, source as any);
              toolResultData = { success: result.working, source, message: result.working ? 'SMTP is working.' : `SMTP failed: ${result.error?.message}`, details: result };
            }
          }
        } catch (err) {
          logger.error({ err, tool: call.name }, 'Execution failed');
          toolResultData = { success: false, error: 'Internal system error while executing tool' };
        }

        // 4. Second Agentic Loop (Pass DB Result back to AI)
        const modelContent = result.candidates?.[0]?.content;
        if (modelContent) {
           contents.push(modelContent);
        } else {
           contents.push({
              role: 'model',
              parts: [{ functionCall: call }]
           });
        }
        contents.push({
           role: 'user',
           parts: [{
             functionResponse: {
               name: call.name,
               response: toolResultData
             }
           }]
        });

        const followUpResult = await groq.chat.completions.create({
           model: selectedModel,
           contents,
           config
        });
        
        aiResponseText = followUpResult.text || "";
      } else {
        aiResponseText = result.choices[0]?.message?.content || "";
      }

      // 4. Data Extraction Parsing and Real Persistence
      const dataRegex = /:::DATA_EXTRACTED:([\s\S]*?):::/;
      const match = aiResponseText.match(dataRegex);

      if (match && match[1]) {
        try {
          const extractedData = JSON.parse(match[1]);
          // Clean inputs
          const updates = {
            name: (extractedData.name && extractedData.name !== 'extracted_name') ? extractedData.name : undefined,
            email: (extractedData.email && extractedData.email !== 'extracted_email') ? extractedData.email.trim().toLowerCase() : undefined,
            phone: (extractedData.phone && extractedData.phone !== 'extracted_phone') ? extractedData.phone.trim() : undefined,
            telegramUsername: (extractedData.telegramUsername && extractedData.telegramUsername !== 'extracted_telegram_username') ? extractedData.telegramUsername.trim() : undefined,
            whatsappJid: (extractedData.whatsappJid && extractedData.whatsappJid !== 'extracted_whatsapp_jid') ? extractedData.whatsappJid.trim() : undefined
          };
          
          logger.info({ updates, platform, sessionId }, 'AI extracted data in aiOrchestrator');

          let resolvedContact = contact;

          // If contact was anonymous, now we might have real info, resolve to create Contact
          if ((!contact || !contact._id) && (updates.email || updates.phone)) {
             const evidence: any = {
               email: updates.email,
               phone: updates.phone,
               name: updates.name,
               telegramUsername: updates.telegramUsername,
               whatsappJid: updates.whatsappJid
             };
             if (platform === 'telegram') evidence.telegramUserId = userId || sessionId;
             if (platform === 'whatsapp') evidence.whatsappJid = userId || sessionId;
             if (platform === 'widget') evidence.widgetSessionId = sessionId;

             resolvedContact = await identityService.resolveContact(clientId, evidence, platform);
             
             if (resolvedContact && resolvedContact._id) {
               if (platform === 'telegram') {
                   await identityService.syncTelegramIdentity(clientId, resolvedContact._id.toString(), { id: userId || sessionId, chat_id: chatId || sessionId, first_name: updates.name });
               } else if (platform === 'whatsapp') {
                   await identityService.syncWhatsAppIdentity(clientId, resolvedContact._id.toString(), { jid: userId || sessionId, name: updates.name, phone: updates.phone });
               }
             }
          } else if (contact && contact._id) {
             // Consolidate profiles
             resolvedContact = await identityService.updateAndConsolidate(contact._id.toString(), updates);
          }

          // Link contact._id to Conversation as well
          if (resolvedContact && resolvedContact._id) {
            await Conversation.findOneAndUpdate(
              { clientId, $or: [{ customerJid: chatId || sessionId }, { customerJid: userId || sessionId }, { contactId: contact?._id }] },
              { $set: { contactId: resolvedContact._id } }
            );
          }
        } catch (parseError) {
          logger.error({ parseError }, "Failed to parse extracted data in aiOrchestrator");
        }
        // Remove tracking tag from the response text
        aiResponseText = aiResponseText.replace(dataRegex, '').trim();
      }

      return {
        response: aiResponseText || "I'm sorry, I couldn't process that.",
        imageUrl: imageUrlFromJson
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'AIOS processMessage failed');
      return {
        response: "I'm sorry, I'm having trouble processing that right now. Please try again later.",
        imageUrl: null
      };
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
