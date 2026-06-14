import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Settings, UsageStats, AILog, Booking, Client, OnboardingRequest } from '../models';
import { getGroqClient, DEFAULT_MODEL } from '../utils/ai';

import { startOfDay, endOfDay, format, addMinutes, isAfter } from 'date-fns';
import { sendEmail } from '../email';
import { upsertLead } from '../leads';
import { incrementAiUsage } from '../../lib/usage';
import { resolveClientId } from '../utils/resolveClient';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const groq = getGroqClient();

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
    const token = req.cookies?.auth_token;
    if (token) {
       try {
          decoded = jwt.verify(token, JWT_SECRET);
          userRole = decoded.role;
          userEmail = decoded.email;
       } catch(e) {}
    }

    // Global maintenance check
    const platformSettings = null;
    if (platformSettings?.maintenanceMode) {
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
        role: 'client',
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
    
    // LOG CONTEXT FOR DEBUGGING
    console.log(`[CHAT_AI] [${clientId}] Settings Loaded: Instructions Length: ${settings.aiBehaviorInstructions?.length}, FAQs: ${settings.faqs?.length}, Services: ${settings.services?.length}`);
    
    // Get actual limit from Client record
    let messageLimit = clientRecord?.aiMessageLimit || 1000;

    if (usage.aiMessagesUsed >= messageLimit) {
      return res.status(401).json({ 
        message: 'Monthly AI usage limit reached. Please contact the business directly.',
        limitReached: true 
      });
    }

    // ... handle onboarding email notifications ...
    const notifyAdmin = async (requestId: string, businessName: string, email: string) => {
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

    const systemPrompt = `
      # ROLE & IDENTITY
      You are "${settings.chatbotTitle || 'Assistant'}", the official representative for ${clientRecord.businessName}.
      
      ## CORE DIRECTIVES (PRIORITY 1)
      ${settings.aiBehaviorInstructions || "Be professional and encourage bookings."}
      - Always lead with your assigned identity and tone.
      - Isolation: Current clientId is ${clientId}. ONLY use knowledge for this client.
      
      ## THE "KNOWLEDGE FIRST" PRINCIPLE
      - Check "BUSINESS KNOWLEDGE" below for every answer.
      - NEVER guess services, prices, or business details.
      - If internal knowledge is insufficient AND "External Knowledge Source" is ENABLED, use "query_external_db".
      - External Knowledge Status: ${settings.externalDbConfig?.enabled ? 'CONNECTED & ENABLED' : 'DISABLED'}
      - If you still don't know, say: "I don't have those specific details right now, but I can have a team member contact you."
      
      ## BUSINESS KNOWLEDGE
      - Client Name: ${settings.businessName}
      - Bio: ${settings.branding?.aboutText || settings.aboutText || "Professional business dedicated to excellence."}
      - Contact: ${settings.contactEmail}, ${settings.contactPhone}
      - Services: ${settings.services.map((s: any) => `${s.name} ($${s.price}): ${s.description}`).join(' | ')}
      - FAQs: ${settings.faqs.map((f: any) => `Q: ${f.question} -> A: ${f.answer}`).join('\n')}
      - Today's Date: ${new Date().toISOString()} (${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())})

      ## PERSONALIZATION
      - ${nameInstruction}
      - Refer to users by their first name frequently to maintain engagement.

      ## BOOKING FLOW
      Follow strictly: Date -> check_availability -> Time Slot -> Full Name -> Phone -> Email -> Service -> book_appointment.
      - Show slots in 12h format (e.g. 10:30 AM).
      - Do NOT call book_appointment until ALL fields are confirmed.
      - If user says "No" to a service, do NOT book.

      ## PRIVACY & SAFETY
      - NO technical IDs (bookingId, ObjectId, etc).
      - NO robotic scripts—be conversational but professional.
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

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    let aiResponse = "I'm having difficulty processing that right now. Could you please rephrase or try again?";

    const executeTool = async (name: string, args: any): Promise<string> => {
      try {
        console.log(`[CHAT_AI] Executing tool: ${name}`);
        if (name === 'check_availability') {
          const { date, serviceName } = args;
          const dStr = String(date);
          let dParts = dStr.split('-').map(Number);
          
          if (dParts.length !== 3 || isNaN(dParts[0])) {
             return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
          } else {
            const reqDate = new Date(`${dStr}T12:00:00Z`);
            const dayOfWeek = reqDate.getUTCDay();
            const workingHour = settings.workingHours.find((wh: any) => wh.day === dayOfWeek);

            if (!workingHour || !workingHour.isOpen) {
              return JSON.stringify({ 
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
                return JSON.stringify({ 
                  success: false, 
                  availableSlots: [], 
                  reason: `We are fully booked on ${format(reqDate, 'yyyy-MM-dd')}. Please check another date.` 
                });
              } else {
                return JSON.stringify({ success: true, availableSlots });
              }
            }
          }
        } else if (name === 'book_appointment') {
          const { fullName, phoneNumber, email, serviceName, date, startTime, notes } = args;
          
          const selectedService = settings.services.find((s: any) => s.name === serviceName);
          const duration = selectedService?.durationMinutes || settings.slotDurationMinutes || 60;
          
          const startDate = new Date(`${date}T${startTime}:00Z`);
          const endTimeDate = addMinutes(startDate, duration);
          const preferredEndTime = format(endTimeDate, 'HH:mm');

          if (usage.storageBytesUsed >= usage.storageBytesLimit) {
            return JSON.stringify({ success: false, error: "System capacity reached." });
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
              return JSON.stringify({ success: false, error: "Slot no longer available." });
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

              return JSON.stringify({ success: true, bookingId: booking._id });
            }
          }
        } else if (name === 'collect_lead') {
          const { fullName, email, phone, interest, notes } = args;
          
          const { Contact: ContactModelBatch } = await import('../models');
          await ContactModelBatch.create({
            clientId,
            name: fullName,
            email,
            phone: phone || 'N/A',
            subject: 'AI Intelligence Lead',
            message: `Lead captured via AI chat. Expressed interest: ${interest || 'General'}. Notes: ${notes || ''}`
          });

          await upsertLead({
            clientId,
            email,
            phone: phone || '',
            name: fullName,
            source: 'ai',
            tags: ['nurture', 'ai-chat-lead'],
            data: { interest, notes }
          }).catch(e => console.error('AI Lead sync error:', e));

          return JSON.stringify({ success: true, message: "Lead captured successfully." });
        } else if (name === 'submit_onboarding_request') {
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

          sendEmail(email, 'Application Received', 
            `Hello ${businessName},\n\nWe have received your application. Our team will review it and get back to you shortly.\n\nStatus: Under Review\nRequest ID: ${requestId}`,
            undefined, clientId
          );

          return JSON.stringify({ success: true, requestId, status: 'pending', nextStep: 'Wait for review' });
        } else if (name === 'check_status') {
          const { type, email } = args;
          if (type === 'onboarding') {
            const reqs = await OnboardingRequest.find({ email }).sort({ createdAt: -1 });
            if (reqs.length === 0) {
              return JSON.stringify({ error: "No onboarding requests found for this email." });
            } else {
              const latest = reqs[0];
              return JSON.stringify({ 
                status: latest.status, 
                businessName: latest.businessName,
                submittedAt: latest.createdAt
              });
            }
          } else {
            const bookings = await Booking.find({ email, clientId }).sort({ createdAt: -1 });
            if (bookings.length === 0) {
              return JSON.stringify({ error: "No bookings found for this email." });
            } else {
              const latest = bookings[0];
              return JSON.stringify({ 
                status: latest.status, 
                service: latest.serviceSelection,
                date: latest.preferredDate,
                time: latest.preferredStartTime
              });
            }
          }
        } else if (name === 'query_external_db') {
          const { query } = args;
          if (!settings.externalDbConfig?.enabled) {
             return JSON.stringify({ error: "External database connection is not enabled by the admin." });
          } else {
             return JSON.stringify({ 
               success: true, 
               message: `Mocked Query Result: Successfully retrieved information related to "${query}" from the ${settings.externalDbConfig.dbType} instance at ${settings.externalDbConfig.host}.`,
               data: [] 
             });
          }
        } else if (name === 'transfer_to_human') {
          const { customerName, customerEmail, subject, reason } = args;
          
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

          if (settings.contactEmail) {
            await sendEmail(
              settings.contactEmail,
              `New Support Ticket: ${subject}`,
              `A chat has been transferred to human support.\n\nCustomer: ${customerName}\nEmail: ${customerEmail}\nReason: ${reason}\nTicket ID: ${ticket._id}\n\nPlease check the dashboard to reply.`,
              `<p>A chat has been transferred to human support.</p><p><strong>Customer:</strong> ${customerName}<br/><strong>Email:</strong> ${customerEmail}<br/><strong>Reason:</strong> ${reason}</p><p><a href="http://127.0.0.1:3000/dashboard/tickets">View Ticket</a></p>`,
              clientId
            );
          }

          await sendEmail(
            customerEmail,
            `We've received your request - ${settings.businessName}`,
            `Hello ${customerName},\n\nOur AI assistant has transferred your request to our human support team. We will review your request and get back to you shortly.\n\nSubject: ${subject}\n\nBest,\nThe ${settings.businessName} Team`,
            `<p>Hello ${customerName},</p><p>Our AI assistant has transferred your request to our human support team. We will review your request and get back to you shortly.</p><p><strong>Topic:</strong> ${subject}</p><p>Best,<br/>The ${settings.businessName} Team</p>`,
            clientId
          );

          return JSON.stringify({ success: true, message: "Ticket created and transferred successfully. Let the user know an agent will contact them soon." });
        }
      } catch (err: any) {
        console.error("Helper tool execution error:", err);
        return JSON.stringify({ error: "Could not process request." });
      }
      return JSON.stringify({ error: "Unknown tool call." });
    };

    let runComplete = false;
    let iterations = 0;

    try {
      while (!runComplete && iterations < 8) {
        iterations++;

        const response = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: messages,
          tools: tools as any,
          tool_choice: 'auto',
          temperature: 0.1
        });

        const choice = response.choices[0];
        const messageOutput = choice.message;

        if (messageOutput.tool_calls && messageOutput.tool_calls.length > 0) {
          messages.push(messageOutput);

          for (const toolCall of messageOutput.tool_calls) {
            const functionName = toolCall.function.name;
            let functionArgs: any = {};
            
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (e: any) {
              console.error(`[CHAT_AI] Failed to parse tool arguments for ${functionName}:`, toolCall.function.arguments);
              functionArgs = {};
            }
            
            console.log(`[CHAT_AI] Executing tool: ${functionName}`, functionArgs);
            let functionResult = "";
            try {
              functionResult = await executeTool(functionName, functionArgs);
            } catch (e: any) {
              console.error(`[CHAT_AI] Tool execution crash (${functionName}):`, e);
              functionResult = JSON.stringify({ error: `Critical tool failure: ${e.message || 'unknown'}` });
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              //@ts-ignore
              name: functionName,
              content: functionResult,
            });
          }
        } else {
          aiResponse = messageOutput.content || "I've processed that. What else can I do for you?";
          runComplete = true;
        }
      }
    } catch (err: any) {
      console.error("Groq model execution failed:", err);
      aiResponse = "I'm having difficulty connecting right now. Please try again or contact support.";
    }

    // Clean up any leaked technical markers or hallucinations
    aiResponse = aiResponse.replace(/<function[\s\S]*?>[\s\S]*?<\/function>/gi, '');
    aiResponse = aiResponse.replace(/<tool_call[\s\S]*?>[\s\S]*?<\/tool_call>/gi, '');
    aiResponse = aiResponse.replace(/<ctrl42>_call:[\s\S]*/gi, '');
    aiResponse = aiResponse.replace(/\{[\s\S]*"date"[\s\S]*"startTime"[\s\S]*\}/gi, '');
    aiResponse = aiResponse.replace(/\{[\s\S]*"availableSlots"[\s\S]*\}/gi, '');
    
    aiResponse = aiResponse.trim();

    await incrementAiUsage(clientId, sessionId, 'assistant', aiResponse);

    envRes.sendSuccess({ text: aiResponse });

  } catch (error: any) {
    console.error("Chat route error:", error);
    res.status(500).json({ error: 'Failed to chat', message: error?.message || 'I encountered an error. Please try again.' });
  }
});

export default router;
