import telnyx from 'telnyx';
import { 
  TelnyxNumber, 
  UnifiedMessage,
  Call,
  Contact,
  Lead
} from '../models';
import { redisService } from './redisService';
import { identityService } from './identityService';
import { costEngine } from './costEngine';
import { sendEmail } from '../email';
import { notificationService } from './notificationService';
import pino from 'pino';

const logger = pino({ name: 'TelnyxService' });
const API_KEY = process.env.TELNYX_API_KEY || '';

// Initialize Telnyx safely
let tnx: any = null;
if (API_KEY) {
  tnx = new (telnyx as any)(API_KEY);
} else {
  logger.warn('TELNYX_API_KEY is missing. Telnyx module is in SAFE STANDBY mode.');
}

export class TelnyxService {
  /**
   * Status & Readiness Checks
   */
  async checkReadiness() {
    if (!tnx) return { ready: false, reason: 'api_key_missing' };
    try {
      await tnx.balance.retrieve();
      return { ready: true };
    } catch (err: any) {
      return { ready: false, reason: 'invalid_credentials', detail: err.message };
    }
  }

  private isEnabled(): boolean {
    return !!tnx;
  }

  /**
   * Module 1: Number Management
   */
  async searchNumbers(params: { country_code: string, features?: string[], area_code?: string }) {
    if (!this.isEnabled()) throw new Error('Telnyx service is not configured');
    
    const response = await tnx.availablePhoneNumbers.list({
      filter: {
        country_code: params.country_code,
        features: params.features || ['sms'],
        phone_number: {
          contains: params.area_code
        }
      }
    });
    return response.data;
  }

  async purchaseNumber(clientId: string, phoneNumber: string) {
    if (!this.isEnabled()) throw new Error('Telnyx service is not configured');

    const purchase = await tnx.phoneNumbers.create({
      phone_number: phoneNumber
    });

    const numberDoc = await TelnyxNumber.create({
      clientId,
      externalProviderId: purchase.data.id,
      phoneNumber: phoneNumber,
      status: 'active',
      capabilities: ['sms'],
      capabilitiesConfigured: { sms: true, voice: true } // voice needed for inbound webhook trigger
    });

    await this.emitEvent('number.purchased', { clientId, phoneNumber, externalProviderId: purchase.data.id });
    await this.emitEvent('number.assigned', { clientId, phoneNumber });

    await costEngine.trackUsage({
      clientId,
      eventType: 'number_rental',
      units: 1,
      referenceId: purchase.data.id
    });

    return numberDoc;
  }

  async listNumbers(clientId: string) {
    return await TelnyxNumber.find({ clientId, status: 'active' });
  }

  /**
   * Module 2: SMS Logic
   */
  async sendSMS(clientId: string, from: string, to: string, text: string) {
    if (!this.isEnabled()) {
      await this.emitEvent('sms.failed', { clientId, from, to, error: 'service_not_configured' });
      throw new Error('Telnyx service is not configured');
    }

    try {
      const payload: any = {
        from,
        to,
        text
      };
      
      const message = await tnx.messages.create(payload);

      // Resolve identity for logging
      const contact = await identityService.resolveContact(clientId, { phone: to }, 'telnyx_sms');

      await UnifiedMessage.create({
        clientId,
        messageId: message.data.id,
        type: 'sms',
        direction: 'outbound',
        from,
        to,
        content: text,
        status: 'sent',
        metadata: { telnyx_id: message.data.id, contactId: contact._id }
      });

      await this.emitEvent('sms.sent', { clientId, messageId: message.data.id, from, to });

      await costEngine.trackUsage({
        clientId,
        eventType: 'sms_outbound',
        units: 1,
        referenceId: message.data.id
      });

      return message.data;
    } catch (err: any) {
      logger.error({ err, clientId, to }, 'Failed to send SMS');
      await this.emitEvent('sms.failed', { clientId, from, to, error: err.message });
      throw err;
    }
  }

