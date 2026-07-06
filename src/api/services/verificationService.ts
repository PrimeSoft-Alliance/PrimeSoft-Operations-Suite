import { Settings, Booking, Contact, Lead, Ticket, VerificationSession, VerificationAuditLog } from '../models';
import mongoose from 'mongoose';

export interface VerificationPolicy {
  verificationEnabled: boolean;
  requiredFields: string[]; // 'name' | 'email' | 'username' | 'phone' | 'booking_ref' | 'ticket_ref' | 'lead_ref' | 'support_pin' | 'custom'
  verificationLevel: number; // 0 (None), 1 (Light), 2 (Medium), 3 (High)
  stepUpRulesEnabled: boolean;
  customWorkflowsEnabled: boolean;
  expirationMinutes: number; // e.g. 15 minutes
  fallbackRulesEnabled: boolean;
  supportPin?: string;
  customFields?: { name: string; label: string; validationRegex?: string }[];
}

export const DEFAULT_VERIFICATION_POLICY: VerificationPolicy = {
  verificationEnabled: true,
  requiredFields: ['name', 'email'],
  verificationLevel: 1, // Light
  stepUpRulesEnabled: false,
  customWorkflowsEnabled: false,
  expirationMinutes: 15,
  fallbackRulesEnabled: true,
  supportPin: '1234'
};

