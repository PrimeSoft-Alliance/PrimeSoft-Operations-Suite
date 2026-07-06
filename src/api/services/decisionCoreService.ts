import Groq from "groq-sdk";
import { AI_MODELS } from "../utils/ai";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = pino({ name: 'DecisionCore' });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});

const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'decision-core.md');
const SYSTEM_PROMPT = fs.existsSync(PROMPT_PATH) ? fs.readFileSync(PROMPT_PATH, 'utf8') : '';

const DecisionSchema = z.object({
  action: z.enum(["GREET", "FAQ", "DRAFT_REPLY", "SEARCH_LOCAL", "CAPTURE_LEAD", "BOOK_APPOINTMENT", "ORDER_LOOKUP", "TICKET_LOOKUP", "PRODUCT_RECOMMENDATION", "ESCALATE", "IGNORE", "ASK_CLARIFYING_QUESTION"]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  entities: z.object({
    tenantId: z.string().default(""),
    channel: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    name: z.string().default(""),
    date: z.string().default(""),
    time: z.string().default(""),
    productSku: z.string().default(""),
  }).default({
    tenantId: "",
    channel: "",
    email: "",
    phone: "",
    name: "",
    date: "",
    time: "",
    productSku: "",
  }),
});

export async function decide(input: {
  userText: string;
  history?: { role: string, content: string }[];
  tenantId: string;
  channel: string;
}) {
  const result = await groq.chat.completions.create({
    model: AI_MODELS.FLASH,
    contents: [{
      role: "user",
      parts: [{ text: JSON.stringify(input) }]
    }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" },
          entities: {
            type: "object",
            properties: {
              tenantId: { type: "string" },
              channel: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              name: { type: "string" },
              date: { type: "string" },
              time: { type: "string" },
              productSku: { type: "string" }
            }
          }
        },
        required: ["action", "confidence", "reason", "entities"],
      },
      temperature: 0.1,
    },
  });

  let text = result.choices[0]?.message?.content ?? "{}";
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return DecisionSchema.parse(JSON.parse(text));
  } catch (err) {
    logger.error({ err, text }, 'Failed to parse decision core output');
    throw err;
  }
}
