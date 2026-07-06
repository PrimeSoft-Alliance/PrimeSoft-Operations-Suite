import pino from 'pino';

const logger = pino({ name: 'ExtractionUtils' });

export class ExtractionService {
  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    logger.warn('PDF extraction requested but currently disabled for text-only mode');
    return "";
  }

  async extractTextFromImage(buffer: Buffer): Promise<string> {
    logger.warn('Image extraction requested but currently disabled for text-only mode');
    return "";
  }

  async parseEmail(buffer: Buffer) {
    try {
      const mailparserModule = await import('mailparser') as any;
      const { simpleParser } = mailparserModule.default || mailparserModule;
      const parsed = await simpleParser(buffer);
      return {
        subject: parsed.subject,
        text: parsed.text,
        html: parsed.html,
        from: parsed.from?.text,
        date: parsed.date,
        attachments: parsed.attachments
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Email parsing failed');
      throw new Error('Failed to parse email stream');
    }
  }
}

export const extractionService = new ExtractionService();
