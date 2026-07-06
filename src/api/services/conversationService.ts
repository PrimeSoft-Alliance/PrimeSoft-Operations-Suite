import { telnyxService } from './telnyxService';
import { telegramManager } from './telegramManager';
import { WhatsAppService } from './whatsappService';
import { Client, Contact, Conversation, Settings, Ticket, Inquiry, Lead, Booking } from '../models';
import { TelegramIdentity } from '../models';
import { costEngine } from './costEngine';
import pino from 'pino';
import mongoose from 'mongoose';

const logger = pino({ name: 'ConversationService' });

export type GenericChannel = 'telegram' | 'whatsapp' | 'sms' | 'voice' | 'widget' | 'email';

export interface OutboundMessage {
  clientId: string;
  contactId: string;
  channel: GenericChannel;
  text: string;
  templateId?: string; // For WhatsApp 24h window
  subject?: string; // Added for Email
}

export class ConversationService {
  /**
   * Unified entry point for all customer-originated communication.
   * Ensures the identity is resolved and the message is logged to the master timeline.
   */
  async handleInbound(clientId: string, channel: GenericChannel, remoteId: string, content: any) {
    logger.info({ clientId, channel, remoteId }, 'Handling inbound message');
    
    // 1. Identity Resolution (already handled in channel managers, but verified here)
    // 2. Timeline Persistence
    let conv = await (Conversation as any).findOne({ clientId, customerJid: remoteId });
    if (!conv) {
      conv = new Conversation({ clientId, customerJid: remoteId, platform: channel, messages: [] });
    }

    conv.messages.push({
      sender: 'customer',
      text: content.text || '[Media]',
      imageUrl: content.imageUrl,
      timestamp: new Date()
    });

    await conv.save();

    // 3. Trigger Cognitive Engine (AI)
    // To be integrated...
  }

  /**
   * Periodically checks for abandoned chat sessions and sends follow-up messages.
   * Runs as a background task via setInterval in server.ts.
   */
  async runSessionManager() {
    try {
      const now = new Date();
      // Find active conversations updated between 10 hours and 20 hours ago, where follow-up hasn't been sent.
      const abandonedThreshold = new Date(now.getTime() - 10 * 60 * 60 * 1000);
      const expiryThreshold = new Date(now.getTime() - 20 * 60 * 60 * 1000);

      const abandonedConvs = await Conversation.find({
        status: 'active',
        updatedAt: { $lt: abandonedThreshold, $gt: expiryThreshold },
        followUpSent: { $ne: true }
      });

      for (const conv of abandonedConvs) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (lastMsg && lastMsg.sender === 'assistant') {
          // Send follow up
          const followUpMsg = "Hi there! I noticed our chat was interrupted. Are you still there, or is there anything else I can assist you with today?";
          try {
            await this.sendOutbound({
              clientId: conv.clientId,
              contactId: conv.contactId, // wait, conversation has no contactId directly unless we resolve it
              channel: conv.platform,
              text: followUpMsg,
              customerJid: conv.customerJid
            } as any);
          } catch (e) {
            // Might not have contactId natively in OutboundMessage if we just have customerJid, handle natively:
            if (conv.platform === 'telegram') {
              await telegramManager.sendMessage(conv.clientId, conv.customerJid, { text: followUpMsg });
            } else if (conv.platform === 'whatsapp') {
              const client = await Client.findOne({ clientId: conv.clientId });
              if (client && client.whatsappPhoneNumberId) {
                await WhatsAppService.sendMessage(client.whatsappPhoneNumberId, conv.customerJid, followUpMsg, [], client.whatsappAccessToken);
              }
            }
          }
          
          conv.messages.push({
            sender: 'assistant',
            text: followUpMsg,
            timestamp: new Date()
          });
          conv.followUpSent = true;
          await conv.save();
        }
      }

      // Close sessions older than 20 hours
      await Conversation.updateMany(
        { status: 'active', updatedAt: { $lt: expiryThreshold } },
        { $set: { status: 'concluded' } }
      );
    } catch (e) {
      logger.error({ err: e }, 'Error in runSessionManager');
    }
  }

  /**
   * Unified egress for all business-originated communication.
   */
  async sendOutbound(msg: OutboundMessage) {
    const { clientId, contactId, channel, text, templateId } = msg;
    
    if (!contactId || contactId === '') {
        throw new Error('Invalid contactId: cannot be empty');
    }

    const contact = await Contact.findById(contactId);
    if (!contact) throw new Error('Contact not found');

    switch (channel) {
      case 'sms':
        if (!contact.phone) throw new Error('No phone for contact');
        await telnyxService.sendSMS(clientId, 'OMNIREP', contact.phone, text);
        break;
      
      case 'telegram':
        const tgId = await (TelegramIdentity as any).findOne({ clientId, contactId });
        if (!tgId?.chatId) throw new Error('No Telegram chat found');
        await telegramManager.sendMessage(clientId, tgId.chatId, { text });
        break;

      case 'whatsapp':
        // Handle Telnyx WhatsApp or WhatsMeow
        // Logic for 24-hr window goes here
        await this.sendWhatsApp(clientId, contact, text, templateId);
        break;
        
      case 'email':
        if (!contact.email) throw new Error('No email for contact');
        const { sendEmail } = await import('../email');
        const bizName = (await Settings.findOne({ clientId }))?.businessName || 'OminiRep';
        await sendEmail(
            contact.email,
            msg.subject || `Update from ${bizName}`,
            text,
            undefined, // Use plain text for now or add HTML later
            clientId
        );
        break;

      case 'widget':
        // Integrated via Socket.io in WidgetManager
        break;
    }

    // Log to Master Timeline
    await this.logToTimeline(clientId, contactId, 'assistant', text);
  }

  private async sendWhatsApp(clientId: string, contact: any, text: string, templateId?: string) {
    if (contact.whatsappJid) {
        const client = await Client.findOne({ clientId });
        if (client?.whatsappPhoneNumberId) {
          await WhatsAppService.sendMessage(
            client.whatsappPhoneNumberId,
            contact.whatsappJid,
            templateId || 'session_message',
            [text]
          );
        } else {
          logger.warn({ clientId }, 'WhatsApp Business API credentials not configured for client, cannot send WhatsApp');
        }
    }
  }

  private async logToTimeline(clientId: string, contactId: string, role: 'customer' | 'assistant', text: string) {
    // Update master conversation record
    await (Conversation as any).findOneAndUpdate(
      { clientId, contactId },
      { 
        $push: { 
          messages: { 
            role, 
            content: text, 
            timestamp: new Date() 
          } 
        } 
      },
      { upsert: true }
    );
  }
}

