import { emailService, EmailOptions } from './email.service';
import { logger } from '../utils/logger.util';
import { config } from '../config/env.config';

/**
 * Email template data interface
 */
export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Mail service options
 */
export interface MailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data?: EmailTemplateData;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Global Mail Service
 * Provides a centralized way to send emails with HTML templates
 */
class MailService {
  /**
   * Replace template variables with actual data
   * Supports {{variable}} syntax
   */
  private compileTemplate(template: string, data: EmailTemplateData = {}): string {
    let compiled = template;

    // Replace all {{variable}} with actual values
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      compiled = compiled.replace(regex, String(value ?? ''));
    }

    // Add default app info if not provided
    compiled = compiled.replace(/{{app_name}}/g, data.app_name ? String(data.app_name) : 'Silver Walks');
    const appUrl = data.app_url || (Array.isArray(config.cors.origin) ? config.cors.origin[0] : config.cors.origin) || 'http://localhost:3000';
    compiled = compiled.replace(/{{app_url}}/g, String(appUrl));
    compiled = compiled.replace(/{{support_email}}/g, data.support_email ? String(data.support_email) : 'support@silverwalks.com');
    compiled = compiled.replace(/{{current_year}}/g, String(new Date().getFullYear()));

    return compiled;
  }

  /**
   * Generate plain text version from HTML
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gis, '')
      .replace(/<script[^>]*>.*<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send email with HTML template
   */
  async send(options: MailOptions): Promise<void> {
    try {
      // Compile template with data
      const htmlContent = this.compileTemplate(options.template, options.data);
      const textContent = this.htmlToText(htmlContent);

      // Prepare email options
      const emailOptions: EmailOptions = {
        to: options.to,
        subject: options.subject,
        html: htmlContent,
        text: textContent,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
      };

      // Send email
      await emailService.sendEmail(emailOptions);

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', error as Error);
      throw error;
    }
  }

  /**
   * Send bulk emails with the same template
   */
  async sendBulk(
    recipients: Array<{
      email: string;
      data?: EmailTemplateData;
    }>,
    subject: string,
    template: string
  ): Promise<void> {
    try {
      const emails = recipients.map((recipient) => {
        const htmlContent = this.compileTemplate(template, recipient.data);
        const textContent = this.htmlToText(htmlContent);

        return {
          to: recipient.email,
          subject,
          html: htmlContent,
          text: textContent,
        };
      });

      await emailService.sendBulkEmail(emails);

      logger.info('Bulk emails sent successfully', {
        count: recipients.length,
        subject,
      });
    } catch (error) {
      logger.error('Failed to send bulk emails', error as Error);
      throw error;
    }
  }

  /**
   * Send email with predefined layout wrapper
   */
  async sendWithLayout(options: MailOptions, layout?: string): Promise<void> {
    const defaultLayout = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .email-container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4CAF50;
          }
          .header h1 {
            color: #4CAF50;
            margin: 0;
          }
          .content {
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            margin: 20px 0;
            background-color: #4CAF50;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
          .button:hover {
            background-color: #45a049;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>{{app_name}}</h1>
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
            <p>
              Need help? Contact us at 
              <a href="mailto:{{support_email}}">{{support_email}}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const layoutTemplate = layout || defaultLayout;
    const wrappedTemplate = layoutTemplate.replace('{{content}}', options.template);
    const enhancedData = {
      ...options.data,
      subject: options.subject,
    };

    await this.send({
      ...options,
      template: wrappedTemplate,
      data: enhancedData,
    });
  }
}

// Export singleton instance
export const mailService = new MailService();

/**
 * Convenience function for sending emails
 */
export const sendMail = async (options: MailOptions): Promise<void> => {
  await mailService.send(options);
};

/**
 * Convenience function for sending emails with layout
 */
export const sendMailWithLayout = async (
  options: MailOptions,
  layout?: string
): Promise<void> => {
  await mailService.sendWithLayout(options, layout);
};
