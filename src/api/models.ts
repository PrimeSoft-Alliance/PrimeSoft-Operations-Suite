import mongoose from 'mongoose';
import crypto from 'crypto';

const bookingSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  serviceSelection: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  preferredStartTime: { type: String, required: true },
  preferredEndTime: { type: String, required: true },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  }
}, { timestamps: true });

export const Booking = mongoose.models.Booking || mongoose.model<any>('Booking', bookingSchema);

const contactSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  subject: { type: String },
  message: { type: String, required: true },
  preferredContactMethod: { type: String, enum: ['email', 'phone'], default: 'email' },
  status: { type: String, enum: ['unread', 'resolved'], default: 'unread' },
  source: { type: String, default: 'web_form' },
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  }
}, { timestamps: true });

export const Contact = mongoose.models.Contact || mongoose.model<any>('Contact', contactSchema);

const aiLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  sessionId: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true }
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

const workingHourSchema = new mongoose.Schema({
  day: { type: Number, required: true }, // 0 = Sunday, 1 = Monday, etc.
  isOpen: { type: Boolean, required: true, default: true },
  openTime: { type: String, default: '08:00' },
  closeTime: { type: String, default: '17:00' }
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  tech: { type: String },
  link: { type: String }
});

const statSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true }
});

const settingsSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  businessName: { type: String, default: 'My Business' },
  // CMS Fields
  heroBadge: { type: String, default: 'Engineering Excellence' },
  heroTitle: { type: String, default: 'Architecting the Future of Enterprise Software' },
  heroSubtitle: { type: String, default: 'We build high-performance software for visionary companies.' },
  heroImage: { type: String },
  
  servicesBadge: { type: String, default: 'OUR SOLUTIONS' },
  servicesTitle: { type: String, default: 'Software & IT Services' },
  servicesSubtitle: { type: String, default: 'End-to-end digital services tailored for your growth and transformation.' },

  trustTitle: { type: String, default: 'Built on Trust' },
  trustDescription: { type: String, default: 'We deliver software that powers mission-critical operations worldwide.' },
  trustImage: { type: String },
  trustCardTitle: { type: String, default: 'Secure & Robust' },
  trustCardSubtitle: { type: String, default: 'Enterprise-grade security' },
  trustPoints: [{ type: String, default: ['Modern tech stack selection', 'Agile development methodology', 'Post-deployment support & maintenance', 'Enterprise-ready scalability'] }],

  testimonialsTitle: { type: String, default: 'Client Success' },
  testimonials: [{
    text: String,
    name: String,
    role: String,
    initials: String
  }],

  portfolioBadge: { type: String, default: 'Portfolio' },
  portfolioTitle: { type: String, default: 'Recent Projects' },

  ctaTitle: { type: String, default: 'Ready to Scale?' },
  ctaSubtitle: { type: String, default: 'Our architects are ready to build your next generation platform.' },
  ctaPrimaryBtn: { type: String, default: 'Start Project' },
  ctaSecondaryBtn: { type: String, default: 'Contact Sales' },

  aboutBadge: { type: String, default: 'Our Story' },
  aboutHeroTitle: { type: String, default: 'Building the' },
  aboutHeroHighlight: { type: String, default: 'Digital Future' },
  aboutHeroSubtitle: { type: String, default: 'Discover how we help companies navigate the complexities of modern software.' },
  aboutSectionTitle: { type: String, default: 'Our Philosophy' },
  aboutSectionHighlight: { type: String, default: 'Commitment' },
  aboutTags: [{ type: String }],
  aboutFeatures: [{
    icon: String,
    title: String,
    desc: String,
    color: String,
    bg: String
  }],
  aboutStats: [{
    label: String,
    value: String
  }],

  contactTitle: { type: String, default: 'Let\'s Build' },
  contactHighlight: { type: String, default: 'Together' },
  contactSubtitle: { type: String, default: 'Ready to deploy something extraordinary? Our technical team is standing by to roadmap your transformation.' },
  regionalFocus: { type: String, default: 'Active in 12 Zones' },

  footerDescription: { type: String, default: 'Empowering the next generation of digital transformation through precision engineering and visionary software solutions.' },
  footerContactTitle: { type: String, default: 'Contact Us' },

  email: { type: String, default: 'admin@example.com' },
  phone: { type: String, default: '+1 (555) 000-0000' },
  address: { type: String, default: 'Global HQ' },

  aboutText: { type: String, default: 'We are experienced professionals dedicated to quality.' },
  aboutImage: { type: String },
  footerText: { type: String, default: '© 2024 All rights reserved.' },
  primaryColor: { type: String, default: '#2563eb' },
  secondaryColor: { type: String, default: '#f8fafc' },
  fontFamily: { type: String, default: 'Inter' },
  customCss: { type: String },
  hasCustomTheme: { type: Boolean, default: false },
  themeEntryPoint: { type: String, default: 'index.html' },
  
  // SMTP Configuration
  smtpHost: { type: String },
  smtpPort: { type: Number },
  smtpUser: { type: String },
  smtpPass: { type: String },
  smtpFromEmail: { type: String },
  smtpFromName: { type: String },

    // AI Generated Branding
    branding: {
        primaryColor: { type: String },
        secondaryColor: { type: String },
        fontFamily: { type: String },
        heroTitle: { type: String },
        heroSubtitle: { type: String },
        heroImage: { type: String }, // New field for external image sync
        aboutText: { type: String },
        layoutStyle: { type: String, enum: ['modern', 'classic', 'minimal', 'bold'], default: 'modern' }
    },
  
  services: [serviceSchema],
  portfolioProjects: [projectSchema],
  clientStats: [statSchema],
  workingHours: [workingHourSchema],
  closedDates: [{ type: String }], // YYYY-MM-DD
  bufferTimeMinutes: { type: Number, default: 30 },
  slotDurationMinutes: { type: Number, default: 60 },
  contactEmail: { type: String },
  contactPhone: { type: String },
  whatsappNumber: { type: String },
  timezone: { type: String, default: 'America/New_York' },
  favicon: { type: String },
  chatbotIcon: { type: String, default: 'Cpu' },
  chatbotTitle: { type: String, default: 'Assistant' },
  chatbotAvatar: { type: String },
  chatbotPrimaryColor: { type: String, default: '#6366f1' },
  chatbotGreeting: { type: String, default: "Hello! I'm here to help you with any questions about our services or booking. How can I assist you today?" },
  faqs: [faqSchema],
  aiBehaviorInstructions: { type: String, default: 'You are a helpful receptionist. Never guess services, prices or availability. Encourage booking.' },
  externalDbConfig: {
    enabled: { type: Boolean, default: false },
    mode: { type: String, enum: ['read-only', 'read-write', 'disabled'], default: 'read-only' },
    dbType: { type: String },
    host: { type: String },
    port: { type: Number },
    database: { type: String },
    username: { type: String },
    password: { type: String }, 
    exposedTables: [{ type: String }],
    permissions: {
      canRead: { type: Boolean, default: true },
      canCreate: { type: Boolean, default: false },
      canUpdate: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      approvalRequired: { type: Boolean, default: true }
    }
  },
  emailTemplates: {
    bookingConfirmation: { type: String, default: 'Hello {{customerName}}, your booking for {{service}} on {{date}} at {{time}} is confirmed.' },
    bookingNotification: { type: String, default: 'New booking from {{customerName}} for {{service}} on {{date}} at {{time}}.' },
    bookingReschedule: { type: String, default: 'Hello {{customerName}}, your booking has been rescheduled to {{date}} at {{time}}.' },
    contactAck: { type: String, default: 'Hello {{customerName}}, we have received your message and will reply soon.' },
    contactNotification: { type: String, default: 'New message from {{customerName}}: {{message}}' }
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
  }
}, { timestamps: true, strict: false });

