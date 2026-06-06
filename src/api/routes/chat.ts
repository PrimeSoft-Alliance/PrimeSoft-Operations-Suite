import express from 'express';
import { Groq } from 'groq-sdk';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Settings, UsageStats, AILog, Booking, Client, OnboardingRequest, Invite, PlatformSettings, AITrainingKnowledge } from '../models';
import { startOfDay, endOfDay, format, addMinutes, isAfter } from 'date-fns';
import { sendEmail } from '../email';
import { upsertLead } from '../leads';
import { incrementAiUsage } from '../../lib/usage';
import { resolveClientId } from '../utils/resolveClient';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

router.get('/widget.js', (req, res) => {
  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  
  const script = `
(function() {
  const scriptTag = document.currentScript;
  const clientId = scriptTag?.getAttribute('data-client-id') || (new URLSearchParams(window.location.search)).get('clientId') || '';
  
  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  
  const iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/chatbot-mini' + (clientId ? '?clientId=' + clientId : '');
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
  iframe.style.display = 'none';
  
  const toggle = document.createElement('button');
  toggle.innerHTML = 'Agent Chat';
  toggle.style.padding = '0 20px';
  toggle.style.height = '50px';
  toggle.style.borderRadius = '25px';
  toggle.style.background = '#6366f1';
  toggle.style.color = 'white';
  toggle.style.border = 'none';
  toggle.style.fontSize = '14px';
  toggle.style.fontWeight = 'black';
  toggle.style.textTransform = 'uppercase';
  toggle.style.letterSpacing = '0.05em';
  toggle.style.cursor = 'pointer';
  toggle.style.boxShadow = '0 4px 15px rgba(99,102,241,0.3)';
  
  toggle.onclick = () => {
    if (iframe.style.display === 'none') {
      iframe.style.display = 'block';
    } else {
      iframe.style.display = 'none';
    }
  };
  
  container.appendChild(iframe);
  container.appendChild(toggle);
  document.body.appendChild(container);
})();
  `;
  res.set('Content-Type', 'application/javascript');
  res.send(script);
});