export const verificationService = {
  /**
   * Loads the active verification policy for a given client/tenant.
   */
  async getPolicy(clientId: string): Promise<VerificationPolicy> {
    const settings = await Settings.findOne({ clientId });
    if (!settings || !settings.verificationPolicy) {
      return { ...DEFAULT_VERIFICATION_POLICY };
    }
    return {
      ...DEFAULT_VERIFICATION_POLICY,
      ...settings.verificationPolicy
    };
  },

  /**
   * Saves or updates the verification policy for a given client/tenant.
   */
  async savePolicy(clientId: string, policy: Partial<VerificationPolicy>): Promise<VerificationPolicy> {
    let settings = await Settings.findOne({ clientId });
    if (!settings) {
      settings = new Settings({ clientId, businessName: 'OminiRep Client' });
    }
    
    const currentPolicy = settings.verificationPolicy || { ...DEFAULT_VERIFICATION_POLICY };
    settings.verificationPolicy = {
      ...currentPolicy,
      ...policy
    };
    
    // Use markModified on strict: false fields to ensure saving
    settings.markModified('verificationPolicy');
    await settings.save();
    return settings.verificationPolicy;
  },

  /**
   * Gets or initializes the verification session state for a given sessionId and clientId.
   */
  async getSessionState(clientId: string, sessionId: string, platform = 'widget') {
    let session = await VerificationSession.findOne({ clientId, sessionId });
    
    if (session) {
      // Check if session has expired
      if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
        await VerificationAuditLog.create({
          clientId,
          sessionId,
          platform,
          action: 'STATE_EXPIRY',
          level: session.verificationLevel,
          details: 'Verification state expired and reset'
        });
        
        session.isVerified = false;
        session.verificationLevel = 0;
        session.verifiedFields = new Map();
        session.expiresAt = null;
        await session.save();
      }
    } else {
      session = new VerificationSession({
        clientId,
        sessionId,
        platform,
        verificationLevel: 0,
        isVerified: false,
        verifiedFields: new Map()
      });
      await session.save();
    }
    
    return session;
  },

  /**
   * Submits a set of verification inputs and updates the session verification state on success.
   * Hard Requirement: Never leak which field matched or failed.
   */
  async submitVerification(
    clientId: string,
    sessionId: string,
    inputs: Record<string, string>,
    platform = 'widget'
  ): Promise<{ success: boolean; error?: string; session: any }> {
    const policy = await this.getPolicy(clientId);
    const session = await this.getSessionState(clientId, sessionId, platform);
    
    if (!policy.verificationEnabled || policy.verificationLevel === 0) {
      session.isVerified = true;
      session.verificationLevel = 0;
      await session.save();
      return { success: true, session };
    }

    // Limit attempts to prevent brute force
    if (session.attempts >= 10 && session.expiresAt && new Date() < new Date(session.expiresAt)) {
      return {
        success: false,
        error: 'Too many verification attempts. Please retry in some minutes.',
        session
      };
    }

    session.attempts = (session.attempts || 0) + 1;

    // Check custom fields or standard fields matching policy requirements
    let matchedCount = 0;
    const errors: string[] = [];
    
    const requiredFields = policy.requiredFields || ['name', 'email'];
    const dbQueryPromises: Promise<any>[] = [];

    // Formulate a robust check against MongoDB:
    // Any matched fields must securely prove the identity of a real customer record
    let nameMatched = false;
    let emailMatched = false;
    let phoneMatched = false;
    let refMatched = false;
    let supportPinMatched = false;

    // Direct input extraction
    const inputName = (inputs.name || inputs.fullName || '').trim().toLowerCase();
    const inputEmail = (inputs.email || '').trim().toLowerCase();
    const inputPhone = (inputs.phone || inputs.phoneNumber || '').trim();
    const inputUsername = (inputs.username || '').trim().toLowerCase();
    const inputBookingRef = (inputs.bookingRef || inputs.bookingReference || '').trim();
    const inputTicketRef = (inputs.ticketRef || inputs.ticketReference || '').trim();
    const inputLeadRef = (inputs.leadRef || inputs.leadReference || '').trim();
    const inputSupportPin = (inputs.supportPin || inputs.supportPinCode || '').trim();

    // 1. Verify Name & Email combination against Booking, Contacts, or Leads
    if (requiredFields.includes('name') && inputName) {
      // Find matches
      const bookingMatch = await Booking.findOne({ clientId, fullName: new RegExp(`^${inputName}$`, 'i') });
      const contactMatch = await Contact.findOne({ clientId, name: new RegExp(`^${inputName}$`, 'i') });
      const leadMatch = await Lead.findOne({
        clientId,
        $or: [
          { contactFirst: new RegExp(`^${inputName}$`, 'i') },
          { contactLast: new RegExp(`^${inputName}$`, 'i') }
        ]
      });
      if (bookingMatch || contactMatch || leadMatch) {
         nameMatched = true;
      }
    }

    if (requiredFields.includes('email') && inputEmail) {
      const bookingMatch = await Booking.findOne({ clientId, email: inputEmail });
      const contactMatch = await Contact.findOne({ clientId, email: inputEmail });
      const leadMatch = await Lead.findOne({ clientId, contactEmail: inputEmail });
      if (bookingMatch || contactMatch || leadMatch) {
        emailMatched = true;
      }
    }

    if (requiredFields.includes('phone') && inputPhone) {
      const formattedPhone = inputPhone.replace(/\D/g, '');
      // Create flexible regex to match last digits or exact
      const phoneRegex = new RegExp(`${inputPhone}$`);
      const bookingMatch = await Booking.findOne({ clientId, phoneNumber: phoneRegex });
      const contactMatch = await Contact.findOne({ clientId, phone: phoneRegex });
      const leadMatch = await Lead.findOne({ clientId, contactPhone: phoneRegex });
      if (bookingMatch || contactMatch || leadMatch) {
         phoneMatched = true;
      }
    }

    if (requiredFields.includes('booking_ref') && inputBookingRef) {
      if (mongoose.Types.ObjectId.isValid(inputBookingRef)) {
        const bookingMatch = await Booking.findOne({ clientId, _id: inputBookingRef });
        if (bookingMatch) refMatched = true;
      }
    }

    if (requiredFields.includes('ticket_ref') && inputTicketRef) {
      if (mongoose.Types.ObjectId.isValid(inputTicketRef)) {
        const ticketMatch = await Ticket.findOne({ clientId, _id: inputTicketRef });
        if (ticketMatch) refMatched = true;
      }
    }

    if (requiredFields.includes('lead_ref') && inputLeadRef) {
      if (mongoose.Types.ObjectId.isValid(inputLeadRef)) {
        const leadMatch = await Lead.findOne({ clientId, _id: inputLeadRef });
        if (leadMatch) refMatched = true;
      }
    }

    if (requiredFields.includes('username') && inputUsername) {
      const contactMatch = await Contact.findOne({ clientId, telegramUsername: new RegExp(`^${inputUsername}$`, 'i') });
      if (contactMatch) matchedCount++;
    }

    if (requiredFields.includes('support_pin') && inputSupportPin) {
      if (policy.supportPin && policy.supportPin === inputSupportPin) {
        supportPinMatched = true;
      }
    }

    // Evaluate verification success completely
    // Level checking
    let validated = true;
    for (const field of requiredFields) {
      if (field === 'name' && !nameMatched) validated = false;
      if (field === 'email' && !emailMatched) validated = false;
      if (field === 'phone' && !phoneMatched) validated = false;
      if (field === 'booking_ref' && !refMatched) validated = false;
      if (field === 'ticket_ref' && !refMatched) validated = false;
      if (field === 'lead_ref' && !refMatched) validated = false;
      if (field === 'support_pin' && !supportPinMatched) validated = false;
    }

    if (validated) {
      // Expiration setting
      const expMinutes = policy.expirationMinutes || 15;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expMinutes);

      session.isVerified = true;
      session.verificationLevel = policy.verificationLevel;
      session.expiresAt = expiresAt;
      session.lastVerifiedAt = new Date();
      session.attempts = 0; // reset attempts

      // Copy input values safely to session.verifiedFields
      const fieldMap = new Map();
      Object.keys(inputs).forEach(key => {
        fieldMap.set(key, '[EXISTS]'); // Mask sensitive values
      });
      session.verifiedFields = fieldMap;
      await session.save();

      await VerificationAuditLog.create({
        clientId,
        sessionId,
        platform,
        action: 'VERIFY_SUCCESS',
        level: policy.verificationLevel,
        details: `Successfully verified fields: ${requiredFields.join(', ')}`
      });

      return { success: true, session };
    } else {
      await VerificationAuditLog.create({
        clientId,
        sessionId,
        platform,
        action: 'VERIFY_FAILURE',
        level: policy.verificationLevel,
        details: `Failed verification submission`
      });

      // Secure rule: Never disclose which specific field failed
      return {
        success: false,
        error: 'Verification checks failed. Please confirm your details are correct.',
        session
      };
    }
  }
};