  /**
   * Module 3: Inbound Webhook Handling (SMS + Missed Call)
   */
  async handleWebhook(clientId: string, event: any) {
    const { event_type, payload } = event.data;
    logger.info({ clientId, eventType: event_type }, 'Telnyx Webhook Received');

    switch (event_type) {
      case 'message.received':
        await this.handleInboundSMS(clientId, payload);
        break;
      case 'call.initiated':
        await this.handleInboundCall(clientId, payload);
        break;
    }
  }

  private async handleInboundSMS(clientId: string, data: any) {
    const from = data.from.phone_number;
    const to = data.to[0].phone_number;
    const text = data.text;
    const messageId = data.id;

    logger.info({ clientId, from, text }, 'Processing Inbound SMS');

    // 1. Resolve Identity
    const contact = await identityService.resolveContact(clientId, { phone: from }, 'telnyx_sms');

    // 2. Store Message
    await UnifiedMessage.create({
      clientId,
      messageId,
      type: 'sms',
      direction: 'inbound',
      from,
      to,
      content: text,
      status: 'received',
      metadata: { telnyx_id: messageId, contactId: contact._id }
    });

    // 3. Emit Event
    await this.emitEvent('sms.received', { clientId, messageId, from, to, text });
  }

  private async handleInboundCall(clientId: string, data: any) {
    const callerNumber = data.from;
    const destNumber = data.to;
    const callId = data.call_control_id;

    logger.info({ clientId, from: callerNumber }, 'Processing Inbound Call (Missed Call Capture)');

    // 1. Emit Incoming Event
    await this.emitEvent('call.incoming', { clientId, callId, from: callerNumber, to: destNumber });

    // 2. Hangup Immediately (No voiceinteraction)
    if (tnx) {
      try {
        await tnx.calls.hangup(callId);
      } catch (err) {
        logger.warn({ err, callId }, 'Failed to hangup call (it might have already ended)');
      }
    }

    // 3. Look for existing contact (do NOT create automatically)
    const contact = await Contact.findOne({ clientId, phone: callerNumber });

    // 4. Update Lead with activity
    if (contact) {
      try {
        await Lead.findOneAndUpdate(
          { clientId, contactId: contact._id },
          { 
            $push: { 
              activities: {
                type: 'call',
                description: `Missed call from ${callerNumber}`,
                date: new Date(),
                metadata: { callId }
              }
            },
            $set: { lastActivity: new Date(), contactEmail: contact.email, contactPhone: contact.phone }
          },
          { upsert: true }
        );
      } catch (err) {
        logger.warn({ err, clientId }, 'Failed to update lead with missed call activity');
      }
    }

    // 5. Store Missed Call
    await Call.create({
      clientId,
      callId,
      direction: 'inbound',
      status: 'missed',
      from: callerNumber,
      to: destNumber,
      metadata: { telnyx_id: callId, contactId: contact?._id || null }
    });

    await this.emitEvent('call.missed', { clientId, callId, from: callerNumber });
    if (contact) {
      await this.emitEvent('lead.captured', { clientId, contactId: contact._id, source: 'telnyx_missed_call', phoneNumber: callerNumber });
    }

    // 6. Trigger Notifications
    await notificationService.sendMissedCall(clientId, {
      from: contact?.name || callerNumber,
      createdAt: new Date()
    });

    // 7. Send Auto-Reply SMS
    const autoReplyText = "Thanks for calling. Sorry we missed your call. We'll get back to you shortly.";
    try {
      await this.sendSMS(clientId, destNumber, callerNumber, autoReplyText);
    } catch (err) {
      logger.error({ err, clientId }, 'Failed to send missed call auto-reply SMS');
    }
  }

  /**
   * Internal Event Emitter
   */
  private async emitEvent(eventType: string, payload: any) {
    try {
      await redisService.client.publish('telnyx_events', JSON.stringify({
        type: eventType,
        payload,
        timestamp: new Date().toISOString()
      }));
      logger.debug({ eventType }, 'Telnyx Event Emitted');
    } catch (err) {
      logger.error({ err, eventType }, 'Failed to emit Telnyx event');
    }
  }
}

export const telnyxService = new TelnyxService();
