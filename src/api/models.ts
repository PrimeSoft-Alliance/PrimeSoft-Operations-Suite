import mongoose from 'mongoose';
import crypto from 'crypto';

const bookingSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }, // Unified Link
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', index: true }, // Legacy/Alias Unified Link
  assignedAgent: { type: String },
  fullName: { type: String, required: true },
  phoneNumber: { type: String },
  email: { type: String, required: true }, // customer_email
  providerEmail: { type: String },
  serviceSelection: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  preferredStartTime: { type: String, required: true },
  preferredEndTime: { type: String },
  duration: { type: Number, default: 60 },
  timezone: { type: String, default: 'UTC' },
  title: { type: String },
  description: { type: String },
  meetingLocation: { type: String }, // address or zoom link
  calendarInviteId: { type: String },
  reminderRules: [{ type: String }], // e.g. "24h", "1h"
  notes: { type: String },
  imageNotes: { type: String },
  status: { type: String, enum: ['pending', 'awaiting', 'confirmed', 'rejected', 'rescheduled', 'completed', 'fulfilled', 'cancelled', 'canceled'], default: 'awaiting' },
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  },
  tracking_id: { type: String, unique: true, sparse: true },
  meetingLink: { type: String },
  icsPath: { type: String }
}, { timestamps: true });

export const Booking = mongoose.models.Booking || mongoose.model<any>('Booking', bookingSchema);

const contactSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  subject: { type: String },
  message: { type: String },
  preferredContactMethod: { type: String, enum: ['email', 'phone'], default: 'email' },
  status: { type: String, enum: ['unread', 'resolved'], default: 'unread' },
  source: { type: String, default: 'web_form' },
  telegramUsername: String,
  telegramChatId: String,
  whatsappJid: String,
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  },
  numbers: [{
    name: String,
    phoneNumber: String,
    addedAt: { type: Date, default: Date.now }
  }],
  aiEnabled: { type: Boolean, default: true },
  active_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
}, { timestamps: true });

export const Contact = mongoose.models.Contact || mongoose.model<any>('Contact', contactSchema);

const aiLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system', 'model', 'vision'], required: true },
  content: { type: String, required: true, default: '...' },
  imageUrl: { type: String }
}, { timestamps: true });

export const AILog = mongoose.models.AILog || mongoose.model<any>('AILog', aiLogSchema);

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number },
  durationMinutes: { type: Number, required: true }
});

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
});

const knowledgeArticleSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

export const KnowledgeArticle = mongoose.models.KnowledgeArticle || mongoose.model<any>('KnowledgeArticle', knowledgeArticleSchema);

const workingHourSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 0 = Sunday, 1 = Monday, etc.
  isOpen: { type: Boolean, required: true, default: true },
  openTime: { type: String, default: '08:00' },
  closeTime: { type: String, default: '17:00' }
});


const settingsSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  businessName: { type: String, default: 'My Business' },
  businessType: { type: String, default: '' },
  
  // Admin & Setup
  setupCompleted: { type: Boolean, default: false },
  adminEmail: { type: String },
  adminPassword: { type: String },

  // SMTP Configuration
  smtpHost: { type: String },
  smtpPort: { type: Number },
  smtpUser: { type: String },
  smtpPass: { type: String },
  smtpFromEmail: { type: String },
  smtpFromName: { type: String },
  smtpReplyToEmail: { type: String },
  smtpUseTls: { type: Boolean, default: false },
  emailIntegrationProvider: { type: String, default: 'smtp' },

  // Inbound Email Sync (IMAP)
  inboundEmailUser: { type: String },
  inboundEmailPass: { type: String },
  inboundEmailHost: { type: String },
  inboundEmailPort: { type: Number },
  inboundEmailSsl: { type: Boolean, default: true },
  inboundSyncStatus: { type: String, default: 'not_configured' },

  // Calendar & Reminders Integration
  calendarEnabled: { type: Boolean, default: true },
  reminderTimingMinutes: { type: Number, default: 60 },
  bookingRemindersEnabled: { type: Boolean, default: true },
  emailRemindersEnabled: { type: Boolean, default: true },
  iCalRemindersEnabled: { type: Boolean, default: true },
  serviceRemindersEnabled: { type: Boolean, default: true },
  availabilityRemindersEnabled: { type: Boolean, default: true },
  followUpRemindersEnabled: { type: Boolean, default: true },

    // AI Generated Branding
    branding: {
        primaryColor: { type: String },
        secondaryColor: { type: String },
        fontFamily: { type: String },
        heroTitle: { type: String },
        heroSubtitle: { type: String },
        aboutText: { type: String },
        layoutStyle: { type: String, enum: ['modern', 'classic', 'minimal', 'bold'], default: 'modern' }
    },
  
  services: [serviceSchema],
  workingHours: [workingHourSchema],
  closedDates: [{ type: String }], // YYYY-MM-DD
  bufferTimeMinutes: { type: Number, default: 30 },
  slotDurationMinutes: { type: Number, default: 60 },
  contactEmail: { type: String },
  contactPhone: { type: String },
  whatsappNumber: { type: String },
  timezone: { type: String, default: 'America/New_York' },
  language: { type: String, default: 'en' },
  currency: { type: String, default: 'USD' },
  chatbotTitle: { type: String, default: 'CSR Representative' },
  chatbotName: { type: String, default: 'Mark' },
  chatbotGender: { type: String, default: 'Male' },
  chatbotPersonality: { type: String, default: 'Highly empathetic, professional, and helpful Human Customer Service Representative.' },
  chatbotSubtitle: { type: String, default: 'Customer Representative' },
  chatbotPrimaryColor: { type: String, default: '#6366f1' },
  chatbotAvatar: { type: String, default: '' },
  chatbotIcon: { type: String, default: 'User' },
  chatbotGreeting: { type: String, default: "Hello! I'm here to help you with any questions. How can I assist you today?" },
  faqs: [faqSchema],
  aiBehaviorInstructions: { type: String, default: 'You are a professional human Customer Service Representative. Never mention you are an AI or a bot. Be empathetic, clear, and helpful.' },
  externalDatabases: [{
    enabled: { type: Boolean, default: false },
    name: { type: String },
    description: { type: String },
    type: { type: String, enum: ['postgres', 'mysql', 'sqlserver', 'mongodb'], default: 'postgres' },
    connectionString: { type: String },
    host: { type: String },
    port: { type: Number },
    database: { type: String },
    user: { type: String },
    password: { type: String },
    ssl: { type: Boolean, default: true },
    verificationEnabled: { type: Boolean, default: false },
    verificationLevel: { type: Number, default: 1 },
    requiredFields: [{ type: String }],
    tableConfigs: { type: Object, default: {} }
  }],
  externalDbConfig: {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ['postgres', 'mysql', 'sqlserver', 'mongodb'], default: 'postgres' },
    connectionString: { type: String },
    host: { type: String },
    port: { type: Number },
    database: { type: String },
    user: { type: String },
    password: { type: String },
    ssl: { type: Boolean, default: true },
    verificationEnabled: { type: Boolean, default: false },
    verificationLevel: { type: Number, default: 1 },
    requiredFields: [{ type: String }],
    tableConfigs: { type: Object, default: {} }
  },
  headlessConfig: {
    enabled: { type: Boolean, default: false },
    features: {
      chat: { type: Boolean, default: true },
      booking: { type: Boolean, default: true },
      contact: { type: Boolean, default: true },
      content: { type: Boolean, default: false }
    },
    allowedDomains: [{ type: String }]
  },
  notificationSettings: {
    booking: { type: Boolean, default: true },
    ticket: { type: Boolean, default: true },
    inquiries: { type: Boolean, default: true },
    missedCalls: { type: Boolean, default: true },
    newLeads: { type: Boolean, default: false },
    contact: { type: Boolean, default: false },
    messages: { type: Boolean, default: false },
    others: { type: Boolean, default: false }
  }
}, { timestamps: true, strict: false });

export const Settings = mongoose.models.Settings || mongoose.model<any>('Settings', settingsSchema);

const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  businessType: { type: String },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client'], default: 'client' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  plan: { type: String, default: 'starter' },
  tier: { type: String, enum: ['starter', 'professional', 'enterprise'], default: 'starter' },
  telegramBotToken: { type: String },
  telegramChatIds: [{ type: String }],
  whatsappPhoneNumber: { type: String },
  whatsappPhoneNumberId: { type: String },
  whatsappBusinessAccountId: { type: String },
  whatsappAccessToken: { type: String },
  whatsappNumber: { type: String },
  apiKey: { type: String, default: () => 'api_' + crypto.randomUUID() },
  activationToken: { type: String },
  isActivated: { type: Boolean, default: false },
  subdomain: { type: String, unique: true, sparse: true },
  customDomain: { type: String, unique: true, sparse: true },
  aiMessageLimit: { type: Number, default: 1000 },
  storageLimitBytes: { type: Number, default: 52428800 },
  customFields: { type: Map, of: String },
  phone: { type: String },
  secretQuestion: { type: String },
  secretAnswer: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorAdminEmail: { type: String },
  twoFactorSecretCode: { type: String },
  twoFactorSecretCodeExpiresAt: { type: Date }
}, { timestamps: true });

