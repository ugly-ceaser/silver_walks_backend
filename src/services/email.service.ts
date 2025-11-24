import { emailConfig, EmailProvider } from '../config/email.config';
import { logger } from '../utils/logger.util';
import { AppError, ErrorCode } from '../utils/error.util';
import { config } from '../config/env.config';

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  from?: string;
}

/**
 * Email service interface
 */
interface IEmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendBulkEmail(emails: EmailOptions[]): Promise<void>;
}

/**
 * Console email service (for development/testing)
 * Logs emails to console instead of sending
 */
class ConsoleEmailService implements IEmailService {
  async sendEmail(options: EmailOptions): Promise<void> {
    logger.info('📧 Email (Console Provider)', {
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ? '[HTML Content]' : undefined,
    });
    
    if (config.env === 'development') {
      console.log('\n========== EMAIL (CONSOLE) ==========');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      if (options.text) console.log('Text:', options.text);
      if (options.html) console.log('HTML:', options.html);
      console.log('=====================================\n');
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<void> {
    for (const email of emails) {
      await this.sendEmail(email);
    }
  }
}

/**
 * Nodemailer email service
 */
class NodemailerEmailService implements IEmailService {
  private transporter: any;

  constructor() {
    const nodemailer = require('nodemailer');
    
    if (!emailConfig.smtp) {
      throw new AppError(
        'SMTP configuration is missing',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }

    this.transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.user,
        pass: emailConfig.smtp.password,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || emailConfig.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent via Nodemailer', {
        messageId: info.messageId,
        to: options.to,
      });
    } catch (error) {
      logger.error('Failed to send email via Nodemailer', error as Error);
      throw new AppError(
        'Failed to send email',
        500,
        ErrorCode.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<void> {
    const sendPromises = emails.map((email) => this.sendEmail(email));
    await Promise.all(sendPromises);
  }
}

/**
 * SendGrid email service
 */
class SendGridEmailService implements IEmailService {
  private sgMail: any;

  constructor() {
    const sgMail = require('@sendgrid/mail');
    
    if (!emailConfig.sendgrid?.apiKey) {
      throw new AppError(
        'SendGrid API key is missing',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }

    sgMail.setApiKey(emailConfig.sendgrid.apiKey);
    this.sgMail = sgMail;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const msg = {
        to: Array.isArray(options.to) ? options.to : [options.to],
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        from: options.from || emailConfig.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((att) => ({
          content: att.content?.toString('base64'),
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment',
        })),
      };

      await this.sgMail.send(msg);
      logger.info('Email sent via SendGrid', {
        to: options.to,
      });
    } catch (error: any) {
      logger.error('Failed to send email via SendGrid', error);
      throw new AppError(
        `Failed to send email: ${error.message}`,
        500,
        ErrorCode.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<void> {
    const sendPromises = emails.map((email) => this.sendEmail(email));
    await Promise.all(sendPromises);
  }
}

/**
 * Mailtrap email service (uses Nodemailer with Mailtrap config)
 */
class MailtrapEmailService implements IEmailService {
  private transporter: any;

  constructor() {
    const nodemailer = require('nodemailer');
    
    if (!emailConfig.mailtrap) {
      throw new AppError(
        'Mailtrap configuration is missing',
        500,
        ErrorCode.INTERNAL_ERROR
      );
    }

    this.transporter = nodemailer.createTransport({
      host: emailConfig.mailtrap.host,
      port: emailConfig.mailtrap.port,
      auth: {
        user: emailConfig.mailtrap.user,
        pass: emailConfig.mailtrap.password,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || emailConfig.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent via Mailtrap', {
        messageId: info.messageId,
        to: options.to,
      });
    } catch (error) {
      logger.error('Failed to send email via Mailtrap', error as Error);
      throw new AppError(
        'Failed to send email',
        500,
        ErrorCode.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<void> {
    const sendPromises = emails.map((email) => this.sendEmail(email));
    await Promise.all(sendPromises);
  }
}

/**
 * Email service factory
 */
class EmailServiceFactory {
  private static instance: IEmailService | null = null;

  static getInstance(): IEmailService {
    if (this.instance) {
      return this.instance;
    }

    const provider = emailConfig.provider;

    switch (provider) {
      case 'sendgrid':
        this.instance = new SendGridEmailService();
        break;
      case 'mailtrap':
        this.instance = new MailtrapEmailService();
        break;
      case 'console':
        this.instance = new ConsoleEmailService();
        break;
      case 'nodemailer':
      default:
        this.instance = new NodemailerEmailService();
        break;
    }

    logger.info(`Email service initialized with provider: ${provider}`);
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}

// Export singleton instance
export const emailService = EmailServiceFactory.getInstance();

/**
 * Convenience functions
 */

/**
 * Send a single email
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const service = EmailServiceFactory.getInstance();
  await service.sendEmail(options);
};

/**
 * Send bulk emails
 */
export const sendBulkEmail = async (emails: EmailOptions[]): Promise<void> => {
  const service = EmailServiceFactory.getInstance();
  await service.sendBulkEmail(emails);
};

/**
 * Send email with template (helper function)
 */
export const sendTemplatedEmail = async (
  to: string | string[],
  subject: string,
  template: string,
  variables: Record<string, any> = {}
): Promise<void> => {
  // Simple template replacement
  let html = template;
  let text = template;

  // Replace variables in template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value));
    text = text.replace(regex, String(value));
  }

  // Remove HTML tags for text version
  text = text.replace(/<[^>]*>/g, '');

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (
  to: string,
  name: string,
  role: string
): Promise<void> => {
  const html = `
    <h1>Welcome to Silver Walks!</h1>
    <p>Hi ${name},</p>
    <p>Welcome to Silver Walks! Your account has been created successfully.</p>
    <p>Role: ${role}</p>
    <p>Thank you for joining us!</p>
  `;

  await sendEmail({
    to,
    subject: 'Welcome to Silver Walks',
    html,
    text: `Welcome to Silver Walks! Hi ${name}, your account has been created. Role: ${role}`,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string,
  resetUrl: string
): Promise<void> => {
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}?token=${resetToken}">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  await sendEmail({
    to,
    subject: 'Password Reset Request',
    html,
    text: `Password Reset Request. Click here to reset: ${resetUrl}?token=${resetToken}`,
  });
};

/**
 * Send email verification
 */
export const sendVerificationEmail = async (
  to: string,
  verificationToken: string,
  verificationUrl: string
): Promise<void> => {
  const html = `
    <h1>Verify Your Email</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationUrl}?token=${verificationToken}">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
  `;

  await sendEmail({
    to,
    subject: 'Verify Your Email Address',
    html,
    text: `Verify your email: ${verificationUrl}?token=${verificationToken}`,
  });
};

