import nodemailer from 'nodemailer';

import { Settings } from './models';

const createTransporter = (config?: any) => {
  return nodemailer.createTransport({
    host: config?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(config?.port || process.env.SMTP_PORT || '587'),
    secure: (config?.port || process.env.SMTP_PORT) === '465',
    auth: {
      user: config?.user || process.env.SMTP_USER,
      pass: config?.pass || process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000
  });
};

export const sendEmail = async (
  to: string, 
  subject: string, 
  text: string, 
  html?: string, 
  clientId?: string,
  overrideConfig?: any
): Promise<{ success: boolean; error?: any }> => {
  let smtpConfig = overrideConfig || null;
  
  if (clientId && !overrideConfig) {
    try {
      const settings = await Settings.findOne({ clientId });
      if (settings?.smtpHost && settings?.smtpUser) {
        smtpConfig = {
          host: settings.smtpHost,
          port: settings.smtpPort,
          user: settings.smtpUser,
          pass: settings.smtpPass,
          fromEmail: settings.smtpFromEmail,
          fromName: settings.smtpFromName
        };
      }
    } catch (e) {
      console.error('Failed to load client SMTP settings, falling back to default.');
    }
  }

  const user = smtpConfig?.user || process.env.SMTP_USER;
  const pass = smtpConfig?.pass || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('Skipping email send. No SMTP credentials configured.');
    return { success: false, error: 'SMTP credentials missing' };
  }
  
  try {
    const transporter = createTransporter(smtpConfig);
    const fromName = smtpConfig?.fromName || process.env.SMTP_FROM_NAME || 'Support';
    const fromEmail = smtpConfig?.fromEmail || user;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(`Email sent successfully to ${to} (Client: ${clientId || 'System'})`);
    return { success: true };
  } catch (error: any) {
    console.error(`Email delivery failure to ${to}:`, error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
};
