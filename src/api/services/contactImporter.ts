import Groq from 'groq-sdk';
import { AI_MODELS } from "../utils/ai";
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = pino({ name: 'ContactImporter' });

const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'contact-parser.md');
const SYSTEM_PROMPT_TEMPLATE = fs.existsSync(PROMPT_PATH) ? fs.readFileSync(PROMPT_PATH, 'utf8') : '';

export interface ParsedContact {
  name: string;
  email: string;
  phone: string;
  telegramUsername?: string;
  whatsappJid?: string;
  validationStatus: 'valid' | 'warning' | 'invalid';
  validationNotes: string;
}

// Lazy initialization of Groq client
let aiClient: Groq | null = null;

function getAiClient(): Groq | null {
  if (!aiClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      aiClient = new Groq({
        apiKey: apiKey
      });
    }
  }
  return aiClient;
}

export class ContactImporter {
  /**
   * Parse contacts from raw string content (CSV, VCF, or semi-structured list)
   */
  static async parseAndValidate(
    fileText: string, 
    fileType: 'csv' | 'vcf' | 'auto',
    dataType: 'All' | 'Email' | 'WhatsApp' | 'Telegram' | 'Number' = 'All'
  ): Promise<ParsedContact[]> {
    const determinedType = fileType === 'auto' ? this.detectFileType(fileText) : fileType;
    logger.info({ fileType: determinedType, dataType }, 'Starting smart contact import');

    const ai = getAiClient();
    if (ai) {
      try {
        const result = await this.parseWithLLM(ai, fileText, determinedType, dataType);
        if (result && result.length > 0) {
          return result;
        }
      } catch (err) {
        logger.error({ err }, 'Groq contact parsing failed. Falling back to rules-based parser.');
      }
    }

    // Fallback parsing if LLM is unavailable or fails
    return this.fallbackParse(fileText, determinedType, dataType);
  }

  private static detectFileType(text: string): 'csv' | 'vcf' {
    if (text.includes('BEGIN:VCARD') || text.includes('END:VCARD')) {
      return 'vcf';
    }
    return 'csv';
  }

  private static async parseWithLLM(
    ai: Groq, 
    fileText: string, 
    fileType: 'csv' | 'vcf',
    dataType: string
  ): Promise<ParsedContact[]> {
    const response = await ai.chat.completions.create({
      model: AI_MODELS.FLASH,
      messages: [
        {
          role: 'user',
          content: `Target Category: ${dataType}\n\nFile Type Hint: ${fileType.toUpperCase()}\n\nRaw file contents:\n---\n${fileText}\n---\n\nReturn a valid JSON array with the parsed contacts following this schema: [{name, email, phone, telegramUsername, whatsappJid, validationStatus, validationNotes}]`
        }
      ],
      system: SYSTEM_PROMPT_TEMPLATE || 'You are an expert contact parser. Parse contact information and return valid JSON.',
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content || '[]';
    let parsed: any;
    
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      logger.error({ error: e, content }, 'Failed to parse LLM response as JSON');
      return [];
    }
    
    // Ensure we return an array of ParsedContact objects
    if (Array.isArray(parsed)) {
      return parsed.filter(item => this.isValidContact(item));
    } else if (parsed.contacts && Array.isArray(parsed.contacts)) {
      return parsed.contacts.filter((item: any) => this.isValidContact(item));
    }
    
    return [];
  }

  private static isValidContact(item: any): item is ParsedContact {
    return item && (
      typeof item.name === 'string' ||
      typeof item.email === 'string' ||
      typeof item.phone === 'string'
    );
  }

  private static fallbackParse(
    fileText: string, 
    fileType: 'csv' | 'vcf',
    dataType: string
  ): ParsedContact[] {
    const results: ParsedContact[] = [];
    if (fileType === 'vcf') {
      const cards = fileText.split(/BEGIN:VCARD/i);
      for (const card of cards) {
        if (!card.trim()) continue;
        let name = '';
        let email = '';
        let phone = '';
        let telegramUsername = '';
        let whatsappJid = '';

        const lines = card.split(/\r?\n/);
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx === -1) continue;
          const key = line.slice(0, colonIdx).toUpperCase();
          const value = line.slice(colonIdx + 1).trim();

          if (key.startsWith('FN')) {
            name = value;
          } else if (key.startsWith('N') && !name) {
            name = value.split(';').reverse().join(' ').trim();
          } else if (key.startsWith('EMAIL')) {
            email = value;
          } else if (key.startsWith('TEL')) {
            phone = value;
          } else if (key.startsWith('X-TELEGRAM')) {
            telegramUsername = value;
          }
        }

        if (name || email || phone) {
          results.push(this.validateAndCleanFallback({
            name, email, phone, telegramUsername, whatsappJid
          }, dataType));
        }
      }
    } else {
      // CSV fallback
      const lines = fileText.split(/\r?\n/);
      if (lines.length < 2) return [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('fn'));
      const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
      const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('number'));
      const tgIdx = headers.findIndex(h => h.includes('telegram') || h.includes('tg'));
      const waIdx = headers.findIndex(h => h.includes('whatsapp') || h.includes('wa'));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        const name = nameIdx !== -1 ? values[nameIdx] || '' : values[0] || '';
        const email = emailIdx !== -1 ? values[emailIdx] || '' : '';
        const phone = phoneIdx !== -1 ? values[phoneIdx] || '' : '';
        const telegramUsername = tgIdx !== -1 ? values[tgIdx] || '' : '';
        const whatsappJid = waIdx !== -1 ? values[waIdx] || '' : '';

