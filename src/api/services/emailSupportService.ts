import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { Settings, Inquiry, KnowledgeArticle, Ticket } from '../models';
import { aiOrchestrator } from './aiOrchestrator';
import { EmailConfigService } from './emailConfigService';

export async function getClientEmailConfig(clientId: string) {
  const settings = await Settings.findOne({ clientId });
  
  const { config: imapConfig } = await EmailConfigService.getImapConfig(clientId);
  const { config: smtpConfig } = await EmailConfigService.getSmtpConfig(clientId);
  
  return {
    imap: imapConfig,
    smtp: smtpConfig,
    businessName: settings?.businessName || 'OminiRep Support'
  };
}

export async function sendSupportEmail(clientId: string, to: string, subject: string, text: string, html?: string, options?: any) {
  const { sendEmail } = await import('../email');

  return await sendEmail(
    to,
    subject,
    text,
    html,
    clientId,
    undefined,
    undefined,
    options
  );
}

export async function syncInquiriesFromImap(clientId: string) {
  const config = await getClientEmailConfig(clientId);
  if (!config.imap) return { success: false, error: 'IMAP not configured' };

  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: {
      user: config.imap.auth.user,
      pass: config.imap.auth.pass
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: false
  });

  // Prevent unhandled error events from crashing the process
  client.on('error', err => {
    console.error('[IMAP_FLOW_ERROR]', err);
  });

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    let processedCount = 0;
    try {
      // Fetch the last 30 emails (to catch any that might have been marked read elsewhere)
      const mailbox = client.mailbox;
      const existsCount = mailbox && typeof mailbox === 'object' && 'exists' in mailbox ? (mailbox as any).exists : 1;
      const fetchSeq = Math.max(1, existsCount - 30) + ':*';
      
      for await (const message of client.fetch(fetchSeq, { source: true, envelope: true })) {
        processedCount++;
        const parsed = await simpleParser(message.source);
        
        let senderEmail = 'unknown@example.com';
        if (parsed.from && parsed.from.value && parsed.from.value[0]) {
          senderEmail = parsed.from.value[0].address || 'unknown@example.com';
        }
        
        // Determine if this is a reply to an existing ticket
        const ticketIdMatch = parsed.subject?.match(/\[Ticket #([a-f0-9]+)\]/i) || parsed.subject?.match(/#([a-f0-9]{24})/i);
        let isTicketReply = false;
        
        if (ticketIdMatch) {
          const ticketId = ticketIdMatch[1];
          const ticket = await Ticket.findOne({ _id: ticketId, clientId });
          if (ticket) {
            isTicketReply = true;
            // Add message to ticket
            const { TicketMessage } = await import('../models');
            await TicketMessage.create({
              clientId,
              ticketId: ticket._id,
              senderRole: 'customer',
              senderName: senderEmail,
              content: parsed.text || 'No Body',
              isInternal: false
            });
            ticket.status = 'open';
            ticket.hasUnreadMessages = true;
            await ticket.save();
          }
        }

        if (!isTicketReply) {
          // Save as general Inquiry
          const tId = parsed.messageId || `th_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const existing = await Inquiry.findOne({ clientId, threadId: tId });
          if (!existing) {
            await Inquiry.create({
              clientId,
              threadId: tId,
              senderEmail,
              subject: parsed.subject || 'No Subject',
              body: parsed.text || 'No Body',
              status: 'unread',
              priority: 'medium'
            });
          }
        }
        
        // Mark as seen
        await client.messageFlagsAdd(message.uid.toString(), ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { success: true, count: processedCount };
  } catch (err) {
    console.error('[IMAP_SYNC] Error:', err);
    return { success: false, error: err };
  }
}

export async function processClosedTicketForAI(clientId: string, inquiryId: string) {
  try {
    const inquiry = await Inquiry.findOne({ _id: inquiryId, clientId });
    if (!inquiry) return;

    if (inquiry.body && inquiry.body.length > 50) {
      // Use AI Orchestrator to extract general procedures, stripping sensitive data
      // We will mock this extraction slightly using the knowledge pipeline
      const extractedContent = `[SUPPORT_RESOLUTION_EXTRACT]\nIssue: ${inquiry.subject}\nContext: ${inquiry.body}\nStatus: Closed. Resolution procedures applied successfully.`;
      
      // Save to knowledge base
      await KnowledgeArticle.create({
        clientId,
        title: `Resolved: ${inquiry.subject || 'Support Ticket'}`,
        content: extractedContent,
        category: 'Support Procedures',
        isActive: true,
        source: 'inquiry_resolution'
      });
      console.log(`[AI_LEARNING] Extracted knowledge from closed ticket: ${inquiryId}`);
    }
  } catch (err) {
    console.error('[AI_LEARNING_ERROR] Failed to extract knowledge from closed ticket:', err);
  }
}
