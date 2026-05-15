import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  clientId: { type: String, required: true, default: 'plumber-001' },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  serviceSelection: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  preferredStartTime: { type: String, required: true },
  preferredEndTime: { type: String, required: true },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
}, { timestamps: true });

export const Booking = mongoose.models.Booking || mongoose.model<any>('Booking', bookingSchema);

const contactSchema = new mongoose.Schema({
  clientId: { type: String, required: true, default: 'plumber-001' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  subject: { type: String },
  message: { type: String, required: true },
  preferredContactMethod: { type: String, enum: ['email', 'phone'], default: 'email' },
  status: { type: String, enum: ['unread', 'resolved'], default: 'unread' }
}, { timestamps: true });

export const Contact = mongoose.models.Contact || mongoose.model<any>('Contact', contactSchema);

const aiLogSchema = new mongoose.Schema({
  clientId: { type: String, required: true, default: 'plumber-001' },
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
  heroTitle: { type: String, default: 'Fast & Reliable Services' },
  heroSubtitle: { type: String, default: 'Book instantly or chat with our AI assistant' },
  heroImage: { type: String },
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
  faqs: [faqSchema],
  aiBehaviorInstructions: { type: String, default: 'You are a helpful receptionist. Never guess services, prices or availability. Encourage booking.' }
}, { timestamps: true });

export const Settings = mongoose.models.Settings || mongoose.model<any>('Settings', settingsSchema);

const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'superadmin'], default: 'client' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  aiMessageLimit: { type: Number, default: 1000 },
  storageLimitBytes: { type: Number, default: 52428800 },
  customDomain: { type: String, unique: true, sparse: true },
}, { timestamps: true });

export const Client = mongoose.models.Client || mongoose.model<any>('Client', clientSchema);

const usageStatsSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  aiMessagesUsed: { type: Number, default: 0 },
  storageBytesUsed: { type: Number, default: 0 },
}, { timestamps: true });

export const UsageStats = mongoose.models.UsageStats || mongoose.model<any>('UsageStats', usageStatsSchema);

const onboardingLinkSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
  onboardedEmail: { type: String }, // The email used for login later
}, { timestamps: true });

export const OnboardingLink = mongoose.models.OnboardingLink || mongoose.model<any>('OnboardingLink', onboardingLinkSchema);