export const conversationService = new ConversationService();

export class TicketDeduplicator {
  static async logSupportTicket(contactId: string, title: string, description: string): Promise<any> {
    if (!contactId || contactId === '') {
      throw new Error('Invalid contactId: cannot be empty');
    }
    const timeLimit = new Date();
    timeLimit.setHours(timeLimit.getHours() - 48);

    const activeTicket = await Ticket.findOne({
      contactId: new mongoose.Types.ObjectId(contactId),
      status: 'open',
      updatedAt: { $gte: timeLimit }
    }).sort({ updatedAt: -1 });

    if (activeTicket) {
      const appendedDescription = `${activeTicket.description}\n\n=== FOLLOW-UP INQUIRY (${new Date().toLocaleString()}) ===\nTopic: ${title}\nDetails: ${description}`;
      activeTicket.description = appendedDescription;
      activeTicket.updatedAt = new Date();
      await activeTicket.save();
      return { duplicated: true, ticket: activeTicket };
    }

    const newTicket = await Ticket.create({
      contactId: new mongoose.Types.ObjectId(contactId),
      title,
      description,
      status: 'open',
      updatedAt: new Date()
    });
    return { duplicated: false, ticket: newTicket };
  }
}

export interface UnifiedLeadProfile {
  contact: any;
  lead: any;
  messages: any[];
  tickets: any[];
  bookings: any[];
  inquiries: any[];
}

export class UnifiedLeadResolver {
  static async getFullLeadDetails(contactId: string): Promise<UnifiedLeadProfile> {
    if (!contactId || contactId === '') {
      throw new Error('Invalid contactId: cannot be empty');
    }
    const contactObjectId = new mongoose.Types.ObjectId(contactId);
    
    const [
      contact,
      lead,
      messages,
      tickets,
      bookings,
      inquiries
    ] = await Promise.all([
      Contact.findById(contactObjectId).lean(),
      Lead.findOne({ contactId: contactObjectId }).lean(),
      Conversation.find({ contactId: contactObjectId }).lean(),
      Ticket.find({ contactId: contactObjectId }).sort({ createdAt: -1 }).lean(),
      Booking.find({ contactId: contactObjectId }).sort({ preferredDate: -1 }).lean(),
      Inquiry.find({ contactId: contactObjectId }).sort({ createdAt: -1 }).lean()
    ]);

    if (!contact) throw new Error('Contact not found');

    return {
      contact,
      lead,
      messages,
      tickets,
      bookings,
      inquiries
    };
  }
}
