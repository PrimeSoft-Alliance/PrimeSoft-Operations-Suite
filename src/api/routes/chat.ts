import express from 'express';
import { Groq } from 'groq-sdk';
import { Settings, UsageStats, AILog, Booking } from '../models';
import { startOfDay, endOfDay, format, addMinutes, isAfter } from 'date-fns';
import { sendEmail } from '../email';

const router = express.Router();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

router.get('/widget.js', (req, res) => {
  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  
  const script = `
(function() {
  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  
  const iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/chatbot-mini';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
  iframe.style.display = 'none'; // Hidden by default
  
  const toggle = document.createElement('button');
  toggle.innerHTML = 'AI';
  toggle.style.width = '60px';
  toggle.style.height = '60px';
  toggle.style.borderRadius = '50%';
  toggle.style.background = '#6366f1';
  toggle.style.color = 'white';
  toggle.style.border = 'none';
  toggle.style.fontSize = '20px';
  toggle.style.fontWeight = 'bold';
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
  try {
    const { message, sessionId, history = [], clientId: bodyClientId } = req.body;
    const clientId = bodyClientId || req.headers['x-client-id'] || 'plumber-001';
    
    // Check usage limits
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) {
      usage = await UsageStats.create({ clientId, month: currentMonth });
    }

    const settings = await Settings.findOne({ clientId });
    if (!settings) return res.status(500).json({ error: 'Settings not found' });
    
    // Get actual limit from Client record
    const { Client } = await import('../models');
    const clientRecord = await Client.findOne({ clientId });
    let messageLimit = clientRecord?.aiMessageLimit || 1000;
    
    // Unlimited feature for main client
    if (clientId === 'plumber-001') {
      messageLimit = 999999999;
    }

    if (usage.aiMessagesUsed >= messageLimit) {
      return res.status(403).json({ 
        message: 'Monthly AI usage limit reached. Please contact the business directly.',
        limitReached: true 
      });
    }

    await AILog.create({
      clientId,
      sessionId,
      role: 'user',
      content: message
    });

    const systemPrompt = `
      You are a friendly, professional, and warmly welcoming receptionist for ${settings.businessName}.
      Your primary goal is to assist customers naturally, acting like a real human. Be conversational and empathetic.
      Always ask the right clarifying questions and avoid unnecessary words. Do not let the user know you are an AI.
      
      KNOWLEDGE BASE:
      - Business Name: ${settings.businessName}
      - Contact: ${settings.contactEmail}, ${settings.contactPhone}
      - About: ${settings.aboutText || "We are a professional business dedicated to excellent service."}
      - Services: ${settings.services.map((s: any) => `${s.name}: ${s.description} (${s.durationMinutes} mins) - $${s.price}`).join('; ')}
      - FAQs: ${settings.faqs.map((f: any) => `Q: ${f.question} | A: ${f.answer}`).join('\n')}

      TONE & STYLE:
      ${settings.aiBehaviorInstructions || "Professional and helpful."}
      
      CONCISENESS & FLOW RULES:
      1. Be extremely concise. Avoid repeating what was just said or what the user just provided.
      2. If you've already confirmed a booking, STOP proposing new times unless asked.
      3. If the user says "No thank you" or "That's all", end the conversation professionally. DO NOT call any more tools.
      4. DO NOT explain which tools you are using.
      5. NEVER say "It seems we are fully booked" unless YOU verified it with a check_availability tool call for multiple dates and it returned empty results.
      6. If you've just booked someone, say: "Fantastic! I've confirmed your booking. You'll receive an email shortly. Is there anything else?"
      
      CRITICAL INSTRUCTIONS:
      1. Use ONLY the data provided above. If asked about something not listed, say: "I don't have those specific details right now, but I can have a team member contact you."
      2. Use book_appointment only after collecting Name, Phone, and Email and confirming the time with the user.
      3. Use exact YYYY-MM-DD date for tools.
      4. NEVER output raw technical markers or JSON to the user.
    `;

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Check available time slots for a specific date.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD format" },
              serviceName: { type: "string", description: "The service the user is interested in." }
            },
            required: ["date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Confirm and book the appointment.",
          parameters: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              phoneNumber: { type: "string" },
              email: { type: "string" },
              serviceName: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              startTime: { type: "string", description: "HH:mm" }
            },
            required: ["fullName", "phoneNumber", "email", "serviceName", "date", "startTime"]
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
      
      while (!runComplete && iterations < 5) {
        iterations++;
        const chatCompletion = await groq.chat.completions.create({
          messages: currentMessages,
          model: 'llama-3.3-70b-versatile',
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
                  const reqDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
                  const dayOfWeek = reqDate.getDay();
                  const workingHour = settings.workingHours.find((wh: any) => wh.day === dayOfWeek);

                    if (!workingHour || !workingHour.isOpen) {
                      functionResult = JSON.stringify({ 
                        success: false, 
                        availableSlots: [], 
                        reason: `Closed on ${format(reqDate, 'EEEE')}. Our typical hours are from ${workingHour?.openTime || '8:00'} to ${workingHour?.closeTime || '17:00'}.` 
                      });
                    } else {
                      const { openTime, closeTime } = workingHour;
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
                          availableSlots.push({ startTime: slotStartStr, endTime: slotEndStr });
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
                const startDate = new Date(dParts[0], dParts[1] - 1, dParts[2], startParts[0], startParts[1]);
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

                    functionResult = JSON.stringify({ success: true, bookingId: booking._id });
                  }
                }
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
           model: 'llama-3.3-70b-versatile',
           temperature: 0,
         });
         aiResponse = finalCompletion.choices[0]?.message?.content || "I've handled your request. How else can I assist?";
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

    await AILog.create({
      clientId,
      sessionId,
      role: 'assistant',
      content: aiResponse
    });

    usage.aiMessagesUsed += 1;
    await usage.save();

    res.json({ message: aiResponse });

  } catch (error: any) {
    console.error("Chat route error:", error);
    res.status(500).json({ error: 'Failed to chat', message: error?.message || 'I encountered an error. Please try again.' });
  }
});

export default router;
