/**
 * EXAMPLE USAGE OF EMAIL SERVICE
 * 
 * This file shows how to use the email service with different providers.
 * Delete this file after reviewing the examples.
 */

import {
  sendEmail,
  sendBulkEmail,
  sendTemplatedEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  emailService,
} from './email.service';

/**
 * Example 1: Send a simple email
 */
export const exampleSimpleEmail = async () => {
  await sendEmail({
    to: 'user@example.com',
    subject: 'Hello from Silver Walks',
    text: 'This is a plain text email',
    html: '<h1>This is an HTML email</h1>',
  });
};

/**
 * Example 2: Send email with attachments
 */
export const exampleEmailWithAttachments = async () => {
  await sendEmail({
    to: 'user@example.com',
    subject: 'Document Attached',
    text: 'Please find the attached document',
    html: '<p>Please find the attached document</p>',
    attachments: [
      {
        filename: 'document.pdf',
        path: '/path/to/document.pdf',
        contentType: 'application/pdf',
      },
      {
        filename: 'image.jpg',
        content: Buffer.from('...'), // File buffer
        contentType: 'image/jpeg',
      },
    ],
  });
};

/**
 * Example 3: Send email to multiple recipients
 */
export const exampleBulkEmail = async () => {
  await sendEmail({
    to: ['user1@example.com', 'user2@example.com'],
    cc: ['manager@example.com'],
    bcc: ['admin@example.com'],
    subject: 'Bulk Email',
    html: '<p>This email is sent to multiple recipients</p>',
  });
};

/**
 * Example 4: Send templated email
 */
export const exampleTemplatedEmail = async () => {
  const template = `
    <h1>Hello {{name}}!</h1>
    <p>Your account balance is: ${{balance}}</p>
    <p>You have {{walks}} walks remaining this month.</p>
  `;

  await sendTemplatedEmail(
    'user@example.com',
    'Account Summary',
    template,
    {
      name: 'John Doe',
      balance: '150.00',
      walks: '8',
    }
  );
};

/**
 * Example 5: Send welcome email (pre-built template)
 */
export const exampleWelcomeEmail = async () => {
  await sendWelcomeEmail(
    'newuser@example.com',
    'John Doe',
    'elderly'
  );
};

/**
 * Example 6: Send password reset email
 */
export const examplePasswordReset = async () => {
  const resetToken = 'abc123xyz';
  const resetUrl = 'https://app.silverwalks.com/reset-password';

  await sendPasswordResetEmail(
    'user@example.com',
    resetToken,
    resetUrl
  );
};

/**
 * Example 7: Send email verification
 */
export const exampleEmailVerification = async () => {
  const verificationToken = 'xyz789abc';
  const verificationUrl = 'https://app.silverwalks.com/verify-email';

  await sendVerificationEmail(
    'user@example.com',
    verificationToken,
    verificationUrl
  );
};

/**
 * Example 8: Send bulk emails
 */
export const exampleBulkEmails = async () => {
  const emails = [
    {
      to: 'user1@example.com',
      subject: 'Email 1',
      html: '<p>Content 1</p>',
    },
    {
      to: 'user2@example.com',
      subject: 'Email 2',
      html: '<p>Content 2</p>',
    },
  ];

  await sendBulkEmail(emails);
};

/**
 * Example 9: Use email service directly
 */
export const exampleDirectService = async () => {
  await emailService.sendEmail({
    to: 'user@example.com',
    subject: 'Direct Service Usage',
    html: '<p>Using email service directly</p>',
  });
};

/**
 * Example 10: Send email with custom from address
 */
export const exampleCustomFrom = async () => {
  await sendEmail({
    to: 'user@example.com',
    from: 'support@silverwalks.com',
    subject: 'Support Email',
    html: '<p>This email is from support</p>',
  });
};

/**
 * Example 11: Send email with reply-to
 */
export const exampleReplyTo = async () => {
  await sendEmail({
    to: 'user@example.com',
    subject: 'Contact Us',
    html: '<p>Reply to this email</p>',
    replyTo: 'noreply@silverwalks.com',
  });
};