export const Client = mongoose.models.Client || mongoose.model<any>('Client', clientSchema);

const usageStatsSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  month: { type: String, required: true }, // YYYY-MM
  aiMessagesUsed: { type: Number, default: 0 },
  storageBytesUsed: { type: Number, default: 0 },
}, { timestamps: true });

export const UsageStats = mongoose.models.UsageStats || mongoose.model<any>('UsageStats', usageStatsSchema);

const auditLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  actor: { type: String, required: true }, // admin email or ID
  action: { type: String, required: true },
  target: { type: String }, // clientId or requestId
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  ip: { type: String }
}, { timestamps: true });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<any>('AuditLog', auditLogSchema);

// Additional Entities for Unified Architecture

const leadSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', sparse: true }, // Unified Link
  formId: { type: String },
  formName: { type: String },
  source: { type: String, default: 'form' },
  contactFirst: { type: String },
  contactLast: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  company: { type: String },
  jobTitle: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  tags: [{ type: String }],
  stage: { type: String, enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'], default: 'New' },
  leadRating: { type: String, enum: ['none', 'buying', 'paying', 'prospect', 'dead'], default: 'none' },
  score: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
  // AI Scores
  engagementScore: { type: Number, default: 0 },
  intentScore: { type: Number, default: 0 },
  conversionScore: { type: Number, default: 0 },
  sentimentValue: { type: String },
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  },
  activities: [{
     type: { type: String, enum: ['note', 'email', 'whatsapp', 'call', 'meeting', 'system', 'status_change', 'ticket', 'inquiry'] },
     description: { type: String },
     date: { type: Date, default: Date.now },
     metadata: { type: mongoose.Schema.Types.Mixed }
  }],
  lastActivity: { type: Date, default: Date.now },
  assignedTo: { type: String }
}, { timestamps: true });

export const Lead = mongoose.models.Lead || mongoose.model<any>('Lead', leadSchema);

const ticketSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }, // Unified Link
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', index: true }, // Legacy/Alias Unified Link
  threadId: { type: String },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['open', 'pending', 'resolved', 'closed', 'escalated'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'low' },
  hasUnreadMessages: { type: Boolean, default: false },
  assignedTo: { type: String }, // support agent email or ID
  source: { type: String, default: 'chat' }, // chat, email, web, whatsapp, telegram
  aiSummary: { type: String },
  aiEnabled: { type: Boolean, default: true },
  imageUrl: { type: String }
}, { timestamps: true });

export const Ticket = mongoose.models.Ticket || mongoose.model<any>('Ticket', ticketSchema);

const inquirySchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  threadId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }, // Unified Link
  senderEmail: { type: String, required: true },
  recipients: [{ type: String }],
  cc: [{ type: String }],
  bcc: [{ type: String }],
  subject: { type: String },
  body: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['inbox', 'unread', 'starred', 'assigned', 'archived', 'closed'], default: 'unread' },
  assignedTo: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

export const Inquiry = mongoose.models.Inquiry || mongoose.model<any>('Inquiry', inquirySchema);

const ticketMessageSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  senderRole: { type: String, enum: ['customer', 'agent', 'system', 'ai'], required: true },
  senderName: { type: String },
  content: { type: String, required: true },
  imageUrl: { type: String },
  isInternal: { type: Boolean, default: false }
}, { timestamps: true });

export const TicketMessage = mongoose.models.TicketMessage || mongoose.model<any>('TicketMessage', ticketMessageSchema);

const quotaSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  tier: { type: String, default: 'starter' },
  aiTokensLimit: { type: Number, default: 0 },
  aiTokensUsed: { type: Number, default: 0 },
  chatMessagesLimit: { type: Number, default: 0 },
  chatMessagesUsed: { type: Number, default: 0 },
  storageLimit: { type: Number, default: 0 },
  storageUsed: { type: Number, default: 0 },
  enabledFeatures: {
    webChat: { type: Boolean, default: false },
    telegram: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    aiAssistant: { type: Boolean, default: false }
  },
  quotaResetDate: { type: Date },
  status: { type: String, enum: ['active', 'paused', 'exceeded'], default: 'active' }
}, { timestamps: true });

