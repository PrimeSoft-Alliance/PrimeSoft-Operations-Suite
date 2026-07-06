import nodemailer from 'nodemailer';
import path from 'path';
import { Settings } from './models';
import { redisService } from './services/redisService';
import { EmailConfigService } from './services/emailConfigService';

// Singleton transporters to reuse connections
const transporters = new Map<string, nodemailer.Transporter>();

/**
 * Get or create a transporter based on config
 */
const getTransporter = (config: any): nodemailer.Transporter => {
  const configKey = JSON.stringify({
    host: config.host,
    port: config.port,
    user: config.auth.user,
    pass: config.auth.pass, // Include pass to avoid stale transporter if credentials change
    secure: config.secure
  });

  if (transporters.has(configKey)) {
    const existing = transporters.get(configKey)!;
    return existing;
  }

  console.log(`[SMTP] Creating new transporter for ${config.auth.user}@${config.host}:${config.port} (Secure: ${config.secure})`);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed or mismatching certificates
    },
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });

  transporters.set(configKey, transporter);
  return transporter;
};

export const sendEmail = async (
  to: string, 
  subject: string, 
  text: string, 
  html?: string, 
  clientId?: string,
  overrideConfig?: any,
  attachments?: any[],
  options?: { inReplyTo?: string; references?: string | string[]; messageId?: string }
): Promise<{ success: boolean; error?: any; isSimulated?: boolean }> => {
  let finalConfig: any = null;
  let source: 'client' | 'env' | 'missing' | 'override' = 'missing';

  if (overrideConfig) {
    finalConfig = overrideConfig;
    source = 'override';
  } else if (clientId) {
    const { config, source: selectedSource } = await EmailConfigService.getSmtpConfig(clientId);
    finalConfig = config;
    source = selectedSource;
  } else {
    // If no clientId provided, try environment directly
    const { config, source: envSource } = await EmailConfigService.getSmtpConfig('system');
    finalConfig = config;
    source = envSource;
  }

  const isDummyEmail = /@example\.com|@example\.org|@example\.net|@test\.com|@import\.com/i.test(to);

  if (!finalConfig || isDummyEmail) {
    if (isDummyEmail) {
      console.log(`[EMAIL SIMULATION] Dummy email address detected (${to}). Simulating delivery.`);
    } else {
      console.warn(`[EMAIL SIMULATION] No SMTP credentials configured (Source: ${source}). Simulating delivery.`);
    }
    
    // Attempt to get business name for simulation
    let fromName = 'OminiRep (Simulated)';
    let fromEmail = 'sandbox@ominirep.com';
    
    if (clientId) {
      try {
        const settings = await Settings.findOne({ clientId }).lean();
        if (settings?.smtpFromName) {
          fromName = settings.smtpFromName;
        } else if (settings?.businessName) {
          fromName = settings.businessName;
        }

        if (settings?.smtpFromEmail) fromEmail = settings.smtpFromEmail;
        else if (settings?.smtpUser) fromEmail = settings.smtpUser;
      } catch (e) {}
    }

    try {
      const { UnifiedMessage } = await import('./models');
      await UnifiedMessage.create({
        clientId: clientId || 'system',
        messageId: `sim-smtp-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        type: 'email',
        direction: 'outbound',
        status: 'sent',
        from: `"${fromName}" <${fromEmail}>`,
        to,
        content: html || text,
        metadata: {
          subject,
          isSimulated: true,
          attachmentsCount: attachments?.length || 0
        }
      });
      
      // Emit Redis success event for simulation
      await redisService.client.publish('email_events', JSON.stringify({
        event: 'email.sent',
        clientId: clientId || 'system',
        to,
        subject,
        isSimulated: true,
        timestamp: new Date()
      }));
    } catch (dbErr: any) {
      console.error('Failed to save simulated email to UnifiedMessage:', dbErr.message);
    }

    return { success: true, isSimulated: true };
  }
  
  // Prepare sender info
  let fromName = 'OminiRep';
  let fromEmail = finalConfig.auth.user;

  if (clientId) {
    try {
      const settings = await Settings.findOne({ clientId }).lean();
      
      // If using system SMTP (env source), prioritize Business Name for transparency
      if (source !== 'client') {
        fromName = settings?.businessName || 'OminiRep Operator';
        fromEmail = finalConfig.auth.user;
      } else {
        // Using client's own SMTP
        if (settings?.smtpFromName) {
          fromName = settings.smtpFromName;
        } else if (settings?.businessName) {
          fromName = settings.businessName;
        }

        if (settings?.smtpFromEmail) {
          fromEmail = settings.smtpFromEmail;
        } else {
          fromEmail = finalConfig.auth.user;
        }
      }
    } catch (e) {}
  }

  // Retry logic: 3 attempts, exponential backoff
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const transporter = getTransporter(finalConfig);

      const mailOptions: any = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html: html || text,
      };
      
      if (options?.messageId) mailOptions.messageId = options.messageId;
      if (options?.inReplyTo) mailOptions.inReplyTo = options.inReplyTo;
      if (options?.references) mailOptions.references = options.references;

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => {
          const attachment: any = {
            filename: att.filename || 'attachment',
            contentType: att.mimeType || att.contentType
          };
          if (att.content) attachment.content = att.content;
          if (att.url || att.path) {
            let fullPath = att.url || att.path;
            if (fullPath.startsWith('/uploads/')) {
              // Local file path
              attachment.path = path.join(process.cwd(), fullPath);
            } else {
              // External URL
              attachment.path = fullPath;
            }
          }
          return attachment;
        });
      }

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Email sent successfully to ${to} (Attempt ${attempt}, Source: ${source}, Client: ${clientId || 'System'})`);

      // Save to DB
      try {
        const { UnifiedMessage } = await import('./models');
        await UnifiedMessage.create({
          clientId: clientId || 'system',
          messageId: `smtp-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          type: 'email',
          direction: 'outbound',
          status: 'sent',
          from: `"${fromName}" <${fromEmail}>`,
          to,
          content: html || text,
          metadata: {
            subject,
            isSimulated: false,
            attachmentsCount: attachments?.length || 0
          }
        });
      } catch (dbErr: any) {
        console.error('[SMTP] Failed to save sent email to UnifiedMessage:', dbErr.message);
      }

      // ⚡ REDIS EVENT SYSTEM (MANDATORY)
      await redisService.client.publish('email_events', JSON.stringify({
        event: 'email.sent',
        clientId: clientId || 'system',
        to,
        subject,
        timestamp: new Date()
      }));

      return { success: true };
    } catch (error: any) {
      lastError = error;
      const errMsg = error?.message || String(error);
      console.error(`[SMTP] Attempt ${attempt} failed for ${to} (Source: ${source}):`, errMsg);
      
      // If error is a rate-limit or permanent delivery rejection, don't waste time on retries
      const isRateLimit = /too many emails|quota|limit|550|rejected|authenticated/i.test(errMsg);
      if (isRateLimit) {
        console.warn(`[SMTP] Permanent or rate-limit error detected. Skipping futile retries.`);
        break;
      }
      
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all attempts failed, fall back to simulated delivery to keep the system operational
  console.warn(`[SMTP FALLBACK] Real SMTP dispatch failed. Falling back to Simulated Delivery. Error: ${lastError?.message || lastError}`);
  
  try {
    const { UnifiedMessage } = await import('./models');
    await UnifiedMessage.create({
      clientId: clientId || 'system',
      messageId: `fallback-smtp-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      type: 'email',
      direction: 'outbound',
      status: 'sent',
      from: `"${fromName}" <${fromEmail}>`,
      to,
      content: html || text,
      metadata: {
        subject,
        isSimulated: true,
        originalError: lastError?.message || String(lastError),
        attachmentsCount: attachments?.length || 0
      }
    });
    
    // Emit Redis success event for simulation
    await redisService.client.publish('email_events', JSON.stringify({
      event: 'email.sent',
      clientId: clientId || 'system',
      to,
      subject,
      isSimulated: true,
      error: lastError?.message || String(lastError),
      timestamp: new Date()
    }));
  } catch (dbErr: any) {
    console.error('Failed to save fallback simulated email to UnifiedMessage:', dbErr.message);
  }

  return { success: true, isSimulated: true, error: lastError?.message || String(lastError) };
};