router.post('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { message, sessionId, history = [], pageContext, userName, userEmail: chatUserEmail } = req.body;
    const clientId = await resolveClientId(req);
    
    if (!clientId) {
      return res.status(401).json({ error: 'ClientId missing', message: 'Tenant context is required.' });
    }

    // Check for auth token in cookies
    let userRole = 'visitor';
    let userEmail = null;
    let decoded: any = null;
    const token = req.cookies?.admin_token;
    if (token) {
       try {
          decoded = jwt.verify(token, JWT_SECRET);
          userRole = decoded.role;
          userEmail = decoded.email;
       } catch(e) {}
    }

    // Global maintenance check
    const platformSettings = await PlatformSettings.findOne();
    if (platformSettings?.maintenanceMode && userRole !== 'superadmin') {
      return res.status(503).json({ 
        message: 'The platform is currently undergoing scheduled maintenance. Please try again later or contact support.',
        maintenance: true 
      });
    }

    let clientRecord = await Client.findOne({ clientId });

    if (!clientRecord && clientId === 'platform-prime') {
      clientRecord = await Client.create({
        clientId: 'platform-prime',
        businessName: 'Platform Central',
        email: 'central@platform.com',
        password: 'platform_prime_placeholder',
        role: 'superadmin',
        status: 'active'
      });
    }

    if (!clientRecord) {
      return res.status(404).json({ 
        error: 'Client not found', 
        message: "I couldn't find the configuration for this business. Please contact support." 
      });
    }

    // Stop if suspended
    if (clientRecord?.status === 'suspended') {
      return res.status(401).json({ 
        message: 'This service is currently unavailable. Please contact the business through alternative channels.',
        suspended: true 
      });
    }

    // Check usage limits
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) {
      usage = await UsageStats.create({ clientId, month: currentMonth });
    }

    let settings = await Settings.findOne({ clientId });

    if (!settings && clientId === 'platform-prime') {
      settings = await Settings.create({
        clientId: 'platform-prime',
        businessName: 'Platform Central',
        contactEmail: 'central@platform.com',
        aboutText: 'The central hub for all platform operations and client management.'
      });
    }

    if (!settings) return res.status(500).json({ error: 'Settings not found', message: "Configuration for this business is incomplete." });
    
    // Get actual limit from Client record
    let messageLimit = clientRecord?.aiMessageLimit || 1000;

    if (usage.aiMessagesUsed >= messageLimit) {
      return res.status(401).json({ 
        message: 'Monthly AI usage limit reached. Please contact the business directly.',
        limitReached: true 
      });
    }

    // ... handle onboarding email notifications ...
    const notifySuperadmin = async (requestId: string, businessName: string, email: string) => {
        const superAdmin = await Client.findOne({ role: 'superadmin' });
        if (superAdmin) {
          sendEmail(superAdmin.email, 'New Onboarding Request Received', 
            `A new onboarding request has been submitted by ${businessName} (${email}).\nView it in the superadmin dashboard.`,
            undefined, clientId
          );
        }
        // Send Confirmation to User
        sendEmail(email, 'Application Received', 
          `Hello ${businessName},\n\nWe have received your application. Our team will review it and get back to you shortly.\n\nStatus: Under Review\nRequest ID: ${requestId}`,
          undefined, clientId
        );
    };

    await AILog.create({
      clientId,
      sessionId,
      role: 'user',
      content: message
    });

    const userFirstName = userName ? userName.split(' ')[0] : (chatUserEmail?.split('@')[0] || '');
    const nameInstruction = userFirstName 
      ? `The user's name is ${userFirstName}. You MUST refer to them by their first name frequently (e.g. "Sure, ${userFirstName}...", "Great question, ${userFirstName}") to maintain a personalized technical session.` 
      : 'The user has not provided a name yet.';

    // Load AI training knowledge for superadmin landing page
    let trainingKnowledgeSection = '';
    if (clientId === 'platform-prime') {
      const trainingData = await AITrainingKnowledge.find({ clientId, status: 'active' }).lean();
      if (trainingData && trainingData.length > 0) {
        const groupedByCategory = trainingData.reduce((acc: any, item: any) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(`- ${item.title}: ${item.content}`);
          return acc;
        }, {});
        
        trainingKnowledgeSection = '\n\n## SUPERADMIN AI TRAINING KNOWLEDGE\n';
        Object.entries(groupedByCategory).forEach(([category, items]: [string, any]) => {
          trainingKnowledgeSection += `\n### ${category}\n${(items as string[]).join('\n')}`;
        });
      }
    }

    const systemPrompt = `
      # SYSTEM INSTRUCTIONS — ${clientRecord.businessName} AI ASSISTANT

      You are the official AI assistant for ${clientRecord.businessName}.
      You assist website visitors, clients, and administrators.

      ## THE "RAG" PRINCIPLE (Retrieval-Augmented Generation)
      - ALWAYS lookup information before answering.
      - NEVER guess services, prices, or business details.
      - Your knowledge is STRICTLY limited to the "CONTEXT AWARENESS" section below and tool outputs.
      - If a user asks about your business, check the "CONTEXT AWARENESS" section first.
      - If the answer is not in "CONTEXT AWARENESS" AND "External Knowledge Source" is ENABLED, use the "query_external_db" tool to search for the answer.
      - If information is missing from both, say: "I don't have those specific details right now, but I can have a team member contact you." NEVER make things up.

      ## BOOKING PROTOCOL (STRICT SEQUENTIAL GATHERING)
      Follow this exact order for bookings. Do NOT skip steps or ask for multiple details in one message.
      1. **Date:** Ask when they'd like to visit.
      2. **Availability:** Once a date is provided, call 'check_availability' IMMEDIATELY. Show slots in 12-hour AM/PM format (e.g., 10:30 AM).
      3. **Time Slot:** Ask which specific time slot they prefer.
      4. **Full Name:** Ask for their legal full name.
      5. **Phone:** Ask for their contact phone number.
      6. **Email:** Ask for their email address for confirmation.
      7. **Service:** Ask which service they want from the "Services Offered" list.
         - **CRITICAL:** If the user says "none", "no", "not now", or is unsure, you MUST NOT call 'book_appointment'. Stop and offer general information or human support.
      8. **Final Confirmation:** Only call 'book_appointment' once ALL details are explicitly confirmed by the user. Do not assume any missing fields.

      ## FORMATTING & PRIVACY RULES
      - NEVER show technical IDs (e.g., 'bookingId', '6a076...') or "ObjectId".
      - TIME: Always use 12-hour AM/PM format in chat.
      - Success Message: "Fantastic! Your appointment for [Service] on [Date] at [Time] is confirmed. You'll receive an email shortly. Is there anything else I can help you with?"
      - Farewell: If the user is finished, close with "Have a lovely day!" or "It's been a pleasure. Take care!"

      ## PERSONA
      - You are a professional, warm, and highly efficient receptionist.
      - Natural language only. No robotic scripts.
      - Be warm and attentive.

      ## MULTI-TENANT SAFETY
      - Current clientId: ${clientId}.
      - EXCLUSIVELY use data for this clientId. Isolation is critical.

      ## CONTEXT AWARENESS (Primary Knowledge Base)
      - Current Date/Time: ${new Date().toISOString()}
      - Today's Day: ${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())}
      - Note: Use "Today's Day" as your anchor for relative terms like "tomorrow" (+1 day), "next Monday", etc.
      - Client Name: ${settings.businessName}
      - Contact: ${settings.contactEmail}, ${settings.contactPhone}
      - Business Bio: ${settings.branding?.aboutText || settings.aboutText || "Professional business dedicated to excellence."}
      - Services Offered: ${settings.services.map((s: any) => `${s.name} ($${s.price}): ${s.description}`).join(' | ')}
      - FAQs: ${settings.faqs.map((f: any) => `Q: ${f.question} -> A: ${f.answer}`).join('\n')}
      ${trainingKnowledgeSection}
      
      Page Context:
      - Page: ${pageContext?.page || 'Home'}
      - URL: ${pageContext?.route || '/'}
      - User Access: ${userRole}${chatUserEmail || userEmail || decoded?.email ? ` (${chatUserEmail || userEmail || decoded?.email})` : ''}

      ## BEHAVIOR GUIDELINES
      - Instructions: ${settings.aiBehaviorInstructions || "Be professional and encourage bookings."}
      - External Knowledge Source: ${settings.externalDbConfig?.enabled ? 'CONNECTED & ENABLED' : 'DISABLED'}
      - ${nameInstruction}
    `;

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Check for available booking slots on a specific date. Must be called before booking.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              serviceName: { type: "string", description: "The specific service name from the services list." }
            },
            required: ["date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Create a firm booking. Only call this AFTER the user has provided all details and EXPLICITLY confirmed a service and slot. If the user declines a service or says 'none', DO NOT call this.",
          parameters: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              phoneNumber: { type: "string" },
              email: { type: "string" },
              serviceName: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              startTime: { type: "string", description: "HH:mm (24h format)" },
              notes: { type: "string" }
            },
            required: ["fullName", "phoneNumber", "email", "serviceName", "date", "startTime"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_external_db",
          description: "Retrieve advanced business info or knowledge-base details. Call this if the user's question isn't answered in the primary system prompt.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The specific topic or question to search for." }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "submit_onboarding_request",
          description: "Onboard a new business. Only use if serving the main platform client.",
          parameters: {
            type: "object",
            properties: {
              businessName: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              businessType: { type: "string" },
              details: { type: "object" }
            },
            required: ["businessName", "email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_status",
          description: "Check the status of a previous booking or onboarding application.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["onboarding", "booking"] },
              email: { type: "string" }
            },
            required: ["type", "email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "collect_lead",
          description: "Save user's contact information to the leads database. Use this when the user expresses interest but isn't ready to book, or just to save their details.",
          parameters: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              interest: { type: "string" },
              notes: { type: "string" }
            },
            required: ["fullName", "email"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_human",
          description: "Transfer the conversation to a human support agent and create a ticket. Use when the user requests a human, has a complex issue, or when you don't have the answer.",
          parameters: {
            type: "object",
            properties: {
              customerName: { type: "string" },
              customerEmail: { type: "string" },
              subject: { type: "string" },
              reason: { type: "string", description: "Reason for transfer" }
            },
            required: ["customerName", "customerEmail", "subject", "reason"]
          }
        }
      }
    ];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    let aiResponse = "";
    if (process.env.GROQ_API_KEY) {
      let runComplete = false;
      let currentMessages = [...messages];
      let iterations = 0;
      const CHAT_MODEL = 'llama-3.3-70b-versatile'; // Standard versatile model for tool use and reasoning
      
      try {
        while (!runComplete && iterations < 5) {
          iterations++;
          const chatCompletion = await groq.chat.completions.create({
            messages: currentMessages,
            model: CHAT_MODEL,
            tools: tools as any,
            tool_choice: "auto",
            temperature: 0, 
          });

          const responseMessage = chatCompletion.choices[0]?.message;
          
          if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            currentMessages.push(responseMessage);
            for (const toolCall of responseMessage.tool_calls) {
              let functionResult = "";
              try {
                const args = JSON.parse(toolCall.function.arguments);
                
                if (toolCall.function.name === 'check_availability') {
                  const { date, serviceName } = args;
                  const dStr = String(date);
                  let dParts = dStr.split('-').map(Number);
                  
                  if (dParts.length !== 3 || isNaN(dParts[0])) {
                     functionResult = JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
                  } else {
                    // Create date safely using mid-day UTC offset to avoid timezone shifts during day-of-week calculation
                    const reqDate = new Date(`${dStr}T12:00:00Z`);
                    const dayOfWeek = reqDate.getUTCDay();
                    const workingHour = settings.workingHours.find((wh: any) => wh.day === dayOfWeek);

                      if (!workingHour || !workingHour.isOpen) {
                        functionResult = JSON.stringify({ 
                          success: false, 
                          availableSlots: [], 
                          reason: `Closed on ${format(reqDate, 'EEEE')}. Our typical hours are from ${workingHour?.openTime || '8:00'} to ${workingHour?.closeTime || '17:00'}.` 
                        });
                      } else {
                        const openTime = workingHour.openTime || '08:00';
                        const closeTime = workingHour.closeTime || '17:00';
                        const openParts = openTime.split(':').map(Number);
                        const closeParts = closeTime.split(':').map(Number);
                        
                        let currentSlot = new Date(reqDate);
                        currentSlot.setHours(openParts[0], openParts[1], 0, 0);

                        const endTime = new Date(reqDate);
                        endTime.setHours(closeParts[0], closeParts[1], 0, 0);

                        const selectedService = settings.services.find((s: any) => s.name === serviceName);
                        const slotDuration = selectedService?.durationMinutes || settings.slotDurationMinutes || 60;
                        const buffer = settings.bufferTimeMinutes || 30;

                        const dayStart = startOfDay(reqDate);
                        const dayEnd = endOfDay(reqDate);
                        const existingBookings = await Booking.find({
                          clientId,
                          preferredDate: { $gte: dayStart, $lte: dayEnd },
                          status: { $in: ['pending', 'confirmed'] }
                        });

                        const availableSlots = [];
                        while (currentSlot < endTime) {
                          const slotEnd = addMinutes(currentSlot, slotDuration);
                          if (isAfter(slotEnd, endTime)) break;

                          const slotStartStr = format(currentSlot, 'HH:mm');
                          const slotEndStr = format(slotEnd, 'HH:mm');

                          const hasOverlap = existingBookings.some(b => {
                            return (slotStartStr >= b.preferredStartTime && slotStartStr < b.preferredEndTime) ||
                                   (slotEndStr > b.preferredStartTime && slotEndStr <= b.preferredEndTime) ||
                                   (slotStartStr <= b.preferredStartTime && slotEndStr >= b.preferredEndTime);
                          });

                          if (!hasOverlap) {
                            const startTime12 = format(currentSlot, 'hh:mm a');
                            const endTime12 = format(slotEnd, 'hh:mm a');
                            availableSlots.push({ 
                              startTime: slotStartStr, 
                              endTime: slotEndStr,
                              displayTime: `${startTime12} - ${endTime12}`
                            });
                          }
                          currentSlot = addMinutes(currentSlot, slotDuration + buffer);
                        }

                        if (availableSlots.length === 0) {
                          functionResult = JSON.stringify({ 
                            success: false, 
                            availableSlots: [], 
                            reason: `We are fully booked on ${format(reqDate, 'yyyy-MM-dd')}. Please check another date.` 
                          });
                        } else {
                          functionResult = JSON.stringify({ success: true, availableSlots });
                        }
                      }
                  }
                } else if (toolCall.function.name === 'book_appointment') {
                  const { fullName, phoneNumber, email, serviceName, date, startTime, notes } = args;
                  
                const selectedService = settings.services.find((s: any) => s.name === serviceName);
                const duration = selectedService?.durationMinutes || settings.slotDurationMinutes || 60;
                
                let startParts = String(startTime).split(':').map(Number);
                let dParts = String(date).split('-').map(Number);
                // Create start date safely
                const startDate = new Date(`${date}T${startTime}:00Z`);
                const endTimeDate = addMinutes(startDate, duration);
                const preferredEndTime = format(endTimeDate, 'HH:mm');

                  if (usage.storageBytesUsed >= usage.storageBytesLimit) {
                    functionResult = JSON.stringify({ success: false, error: "System capacity reached." });
                  } else {
                    const existing = await Booking.findOne({
                      clientId,
                      preferredDate: startOfDay(startDate),
                      status: { $in: ['pending', 'confirmed'] },
                      $or: [
                        { preferredStartTime: { $lte: startTime }, preferredEndTime: { $gt: startTime } },
                        { preferredStartTime: { $lt: preferredEndTime }, preferredEndTime: { $gte: preferredEndTime } }
                      ]
                    });

                    if (existing) {
                      functionResult = JSON.stringify({ success: false, error: "Slot no longer available." });
                    } else {
                      const booking = await Booking.create({
                        clientId,
                        fullName, phoneNumber, email, serviceSelection: serviceName,
                        preferredDate: startOfDay(startDate),
                        preferredStartTime: startTime, preferredEndTime, notes,
                        status: 'pending'
                      });

                      sendEmail(settings.contactEmail, 'New Booking Received', `New booking: ${fullName}\nService: ${serviceName}\nDate: ${date}\nTime: ${startTime}`, undefined, clientId);
                      sendEmail(email, 'Booking Confirmed', `Hello ${fullName}, your booking for ${serviceName} on ${date} at ${startTime} has been received.`, undefined, clientId);

                      // Sync to Leads
                      await upsertLead({
                        clientId,
                        email,
                        phone: phoneNumber,
                        name: fullName,
                        source: 'booking',
                        tags: ['high-intent', 'ai-booking'],
                        data: { serviceSelection: serviceName, date, startTime, notes }
                      }).catch(e => console.error('AI Booking lead sync error:', e));

                      functionResult = JSON.stringify({ success: true, bookingId: booking._id });
                    }
                  }
                } else if (toolCall.function.name === 'collect_lead') {
                  const { fullName, email, phone, interest, notes } = args;
                  
                  // Also create a Contact record so it appears in the Inquiries view
                  const { Contact: ContactModelBatch } = await import('../models');
                  await ContactModelBatch.create({
                    clientId,
                    name: fullName,
                    email,
                    phone: phone || 'N/A',
                    subject: 'AI Intelligence Lead',
                    message: `Interest: ${interest || 'General'}\nNotes: ${notes || 'Captured via Chatbot'}`,
                    source: 'ai_chatbot'
                  }).catch(e => console.error('AI Contact creation error:', e));

                  await upsertLead({
                     clientId,
                     email,
                     phone,
                     name: fullName,
                     source: 'ai',
                     tags: ['ai-collected', interest ? `interest:${interest}` : 'inquiry'],
                     data: { interest, notes }
                  });
                  functionResult = JSON.stringify({ success: true, message: "Lead information saved successfully." });
                } else if (toolCall.function.name === 'submit_onboarding_request') {
                  const { businessName, email, phone, businessType, details } = args;
                  const requestId = `req_${Math.random().toString(36).substring(7)}`;
                  const request = await OnboardingRequest.create({
                    requestId,
                    businessName,
                    email,
                    phone,
                    businessType,
                    details,
                    status: 'pending'
                  });

                  // Notify Superadmin
                  const superAdmin = await Client.findOne({ role: 'superadmin' });
                  if (superAdmin) {
                    sendEmail(superAdmin.email, 'New Onboarding Request Received', 
                      `A new onboarding request has been submitted by ${businessName} (${email}).\nView it in the superadmin dashboard.`,
                      undefined, 'super-admin-001'
                    );
                  }

                  // Send Confirmation to User
                  sendEmail(email, 'Application Received', 
                    `Hello ${businessName},\n\nWe have received your application. Our team will review it and get back to you shortly.\n\nStatus: Under Review\nRequest ID: ${requestId}`,
                    undefined, clientId
                  );

                  functionResult = JSON.stringify({ success: true, requestId, status: 'pending', nextStep: 'Wait for superadmin review' });
                } else if (toolCall.function.name === 'check_status') {
                  const { type, email, id } = args;
                  if (type === 'onboarding') {
                    const reqs = await OnboardingRequest.find({ email }).sort({ createdAt: -1 });
                    if (reqs.length === 0) {
                      functionResult = JSON.stringify({ error: "No onboarding requests found for this email." });
                    } else {
                      const latest = reqs[0];
                      functionResult = JSON.stringify({ 
                        status: latest.status, 
                        businessName: latest.businessName,
                        submittedAt: latest.createdAt,
                        notes: latest.superadminNotes
                      });
                    }
                  } else {
                    const bookings = await Booking.find({ email, clientId }).sort({ createdAt: -1 });
                    if (bookings.length === 0) {
                      functionResult = JSON.stringify({ error: "No bookings found for this email." });
                    } else {
                      const latest = bookings[0];
                      functionResult = JSON.stringify({ 
                        status: latest.status, 
                        service: latest.serviceSelection,
                        date: latest.preferredDate,
                        time: latest.preferredStartTime
                      });
                    }
                  }
                } else if (toolCall.function.name === 'query_external_db') {
                  const { query, tableName } = args;
                  if (!settings.externalDbConfig?.enabled) {
                     functionResult = JSON.stringify({ error: "External database connection is not enabled by the admin." });
                  } else {
                     // Mocked secure connector layer
                     functionResult = JSON.stringify({ 
                       success: true, 
                       message: `Mocked Query Result: Successfully retrieved information related to "${query}" from the ${settings.externalDbConfig.dbType} instance at ${settings.externalDbConfig.host}.`,
                       data: [] 
                     });
                  }
                } else if (toolCall.function.name === 'transfer_to_human') {
                  const { customerName, customerEmail, subject, reason } = args;
                  
                  // Instead of making an internal fetch which might fail due to auth or not existing, let's just create it here:
                  const { Ticket, TicketMessage } = await import('../models');
                  
                  const ticket = await Ticket.create({
                    clientId,
                    customerName,
                    customerEmail,
                    subject,
                    source: 'chat'
                  });

                  await TicketMessage.create({
                    ticketId: ticket._id,
                    senderRole: 'system',
                    senderName: 'System',
                    content: `Chat Transferred by AI. Reason: ${reason}`
                  });

                  // Send email to human (business)
                  if (settings.contactEmail) {
                    await sendEmail(
                      settings.contactEmail,
                      `New Support Ticket: ${subject}`,
                      `A chat has been transferred to human support.\n\nCustomer: ${customerName}\nEmail: ${customerEmail}\nReason: ${reason}\nTicket ID: ${ticket._id}\n\nPlease check the dashboard to reply.`,
                      `<p>A chat has been transferred to human support.</p><p><strong>Customer:</strong> ${customerName}<br/><strong>Email:</strong> ${customerEmail}<br/><strong>Reason:</strong> ${reason}</p><p><a href="http://127.0.0.1:3000/dashboard/tickets">View Ticket</a></p>`,
                      clientId
                    );
                  }

                  // Send email to customer (acknowledgement)
                  await sendEmail(
                    customerEmail,
                    `We've received your request - ${settings.businessName}`,
                    `Hello ${customerName},\n\nOur AI assistant has transferred your request to our human support team. We will review your request and get back to you shortly.\n\nSubject: ${subject}\n\nBest,\nThe ${settings.businessName} Team`,
                    `<p>Hello ${customerName},</p><p>Our AI assistant has transferred your request to our human support team. We will review your request and get back to you shortly.</p><p><strong>Topic:</strong> ${subject}</p><p>Best,<br/>The ${settings.businessName} Team</p>`,
                    clientId
                  );

                  functionResult = JSON.stringify({ success: true, message: "Ticket created and transferred successfully. Let the user know an agent will contact them soon." });
                }
              } catch (e) {
                console.error("Tool execution error:", e);
                functionResult = JSON.stringify({ error: "Could not process request." });
              }
              
              currentMessages.push({
                tool_call_id: toolCall.id,
                role: "tool" as any,
                name: toolCall.function.name,
                content: functionResult,
              });
            }
          } else {
            aiResponse = responseMessage.content || aiResponse || "I'm still here, what else can I help with?";
            runComplete = true;
          }
        }

        if (!aiResponse && currentMessages.length > messages.length) {
           const finalCompletion = await groq.chat.completions.create({
             messages: currentMessages,
             model: CHAT_MODEL,
             temperature: 0,
           });
           aiResponse = finalCompletion.choices[0]?.message?.content || "I've handled your request. How else can I assist?";
        }
      } catch (err: any) {
        if (err?.status === 429 || err?.name === 'RateLimitError') {
          aiResponse = "I'm receiving a lot of requests right now and have reached my temporary processing limit. Please wait a moment or reach out to us using the contact form below.";
        } else {
          throw err;
        }
      }
      
      // Clean up any leaked technical markers or hallucinations
      aiResponse = aiResponse.replace(/<function[\s\S]*?>[\s\S]*?<\/function>/gi, '');
      aiResponse = aiResponse.replace(/<tool_call[\s\S]*?>[\s\S]*?<\/tool_call>/gi, '');
      aiResponse = aiResponse.replace(/<ctrl42>_call:[\s\S]*/gi, '');
      // New: Remove raw JSON blocks that might be appended (common for some models when tools are involved)
      aiResponse = aiResponse.replace(/\{[\s\S]*"date"[\s\S]*"startTime"[\s\S]*\}/gi, '');
      aiResponse = aiResponse.replace(/\{[\s\S]*"availableSlots"[\s\S]*\}/gi, '');
      
      aiResponse = aiResponse.trim();

    } else {
      aiResponse = "AI is not configured right now. Please contact us directly.";
    }

    await incrementAiUsage(clientId, sessionId, 'assistant', aiResponse);

    envRes.sendSuccess({ text: aiResponse });

  } catch (error: any) {
    console.error("Chat route error:", error);
    res.status(500).json({ error: 'Failed to chat', message: error?.message || 'I encountered an error. Please try again.' });
  }
});

export default router;
