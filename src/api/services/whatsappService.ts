import axios from 'axios';

export class WhatsAppService {
  /**
   * Send a WhatsApp message via official Meta WhatsApp Cloud API
   */
  static async sendMessage(channelId: string, to: string, text: string, variables: string[] = [], customApiKey?: string) {
    let phoneId = channelId;
    let accessToken = customApiKey;

    if (channelId) {
      try {
        const { Client } = require('../models');
        const client = await Client.findOne({ whatsappPhoneNumberId: channelId });
        if (client) {
          phoneId = client.whatsappPhoneNumberId || phoneId;
          accessToken = accessToken || client.whatsappAccessToken;
        }
      } catch (err) {}
    }

    if (!phoneId) phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    if (!accessToken) accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

    if (!accessToken || !phoneId) {
      console.warn('[WhatsApp Service] Meta authentication parameters are missing');
      return;
    }

    const cleanTo = to.replace(/\D/g, '');
    const messageText = text || variables[0] || '';

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[WhatsApp Service] Direct Meta Graph Send Message Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify official Meta webhook signature
   */
  static verifySignature(body: string, signature: string, secret: string) {
    const crypto = require('crypto');
    const expected = "sha256=" +
      crypto.createHmac("sha256", secret)
        .update(body)
        .digest("hex");
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch (e) {
      return false;
    }
  }
}