export const Settings = mongoose.models.Settings || mongoose.model<any>('Settings', settingsSchema);

const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  businessType: { type: String },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'superadmin'], default: 'client' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  plan: { type: String, default: 'starter' },
  tier: { type: String, enum: ['starter', 'professional', 'enterprise'], default: 'starter' },
  apiKey: { type: String, default: () => 'api_' + crypto.randomUUID() },
  activationToken: { type: String },
  isActivated: { type: Boolean, default: false },
  subdomain: { type: String, unique: true, sparse: true },
  customDomain: { type: String, unique: true, sparse: true },
  aiMessageLimit: { type: Number, default: 1000 },
  storageLimitBytes: { type: Number, default: 52428800 },
  customFields: { type: Map, of: String },
  // Telegram and WhatsApp integration details
  telegramBotToken: { type: String },
  telegramChatIds: [{ type: String }], // Linked chat IDs
  whatsappPhoneNumber: { type: String },
  whatsappBusinessAccountId: { type: String },
  whatsappAccessToken: { type: String }
}, { timestamps: true });

export const Client = mongoose.models.Client || mongoose.model<any>('Client', clientSchema);

const domainSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  host: { type: String, required: true, unique: true },
  type: { type: String, enum: ['subdomain', 'custom-domain'], required: true },
  status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'active' },
  verified: { type: Boolean, default: true }
}, { timestamps: true });