export const Quota = mongoose.models.Quota || mongoose.model<any>('Quota', quotaSchema);

const aiUsageLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  feature: { type: String }, // 'chat' | 'branding' | 'form'
  source: { type: String }, // 'api' | 'telegram' | 'whatsapp' | 'embed'
  platform: { type: String },
  tokensUsed: { type: Number, default: 0 },
  status: { type: String },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export const AIUsageLog = mongoose.models.AIUsageLog || mongoose.model<any>('AIUsageLog', aiUsageLogSchema);

const tierDefinitionSchema = new mongoose.Schema({
  clientId: { type: String, default: 'system', index: true },
  name: { type: String, required: true, unique: true },
  displayName: { type: String },
  monthlyPrice: { type: Number, default: 0 },
  features: { type: Map, of: Boolean },
  limits: {
    aiTokensPerMonth: { type: Number, default: 0 },
    chatMessagesPerMonth: { type: Number, default: 0 },
    storageGB: { type: Number, default: 0 }
  }
}, { timestamps: true });

export const TierDefinition = mongoose.models.TierDefinition || mongoose.model<any>('TierDefinition', tierDefinitionSchema);

const visitSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  page: { type: String, default: 'Home' },
  route: { type: String, default: '/' },
  referrer: { type: String },
  userAgent: { type: String },
  interactedWithRep: { type: Boolean, default: false },
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  }
}, { timestamps: true });

export const Visit = mongoose.models.Visit || mongoose.model<any>('Visit', visitSchema);
 
const productSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true }, // businessId
  title: { type: String, required: true }, // name
  price: { type: Number },
  sku: { type: String },
  description: { type: String },
  instructions: { type: String },
  aiInstructions: { type: String },
  category: { type: String },
  stock: { type: Number, default: 0 },
  availability: { type: String, enum: ['in_stock', 'out_of_stock', 'preorder'], default: 'in_stock' },
  tags: [{ type: String }],
  type: { type: String, enum: ['product', 'service'], default: 'product' },
  deliveryFormat: { type: String, enum: ['physical', 'digital', 'service'] },
  businessType: { type: String, enum: ['ecommerce', 'service', 'hybrid'] },
  externalReferenceId: { type: String },
  link: { type: String }
}, { timestamps: true, strict: false });

export const Product = mongoose.models.Product || mongoose.model<any>('Product', productSchema);

const notificationSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['system', 'lead', 'booking', 'alert'], default: 'system' },
  isRead: { type: Boolean, default: false },
  link: { type: String },
  relatedId: { type: String }
}, { timestamps: true });

export const Notification = mongoose.models.Notification || mongoose.model<any>('Notification', notificationSchema);


// --- TELEGRAM SUPPORT SYSTEM ---

const telegramSessionSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, unique: true },
  botToken: { type: String, required: true },
  botUsername: { type: String },
  botId: { type: String },
  displayName: { type: String },
  status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
  lastConnectedAt: { type: Date },
  paused: { type: Boolean, default: false }
}, { timestamps: true });

export const TelegramSession = mongoose.models.TelegramSession || mongoose.model<any>('TelegramSession', telegramSessionSchema);

const conversationSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  customerJid: { type: String, required: true },
  platform: { type: String, enum: ['whatsapp', 'telegram', 'widget'], default: 'whatsapp' },
  customerName: { type: String },
  status: { type: String, enum: ['active', 'concluded'], default: 'active' },
  messages: [{
    sender: { type: String, enum: ['customer', 'assistant', 'human_override'], required: true },
    text: { type: String, required: true },
    imageUrl: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  aiEnabled: { type: Boolean, default: true },
  followUpSent: { type: Boolean, default: false }
}, { timestamps: true });

// Compound index on clientId and customerJid
conversationSchema.index({ clientId: 1, customerJid: 1 });

export const Conversation = mongoose.models.Conversation || mongoose.model<any>('Conversation', conversationSchema);

// --- OMNIREP SECURE VERIFICATION SYSTEMS ---
const verificationSessionSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  platform: { type: String, default: 'widget' },
  verificationLevel: { type: Number, default: 0 }, // 0, 1, 2, 3
  isVerified: { type: Boolean, default: false },
  verifiedFields: { type: Map, of: String },
  expiresAt: { type: Date },
  lastVerifiedAt: { type: Date },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