        if (name || email || phone) {
          results.push(this.validateAndCleanFallback({
            name, email, phone, telegramUsername, whatsappJid
          }, dataType));
        }
      }
    }

    return results;
  }

  private static validateAndCleanFallback(raw: any, dataType: string): ParsedContact {
    let name = (raw.name || '').trim();
    let email = (raw.email || '').toLowerCase().trim();
    let phone = (raw.phone || '').trim();
    let telegramUsername = (raw.telegramUsername || '').trim();
    let whatsappJid = (raw.whatsappJid || '').trim();

    const notes: string[] = [];

    // Validate and clean name
    if (name) {
      name = name
        .split(/\s+/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      
      if (name.includes('@') || name.includes('http') || name.length < 2 || /^[^a-zA-Z]+$/.test(name)) {
        notes.push('Invalid name format detected');
        name = '';
      }
    }

    // Clean and validate Phone
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly) {
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        notes.push('Phone number has incorrect length (must be 7-15 digits)');
        phone = '';
      } else {
        phone = phone.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
      }
    } else {
      phone = '';
    }

    // Clean and validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      notes.push('Email address is invalidly formatted');
      email = '';
    }

    // Format Telegram
    if (telegramUsername) {
      telegramUsername = telegramUsername.replace(/[\s@]/g, '');
      if (telegramUsername) {
        telegramUsername = `@${telegramUsername}`;
      }
    }

    // Format WhatsApp
    if (whatsappJid) {
      const waDigits = whatsappJid.replace(/\D/g, '');
      if (waDigits) {
        whatsappJid = waDigits.includes('@') ? whatsappJid.trim() : `${waDigits}@s.whatsapp.net`;
      } else {
        whatsappJid = '';
      }
    } else {
      whatsappJid = '';
    }

    // Name fallback heuristic
    if (!name) {
      if (email) {
        name = email.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      } else {
        name = 'Unknown Contact';
      }
    }

    // Validation Status Heuristic
    let validationStatus: 'valid' | 'warning' | 'invalid' = 'valid';

    const isEmailValid = email && emailRegex.test(email);
    const isPhoneValid = phone && phone.replace(/\D/g, '').length >= 7;

    if (!isEmailValid && !isPhoneValid) {
      validationStatus = 'invalid';
      notes.push('No valid email or phone number found');
    } else {
      if (!isEmailValid) {
        notes.push('No email provided');
        if (dataType === 'Email') validationStatus = 'warning';
      }
      if (!isPhoneValid) {
        notes.push('No valid phone number provided');
        if (dataType === 'WhatsApp' || dataType === 'Number') validationStatus = 'warning';
      }
    }

    return {
      name,
      email,
      phone,
      telegramUsername,
      whatsappJid,
      validationStatus,
      validationNotes: notes.join(', ') || 'Successfully parsed and validated via fallback rules'
    };
  }
}