export const Domain = mongoose.models.Domain || mongoose.model<any>('Domain', domainSchema);

const usageStatsSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  aiMessagesUsed: { type: Number, default: 0 },
  storageBytesUsed: { type: Number, default: 0 },
}, { timestamps: true });

export const UsageStats = mongoose.models.UsageStats || mongoose.model<any>('UsageStats', usageStatsSchema);

const inviteSchema = new mongoose.Schema({
  inviteId: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'used', 'revoked', 'expired'], default: 'pending' },
  customFields: [{ name: String, type: { type: String } }],
  onboardedEmail: { type: String },
}, { timestamps: true });

export const Invite = mongoose.models.Invite || mongoose.model<any>('Invite', inviteSchema);

const onboardingRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  businessType: { type: String },
  details: { type: Map, of: String },
  status: { type: String, enum: ['pending', 'reviewing', 'approved', 'rejected', 'info_needed'], default: 'pending' },
  superadminNotes: { type: String },
}, { timestamps: true });

export const OnboardingRequest = mongoose.models.OnboardingRequest || mongoose.model<any>('OnboardingRequest', onboardingRequestSchema);

const auditLogSchema = new mongoose.Schema({
  actor: { type: String, required: true }, // admin email or ID
  action: { type: String, required: true },
  target: { type: String }, // clientId or requestId
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  ip: { type: String }
}, { timestamps: true });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<any>('AuditLog', auditLogSchema);

const platformNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String },
  clientId: { type: String }
}, { timestamps: true });

export const PlatformNotification = mongoose.models.PlatformNotification || mongoose.model<any>('PlatformNotification', platformNotificationSchema);

const promptHistorySchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  promptType: { type: String, required: true },
  promptContent: { type: String, required: true },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export const PromptHistory = mongoose.models.PromptHistory || mongoose.model<any>('PromptHistory', promptHistorySchema);

const platformSettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'System Platform' },
  supportEmail: { type: String, default: 'admin@platform.com' },
  maintenanceMode: { type: Boolean, default: false },
  defaultAiLimit: { type: Number, default: 1000 },
  defaultStorageMB: { type: Number, default: 50 },
  allowAnonymousContact: { type: Boolean, default: true },
  enforceMfa: { type: Boolean, default: false },
  restrictSubdomains: { type: Boolean, default: true },
  detailedAuditLogging: { type: Boolean, default: true },
  homepageClientId: { type: String, default: 'platform-prime' },
  masterDns: { type: String, default: 'your-platform.com' },
  smtpVerified: { type: Boolean, default: true }
}, { timestamps: true });

export const PlatformSettings = mongoose.models.PlatformSettings || mongoose.model<any>('PlatformSettings', platformSettingsSchema);

// Additional Entities for Unified Architecture

const formSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  fields: [{
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'email', 'phone', 'number', 'date', 'select', 'checkbox', 'radio', 'textarea', 'heading', 'content-text', 'page-break', 'file', 'rating', 'signature'], required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    placeholder: { type: String },
    helpText: { type: String },
    logic: {
       action: { type: String, enum: ['show', 'hide'] },
       condition: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'any'] },
       dependentFieldId: { type: String },
       value: { type: String }
    },
    validation: {
        min: Number,
        max: Number,
        pattern: String,
        customErrorMessage: String
    },
    contentData: { type: String }
  }],
  tags: [{ type: String }],
  expiresAt: { type: Date },
  settings: {
     submitText: { type: String, default: 'Submit' },
     successMessage: { type: String, default: 'Thank you for your submission.' },
     redirectUrl: { type: String },
     notifyEmails: [{ type: String }],
     webhookUrl: { type: String }
  },
  theme: {
    primaryColor: { type: String, default: '#4f46e5' },
    backgroundColor: { type: String, default: '#f8fafc' },
    fontFamily: { type: String, default: 'Inter' },
    buttonStyle: { type: String, default: 'rounded-xl' },
    layout: { type: String, enum: ['classic', 'modern', 'minimal'], default: 'modern' }
  },
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
  stats: {
     views: { type: Number, default: 0 },
     submissions: { type: Number, default: 0 }
  }
}, { timestamps: true });

export const Form = mongoose.models.Form || mongoose.model<any>('Form', formSchema);

const leadSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  formId: { type: String },
  formName: { type: String },
  source: { type: String, enum: ['form', 'booking', 'contact', 'manual', 'api'], default: 'form' },
  contactFirst: { type: String },
  contactLast: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  company: { type: String },
  jobTitle: { type: String },
  data: { type: Map, of: mongoose.Schema.Types.Mixed },
  tags: [{ type: String }],
  stage: { type: String, enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'], default: 'New' },
  score: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
  location: {
    city: String,
    country: String,
    region: String,
    ip: String
  },
  activities: [{
     type: { type: String, enum: ['note', 'email', 'call', 'meeting', 'system', 'status_change'] },
     description: { type: String },
     date: { type: Date, default: Date.now },
     metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
  }],
  lastActivity: { type: Date, default: Date.now },
  assignedTo: { type: String }
}, { timestamps: true });

export const Lead = mongoose.models.Lead || mongoose.model<any>('Lead', leadSchema);

const contentItemSchema = new mongoose.Schema({
  contentId: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  type: { type: String, enum: ['text', 'rich-text', 'markdown', 'image', 'audio', 'video', 'file', 'url', 'embed', 'json'] },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  body: { type: String },
  mediaReferences: [{ type: String }],
  url: { type: String },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  version: { type: Number, default: 1 },
  locale: { type: String, default: 'en' },
  tags: [{ type: String }],
  publishState: { type: String, enum: ['scheduled', 'immediate'], default: 'immediate' }
}, { timestamps: true });

export const ContentItem = mongoose.models.ContentItem || mongoose.model<any>('ContentItem', contentItemSchema);

const mediaAssetSchema = new mongoose.Schema({
  mediaId: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'audio', 'document'] },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  altText: { type: String },
  caption: { type: String },
  duration: { type: Number },
  width: { type: Number },
  height: { type: Number },
  checksum: { type: String },
  storageProvider: { type: String, default: 'local' },
  uploadStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
}, { timestamps: true });

export const MediaAsset = mongoose.models.MediaAsset || mongoose.model<any>('MediaAsset', mediaAssetSchema);

const webhookSchema = new mongoose.Schema({
  webhookId: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  endpointUrl: { type: String, required: true },
  events: [{ type: String }],
  secret: { type: String },
  status: { type: String, enum: ['active', 'disabled', 'failing'], default: 'active' }
}, { timestamps: true });

export const Webhook = mongoose.models.Webhook || mongoose.model<any>('Webhook', webhookSchema);

const webhookDeliverySchema = new mongoose.Schema({
  deliveryId: { type: String, required: true, unique: true },
  webhookId: { type: String, required: true },
  clientId: { type: String, required: true },
  event: { type: String, required: true },
  payload: { type: Map, of: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['success', 'failed', 'retrying'], default: 'success' },
  responseStatusCode: { type: Number }
}, { timestamps: true });

export const WebhookDelivery = mongoose.models.WebhookDelivery || mongoose.model<any>('WebhookDelivery', webhookDeliverySchema);

const ticketSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'low' },
  assignedTo: { type: String }, // support agent email or ID
  source: { type: String, default: 'chat' } // chat, email, web
}, { timestamps: true });