export const VerificationSession = mongoose.models.VerificationSession || mongoose.model<any>('VerificationSession', verificationSessionSchema);

const verificationAuditLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true },
  platform: { type: String, default: 'widget' },
  action: { type: String, required: true }, // 'VERIFY_REQUEST', 'VERIFY_SUCCESS', 'VERIFY_FAILURE', 'STATE_EXPIRY'
  level: { type: Number, default: 0 },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const VerificationAuditLog = mongoose.models.VerificationAuditLog || mongoose.model<any>('VerificationAuditLog', verificationAuditLogSchema);

const onboardingSessionSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  sessionId: { type: String, required: true },
  platform: { type: String, enum: ['telegram', 'whatsapp', 'widget'], default: 'widget' },
  fullName: { type: String },
  email: { type: String },
  conversationState: { type: String, enum: ['awaiting_name', 'awaiting_email', 'completed'], default: 'awaiting_name' }
}, { timestamps: true });

onboardingSessionSchema.index({ clientId: 1, sessionId: 1, platform: 1 }, { unique: true });

export const OnboardingSession = mongoose.models.OnboardingSession || mongoose.model<any>('OnboardingSession', onboardingSessionSchema);


// --- TELEPHONY & MESSAGING (OMNIREP) ---

const telnyxNumberSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  externalProviderId: { type: String }, // telnyx id
  phoneNumber: { type: String, required: true },
  capabilities: [{ type: String }], // 'voice', 'sms', 'mms', etc.
  monthlyRentalCost: { type: Number },
  status: { type: String, enum: ['active', 'suspended', 'released', 'pending'], default: 'pending' },
  capabilitiesConfigured: { type: Map, of: Boolean }
}, { timestamps: true });
telnyxNumberSchema.index({ clientId: 1, phoneNumber: 1 });
export const TelnyxNumber = mongoose.models.TelnyxNumber || mongoose.model<any>('TelnyxNumber', telnyxNumberSchema);

const unifiedMessageSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  messageId: { type: String, required: true },
  conversationId: { type: String }, 
  type: { type: String, enum: ['sms', 'whatsapp', 'email', 'chat', 'telegram'], required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  status: { type: String, enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'received'], required: true },
  from: { type: String },
  to: { type: String },
  content: { type: String },
  readReceipt: { type: Boolean, default: false },
  cost: { type: Number, default: 0 },
  transportSource: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });
unifiedMessageSchema.index({ clientId: 1, messageId: 1 });
unifiedMessageSchema.index({ clientId: 1, conversationId: 1 });

unifiedMessageSchema.post('save', async function(doc: any) {
  if (doc.direction === 'inbound') {
    try {
      const { notificationService } = await import('./services/notificationService.js');
      notificationService.sendNewMessage(doc.clientId, doc).catch((err: any) => {
        console.error('Error in UnifiedMessage post-save notification trigger:', err);
      });
    } catch (err) {
      console.error('Failed to import notificationService in UnifiedMessage post-save:', err);
    }
  }
});

export const UnifiedMessage = mongoose.models.UnifiedMessage || mongoose.model<any>('UnifiedMessage', unifiedMessageSchema);

const callSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  callId: { type: String, required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  status: { type: String, enum: ['initiated', 'ringing', 'answered', 'completed', 'missed', 'failed', 'busy'], default: 'initiated' },
  from: { type: String },
  to: { type: String },
  duration: { type: Number, default: 0 },
  transcript: { type: String },
  summary: { type: String },
  outcome: { type: String },
  recordingUrl: { type: String },
  transferTarget: { type: String },
  cost: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });
callSchema.index({ clientId: 1, callId: 1 });
export const Call = mongoose.models.Call || mongoose.model<any>('Call', callSchema);

// Notifications & Billing
const usageEventSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  eventType: { type: String, required: true }, // 'voice_minute', 'sms_outbound', 'wa_template', 'stt_char', 'tts_char', 'number_rental'
  units: { type: Number, default: 1 },
  unitCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  referenceId: { type: String }, // message_id or call_id
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
export const UsageEvent = mongoose.models.UsageEvent || mongoose.model<any>('UsageEvent', usageEventSchema);

const billingLedgerSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['charge', 'credit', 'payment', 'debit', 'deposit'], required: true },
  description: { type: String },
  referenceId: { type: String },
  balanceAfter: { type: Number }
}, { timestamps: true });
export const BillingLedger = mongoose.models.BillingLedger || mongoose.model<any>('BillingLedger', billingLedgerSchema);

// Marketing Engine
const campaignSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  campaignId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['email', 'sms', 'whatsapp', 'telegram'], required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'running', 'completed', 'paused', 'failed'], default: 'draft' },
  segmentId: { type: String },
  templateId: { type: String },
  scheduleTime: { type: Date },
  metrics: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  }
}, { timestamps: true });
campaignSchema.index({ clientId: 1, campaignId: 1 });
export const Campaign = mongoose.models.Campaign || mongoose.model<any>('Campaign', campaignSchema);

// EmailTemplate Schema
const emailTemplateSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  tags: [{ type: String }],
  type: { type: String, enum: ['html', 'mjml', 'ai_generated', 'marketplace', 'user', 'system'], default: 'user' },
  subject: { type: String, default: '' },
  projectData: { type: mongoose.Schema.Types.Mixed }, // GrapesJS project data JSON
  htmlSource: { type: String, default: '' },
  mjmlSource: { type: String, default: '' },
  variables: [{ type: String }],
  isMarketplace: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  createdBy: { type: String },
  updatedBy: { type: String },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' }
}, { timestamps: true });

emailTemplateSchema.index({ clientId: 1 });
export const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model<any>('EmailTemplate', emailTemplateSchema);


// ==========================================
// CORE IDENTITY RESOLUTION MODELS
// ==========================================

const identityGraphSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  
  // Confirmed Keys for merging
  email: { type: String, lowercase: true, trim: true, index: true },
  phoneNumber: { type: String, index: true }, // E.164 format
  whatsappIdentity: { type: String, index: true }, // client_id + jid
  telegramId: { type: String, index: true }, // client_id + user_id
  telegramUsername: { type: String, index: true },
  widgetSessionId: { type: String, index: true },
  
  // Metadata
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  confidence: { type: Number, default: 1.0 },
  sourceChannel: { type: String }, // 'telegram', 'whatsapp', 'widget', 'telnyx_voice', 'telnyx_sms'
}, { timestamps: true });

export const IdentityGraph = mongoose.models.IdentityGraph || mongoose.model('IdentityGraph', identityGraphSchema);

const telegramIdentitySchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  telegramUserId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  
  chatId: { type: String },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  languageCode: { type: String },
  sharedPhoneNumber: { type: String }, // Collected via contact share only
  profilePhotoUrl: { type: String },
  
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

telegramIdentitySchema.index({ clientId: 1, telegramUserId: 1 }, { unique: true });
export const TelegramIdentity = mongoose.models.TelegramIdentity || mongoose.model('TelegramIdentity', telegramIdentitySchema);

const whatsappIdentitySchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  whatsappId: { type: String, required: true, index: true }, // JID
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  
  displayName: { type: String },
  verifiedPhoneNumber: { type: String },
  transportSource: { type: String, enum: ['telnyx_whatsapp', 'whatsmeow_self_hosted'] },
  
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

whatsappIdentitySchema.index({ clientId: 1, whatsappId: 1 }, { unique: true });
export const WhatsAppIdentity = mongoose.models.WhatsAppIdentity || mongoose.model('WhatsAppIdentity', whatsappIdentitySchema);

const widgetSessionSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  
  sourceUrl: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const WidgetSession = mongoose.models.WidgetSession || mongoose.model('WidgetSession', widgetSessionSchema);

const missedCallSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  callerNumber: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  sourceChannel: { type: String, default: 'telnyx' },
  status: { type: String, enum: ['new', 'reached_out', 'converted', 'ignored', 'archived'], default: 'new' },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  outreachNotes: { type: String },
  outreachOutcome: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export const MissedCall = mongoose.models.MissedCall || mongoose.model('MissedCall', missedCallSchema);

const knowledgeChunkSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sourceType: { type: String, enum: ['document', 'manual'], default: 'manual' },
  content: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  vector: [{ type: Number }],
  externalId: { type: String }, // Document ID from source
}, { timestamps: true });

knowledgeChunkSchema.index({ clientId: 1, externalId: 1 }, { unique: true });

export const KnowledgeChunk = mongoose.models.KnowledgeChunk || mongoose.model<any>('KnowledgeChunk', knowledgeChunkSchema);




