import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { Settings } from '../models';

export interface EmailProtocolConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface VerificationResult {
  protocol: 'smtp' | 'imap';
  source: 'client' | 'env' | 'missing';
  valid: boolean;
  working: boolean;
  verified: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  stage: string;
  error: null | {
    message: string;
    code: string;
  };
}

export class EmailConfigService {
  /**
   * Selection logic for SMTP: Client settings first, then ENV.
   * No merging allowed.
   */
  static async getSmtpConfig(clientId: string): Promise<{ config: EmailProtocolConfig | null; source: 'client' | 'env' | 'missing' }> {
    const settings = await Settings.findOne({ clientId });
    
    // Check client settings
    if (settings?.smtpHost?.trim() && settings?.smtpUser?.trim() && settings?.smtpPass) {
      return {
        source: 'client',
        config: {
          host: settings.smtpHost.trim(),
          port: Number(settings.smtpPort) || 587,
          secure: settings.smtpUseTls ?? (Number(settings.smtpPort) === 465),
          auth: {
            user: settings.smtpUser.trim(),
            pass: settings.smtpPass,
          }
        }
      };
    }

    // Check environment settings
    if (process.env.SMTP_HOST?.trim()) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const config: any = {
        host: process.env.SMTP_HOST.trim(),
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
      };
      if (process.env.SMTP_USER?.trim()) {
        config.auth = {
          user: process.env.SMTP_USER.trim(),
          pass: process.env.SMTP_PASS || '',
        };
      }
      return {
        source: 'env',
        config
      };
    }

    return { source: 'missing', config: null };
  }

  /**
   * Selection logic for IMAP: Client settings first, then ENV.
   * No merging allowed.
   */
  static async getImapConfig(clientId: string): Promise<{ config: EmailProtocolConfig | null; source: 'client' | 'env' | 'missing' }> {
    const settings = await Settings.findOne({ clientId });
    
    // Check client settings
    if (settings?.inboundEmailHost?.trim() && settings?.inboundEmailUser?.trim() && settings?.inboundEmailPass) {
      return {
        source: 'client',
        config: {
          host: settings.inboundEmailHost.trim(),
          port: Number(settings.inboundEmailPort) || 993,
          secure: settings.inboundEmailSsl !== false,
          auth: {
            user: settings.inboundEmailUser.trim(),
            pass: settings.inboundEmailPass,
          }
        }
      };
    }

    // Check environment settings
    if (process.env.IMAP_HOST?.trim()) {
      const port = Number(process.env.IMAP_PORT) || 993;
      const config: any = {
        host: process.env.IMAP_HOST.trim(),
        port,
        secure: process.env.IMAP_SECURE === 'true' || port === 993,
      };
      if (process.env.IMAP_USER?.trim()) {
        config.auth = {
          user: process.env.IMAP_USER.trim(),
          pass: process.env.IMAP_PASS || '',
        };
      }
      return {
        source: 'env',
        config
      };
    }

    return { source: 'missing', config: null };
  }

  static async verifySmtp(config: EmailProtocolConfig, source: 'client' | 'env'): Promise<VerificationResult> {
    const result: VerificationResult = {
      protocol: 'smtp',
      source,
      valid: true,
      working: false,
      verified: false,
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.auth.user,
      stage: 'validation',
      error: null
    };

    try {
      const transporter = nodemailer.createTransport(config);
      result.stage = 'connect';
      await transporter.verify();
      result.working = true;
      result.verified = true;
      result.stage = 'success';
    } catch (err: any) {
      result.stage = result.stage === 'validation' ? 'connect' : result.stage;
      result.error = {
        message: err.message || String(err),
        code: err.code || 'SMTP_VERIFY_FAILED'
      };
    }

    return result;
  }

  static async verifyImap(config: EmailProtocolConfig, source: 'client' | 'env'): Promise<VerificationResult> {
    const result: VerificationResult = {
      protocol: 'imap',
      source,
      valid: true,
      working: false,
      verified: false,
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.auth.user,
      stage: 'validation',
      error: null
    };

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      logger: false,
      connectionTimeout: 30000,
      greetingTimeout: 30000
    });

    try {
      result.stage = 'connect';
      await client.connect();
      result.stage = 'mailbox-access';
      await client.list();
      result.working = true;
      result.verified = true;
      result.stage = 'logout';
      await client.logout();
      result.stage = 'success';
    } catch (err: any) {
      result.error = {
        message: err.message || String(err),
        code: err.code || 'IMAP_VERIFY_FAILED'
      };
      // Ensure we try to logout if connect succeeded
      if (result.stage === 'mailbox-access') {
        await client.logout().catch(() => {});
      }
    }

    return result;
  }
}
