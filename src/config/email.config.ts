import { config } from './env.config';

export type EmailProvider = 'nodemailer' | 'sendgrid' | 'mailtrap' | 'console';

export interface EmailConfig {
  provider: EmailProvider;
  from: string;
  // Nodemailer/SMTP config
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  // SendGrid config
  sendgrid?: {
    apiKey: string;
  };
  // Mailtrap config (uses SMTP but with specific settings)
  mailtrap?: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
}

export const emailConfig: EmailConfig = {
  provider: (process.env.EMAIL_PROVIDER as EmailProvider) || 'nodemailer',
  from: process.env.EMAIL_FROM || 'noreply@silverwalks.com',
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },
  mailtrap: {
    host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.MAILTRAP_PORT || '2525', 10),
    user: process.env.MAILTRAP_USER || '',
    password: process.env.MAILTRAP_PASSWORD || '',
  },
};

// Validate provider-specific config
if (emailConfig.provider === 'sendgrid' && !emailConfig.sendgrid?.apiKey) {
  if (config.env === 'production') {
    throw new Error('SENDGRID_API_KEY is required when using SendGrid provider');
  }
}

if (emailConfig.provider === 'nodemailer' && !emailConfig.smtp?.user) {
  if (config.env === 'production') {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD are required when using Nodemailer provider');
  }
}

if (emailConfig.provider === 'mailtrap' && !emailConfig.mailtrap?.user) {
  if (config.env === 'production') {
    throw new Error('MAILTRAP_USER and MAILTRAP_PASSWORD are required when using Mailtrap provider');
  }
}

export default emailConfig;

