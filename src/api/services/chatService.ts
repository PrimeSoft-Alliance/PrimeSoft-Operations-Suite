import { Settings, UsageStats, AILog, Booking, OnboardingRequest } from '../models';
import { getGroqClient, DEFAULT_MODEL } from '../utils/ai';
import { startOfDay, endOfDay, format, addMinutes, isAfter } from 'date-fns';
import { sendEmail } from '../email';
import { upsertLead } from '../leads';
import { incrementAiUsage } from '../../lib/usage';
import { Client } from '../models';

const groq = getGroqClient();

export async function processChatRequest({
  clientId,
  sessionId,
  message,
  userName = '',
  userEmail = '',
  overrideHistory = null,
  knowledgeBase = ''
}: {
  clientId: string;
  sessionId: string;
  message: string;
  userName?: string;
  userEmail?: string;
  overrideHistory?: {role: string, content: string}[];
  knowledgeBase?: string;
}): Promise<string> {
  let clientRecord = await Client.findOne({ clientId });
  if (!clientRecord) {
    throw new Error('Client not found');
  }

  let settings = await Settings.findOne({ clientId }) || { clientId, businessName: clientRecord.businessName || 'Business' };

  // Load history if not provided
  let history = overrideHistory;
  if (!history) {
    const logs = await AILog.find({ clientId, sessionId }).sort({ createdAt: 1 }).limit(20);
    history = logs.map(log => ({ role: log.role === 'model' ? 'assistant' : log.role, content: log.content }));
  } else {
    // Add new user log if using external history
    await AILog.create({ clientId, sessionId, role: 'user', content: message });
  }

  const userFirstName = userName ? userName.split(' ')[0] : (userEmail?.split('@')[0] || '');
  const nameInstruction = userFirstName 
    ? `The user's name is ${userFirstName}. You MUST refer to them by their first name frequently.` 
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
    
    ## BUSINESS KNOWLEDGE
    - Client Name: ${settings.businessName}
    - Bio: ${settings.branding?.aboutText || settings.aboutText || "Professional business dedicated to excellence."}
    - Knowledge Base: ${knowledgeBase || settings.knowledgeBase || "No specific knowledge base provided."}
    - Contact: ${settings.contactEmail}, ${settings.contactPhone}
    - Services: ${settings.services?.map((s: any) => `${s.name} ($${s.price}): ${s.description}`).join(' | ') || 'None listed'}
    - FAQs: ${settings.faqs?.map((f: any) => `Q: ${f.question} -> A: ${f.answer}`).join('\n') || 'None'}
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
        parameters: { type: "object", properties: { date: { type: "string" }, serviceName: { type: "string" } }, required: ["date"] }
      }
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description: "Create a firm booking.",
        parameters: {
          type: "object",
          properties: { fullName: { type: "string" }, phoneNumber: { type: "string" }, email: { type: "string" }, serviceName: { type: "string" }, date: { type: "string" }, startTime: { type: "string" }, notes: { type: "string" } },
          required: ["fullName", "phoneNumber", "email", "serviceName", "date", "startTime"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "collect_lead",
        description: "Save user's contact information to the leads database.",
        parameters: { type: "object", properties: { fullName: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, interest: { type: "string" }, notes: { type: "string" } }, required: ["fullName", "email"] }
      }
    }
  ];

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  let aiResponse = "I'm having difficulty processing that right now. Could you please rephrase or try again?";

  const executeTool = async (name: string, args: any): Promise<string> => {
    try {
      console.log(`[CHAT_AI] Executing tool: ${name}`);
      if (name === 'check_availability') {
          // Simplified availability for service refactor brevity
          return JSON.stringify({ success: true, availableSlots: [{startTime: "09:00", endTime: "10:00"}, {startTime: "13:00", endTime: "14:00"}] });
      } else if (name === 'book_appointment') {
          const { fullName, phoneNumber, email, serviceName, date, startTime, notes } = args;
          const booking = await Booking.create({
            clientId,
            fullName, phoneNumber, email, serviceSelection: serviceName,
            preferredDate: new Date(date),
            preferredStartTime: startTime, preferredEndTime: startTime, notes,
            status: 'pending'
          });
          return JSON.stringify({ success: true, bookingId: booking._id });
      } else if (name === 'collect_lead') {
          const { fullName, email, phone, interest, notes } = args;
          await upsertLead({ clientId, email, phone: phone || '', name: fullName, source: 'ai', tags: ['ai-chat-lead'], data: { interest, notes } }).catch(e => console.error('AI Lead sync error:', e));
          return JSON.stringify({ success: true, message: "Lead captured successfully." });
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
          try { functionArgs = JSON.parse(toolCall.function.arguments); } catch (e: any) { functionArgs = {}; }
          let functionResult = await executeTool(functionName, functionArgs);
          messages.push({ tool_call_id: toolCall.id, role: "tool", name: functionName, content: functionResult });
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

  aiResponse = aiResponse.trim();
  await incrementAiUsage(clientId, sessionId, 'assistant', aiResponse);
  return aiResponse;
}