export const Ticket = mongoose.models.Ticket || mongoose.model<any>('Ticket', ticketSchema);

const ticketMessageSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  senderRole: { type: String, enum: ['customer', 'agent', 'system', 'ai'], required: true },
  senderName: { type: String },
  content: { type: String, required: true },
  isInternal: { type: Boolean, default: false }
}, { timestamps: true });

export const TicketMessage = mongoose.models.TicketMessage || mongoose.model<any>('TicketMessage', ticketMessageSchema);

// AI Usage Logging - track all AI usage per client
const aiUsageLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  feature: { type: String, required: true }, // 'branding-gen', 'form-gen', 'website-gen', 'chat', 'telegram', 'whatsapp'
  source: { type: String, required: true }, // 'api', 'website', 'embed', 'telegram', 'whatsapp', 'dashboard'
  platform: { type: String, default: 'web' }, // 'web', 'telegram', 'whatsapp', etc
  tokensUsed: { type: Number, default: 1 },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  promptText: { type: String }, // truncated prompt for debugging
  responseLength: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'failed', 'quota_exceeded'], default: 'success' },
  ipAddress: { type: String },
  userEmail: { type: String },
  metadata: { type: Object }
}, { timestamps: true, index: { clientId: 1, createdAt: 1 } });

export const AIUsageLog = mongoose.models.AIUsageLog || mongoose.model<any>('AIUsageLog', aiUsageLogSchema);

// Quotas per client - defines limits for each tier
const quotaSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  tier: { type: String, enum: ['starter', 'professional', 'enterprise'], default: 'starter' },
  // AI Token quotas (monthly)
  aiTokensLimit: { type: Number, default: 10000 }, // Starter: 10K, Professional: 100K, Enterprise: unlimited
  aiTokensUsed: { type: Number, default: 0 },
  // Chat message quotas (monthly)
  chatMessagesLimit: { type: Number, default: 1000 }, // messages per month
  chatMessagesUsed: { type: Number, default: 0 },
  // Storage quota
  storageLimit: { type: Number, default: 1073741824 }, // 1GB in bytes for starter
  storageUsed: { type: Number, default: 0 },
  // Integrations enabled by tier
  enabledFeatures: {
    webChat: { type: Boolean, default: true },
    telegram: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    aiAssistant: { type: Boolean, default: true }
  },
  // Reset date for monthly quotas (typically 1st of month)
  quotaResetDate: { type: Date, default: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }},
  // Status
  status: { type: String, enum: ['active', 'paused', 'exceeded'], default: 'active' }
}, { timestamps: true });

export const Quota = mongoose.models.Quota || mongoose.model<any>('Quota', quotaSchema);

// Tier definitions - system-wide configurations
const tierDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 'starter', 'professional', 'enterprise'
  displayName: { type: String, required: true }, // 'Starter Plan', etc
  description: { type: String },
  monthlyPrice: { type: Number, default: 0 },
  features: {
    webChat: { type: Boolean, default: true },
    telegram: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    aiAssistant: { type: Boolean, default: true },
    customBranding: { type: Boolean, default: true }
  },
  limits: {
    aiTokensPerMonth: { type: Number, required: true },
    chatMessagesPerMonth: { type: Number, required: true },
    storageGB: { type: Number, required: true }
  }
}, { timestamps: true });

export const TierDefinition = mongoose.models.TierDefinition || mongoose.model<any>('TierDefinition', tierDefinitionSchema);

// AI Training Knowledge Base - exclusively for superadmin tenant 'platform-prime'
const aiTrainingKnowledgeSchema = new mongoose.Schema({
  clientId: { type: String, required: true, default: 'platform-prime' }, // Always superadmin
  category: { type: String, required: true }, // e.g., 'business', 'services', 'process', 'faq'
  title: { type: String, required: true },
  content: { type: String, required: true }, // Knowledge content
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  source: { type: String, default: 'manual' } // 'manual' or 'import'
}, { timestamps: true, indexes: [{ clientId: 1, status: 1 }, { clientId: 1, category: 1 }] });

export const AITrainingKnowledge = mongoose.models.AITrainingKnowledge || mongoose.model<any>('AITrainingKnowledge', aiTrainingKnowledgeSchema);

