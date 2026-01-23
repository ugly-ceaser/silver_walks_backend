/**
 * Email Templates
 * Reusable HTML templates for different email types
 */

/**
 * Welcome Email Template for Elderly Users
 */
export const elderlyWelcomeTemplate = `
  <h2>Welcome to Silver Walks, {{name}}! 🎉</h2>
  
  <p>We're thrilled to have you join our community of seniors staying active and healthy through walking.</p>
  
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Your Account Details</h3>
    <p><strong>Email:</strong> {{email}}</p>
    <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px;">{{tempPassword}}</code></p>
    <p style="color: #dc3545; margin-top: 10px;">
      <strong>⚠️ Important:</strong> Please change your password after your first login for security.
    </p>
  </div>

  <h3>What's Next?</h3>
  <ul>
    <li>Log in to your account using the temporary password above</li>
    <li>Complete your profile with your health information</li>
    <li>Browse available nurses in your area</li>
    <li>Schedule your first walk!</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{loginUrl}}" class="button">Login to Your Account</a>
  </div>

  <p>If you have any questions or need assistance, our support team is here to help!</p>
  
  <p>Stay active, stay healthy! 🚶‍♀️</p>
`;

/**
 * Password Reset Template
 */
export const passwordResetTemplate = `
  <h2>Password Reset Request</h2>
  
  <p>Hi {{name}},</p>
  
  <p>We received a request to reset your password for your Silver Walks account.</p>
  
  <p>Click the button below to create a new password:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetUrl}}" class="button">Reset Password</a>
  </div>
  
  <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
    <p style="margin: 0;"><strong>⏰ This link expires in {{expiryTime}}</strong></p>
  </div>
  
  <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
  
  <p style="font-size: 12px; color: #666; margin-top: 30px;">
    For security reasons, this link can only be used once and will expire after {{expiryTime}}.
  </p>
`;

/**
 * Walk Scheduled Notification
 */
export const walkScheduledTemplate = `
  <h2>Walk Scheduled Successfully! 🎉</h2>
  
  <p>Hi {{elderlyName}},</p>
  
  <p>Great news! Your walk has been scheduled with {{nurseName}}.</p>
  
  <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
    <h3 style="margin-top: 0; color: #155724;">Walk Details</h3>
    <p style="margin: 5px 0;"><strong>📅 Date:</strong> {{walkDate}}</p>
    <p style="margin: 5px 0;"><strong>🕐 Time:</strong> {{walkTime}}</p>
    <p style="margin: 5px 0;"><strong>📍 Location:</strong> {{location}}</p>
    <p style="margin: 5px 0;"><strong>⏱️ Duration:</strong> {{duration}}</p>
  </div>
  
  <h3>Your Nurse: {{nurseName}}</h3>
  <p>{{nurseInfo}}</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{viewDetailsUrl}}" class="button">View Walk Details</a>
  </div>
  
  <h3>Preparation Tips</h3>
  <ul>
    <li>Wear comfortable walking shoes</li>
    <li>Bring water to stay hydrated</li>
    <li>Apply sunscreen if walking outdoors</li>
    <li>Have your emergency contacts ready</li>
  </ul>
  
  <p>Looking forward to your walk! 🚶‍♀️</p>
`;

/**
 * Walk Reminder Template
 */
export const walkReminderTemplate = `
  <h2>Walk Reminder: Tomorrow at {{walkTime}} ⏰</h2>
  
  <p>Hi {{elderlyName}},</p>
  
  <p>This is a friendly reminder about your upcoming walk.</p>
  
  <div style="background-color: #cce5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #004085;">
    <h3 style="margin-top: 0; color: #004085;">Tomorrow's Walk</h3>
    <p style="margin: 5px 0;"><strong>🕐 Time:</strong> {{walkTime}}</p>
    <p style="margin: 5px 0;"><strong>📍 Meeting Point:</strong> {{location}}</p>
    <p style="margin: 5px 0;"><strong>👩‍⚕️ Nurse:</strong> {{nurseName}}</p>
  </div>
  
  <p>Your nurse will meet you at the scheduled location. If you need to reschedule or cancel, please do so at least 2 hours in advance.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{manageWalkUrl}}" class="button">Manage This Walk</a>
  </div>
  
  <p>See you tomorrow! 🌟</p>
`;

/**
 * Walk Completed Template
 */
export const walkCompletedTemplate = `
  <h2>Walk Completed Successfully! 🎊</h2>
  
  <p>Hi {{elderlyName}},</p>
  
  <p>Congratulations on completing your walk with {{nurseName}}!</p>
  
  <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Walk Summary</h3>
    <p style="margin: 5px 0;"><strong>📅 Date:</strong> {{walkDate}}</p>
    <p style="margin: 5px 0;"><strong>⏱️ Duration:</strong> {{duration}}</p>
    <p style="margin: 5px 0;"><strong>📍 Distance:</strong> {{distance}}</p>
    <p style="margin: 5px 0;"><strong>🔥 Calories:</strong> {{calories}}</p>
  </div>
  
  <h3>Rate Your Experience</h3>
  <p>Help us improve by rating your walk experience with {{nurseName}}:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ratingUrl}}" class="button">Rate This Walk</a>
  </div>
  
  <p>Keep up the great work! Every step counts towards a healthier you. 💪</p>
`;

/**
 * Nurse Assignment Notification
 */
export const nurseAssignmentTemplate = `
  <h2>New Walk Request! 🆕</h2>
  
  <p>Hi {{nurseName}},</p>
  
  <p>You have a new walk request from {{elderlyName}}.</p>
  
  <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Walk Request Details</h3>
    <p style="margin: 5px 0;"><strong>👤 Client:</strong> {{elderlyName}}</p>
    <p style="margin: 5px 0;"><strong>📅 Requested Date:</strong> {{requestedDate}}</p>
    <p style="margin: 5px 0;"><strong>🕐 Requested Time:</strong> {{requestedTime}}</p>
    <p style="margin: 5px 0;"><strong>📍 Location:</strong> {{location}}</p>
  </div>
  
  <h3>Client Information</h3>
  <p><strong>Age:</strong> {{elderlyAge}}</p>
  <p><strong>Mobility Level:</strong> {{mobilityLevel}}</p>
  <p><strong>Special Notes:</strong> {{specialNotes}}</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{acceptUrl}}" class="button" style="background-color: #28a745;">Accept Request</a>
    <a href="{{declineUrl}}" class="button" style="background-color: #dc3545; margin-left: 10px;">Decline</a>
  </div>
  
  <p>Please respond within 24 hours.</p>
`;

/**
 * Subscription Renewal Reminder
 */
export const subscriptionRenewalTemplate = `
  <h2>Subscription Renewal Reminder 🔔</h2>
  
  <p>Hi {{name}},</p>
  
  <p>Your {{planName}} subscription will expire on {{expiryDate}}.</p>
  
  <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <h3 style="margin-top: 0;">Current Plan Details</h3>
    <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
    <p style="margin: 5px 0;"><strong>Expires:</strong> {{expiryDate}}</p>
    <p style="margin: 5px 0;"><strong>Walks Remaining:</strong> {{walksRemaining}}</p>
  </div>
  
  <p>To continue enjoying your walks, please renew your subscription.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{renewUrl}}" class="button">Renew Subscription</a>
  </div>
  
  <p>Questions? Our support team is here to help!</p>
`;

/**
 * Emergency Alert Template
 */
export const emergencyAlertTemplate = `
  <h2 style="color: #dc3545;">🚨 Emergency Alert</h2>
  
  <p><strong>URGENT:</strong> An emergency alert has been triggered.</p>
  
  <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
    <h3 style="margin-top: 0; color: #721c24;">Alert Details</h3>
    <p style="margin: 5px 0;"><strong>Person:</strong> {{elderlyName}}</p>
    <p style="margin: 5px 0;"><strong>Location:</strong> {{location}}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> {{alertTime}}</p>
    <p style="margin: 5px 0;"><strong>Type:</strong> {{alertType}}</p>
  </div>
  
  <p><strong>Additional Information:</strong></p>
  <p>{{additionalInfo}}</p>
  
  <div style="background-color: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Emergency Contacts Notified:</strong></p>
    <ul style="margin: 10px 0;">
      {{emergencyContacts}}
    </ul>
  </div>
  
  <p style="color: #dc3545; font-weight: bold;">If this is a medical emergency, please call 911 immediately.</p>
`;

/**
 * Account Verification Template
 */
export const accountVerificationTemplate = `
  <h2>Verify Your Email Address ✉️</h2>
  
  <p>Hi {{name}},</p>
  
  <p>Thank you for registering with Silver Walks! Please verify your email address to activate your account.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
  </div>
  
  <p>Or copy and paste this link into your browser:</p>
  <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
    {{verificationUrl}}
  </p>
  
  <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
    <p style="margin: 0;"><strong>⏰ This verification link expires in 24 hours.</strong></p>
  </div>
  
  <p>If you didn't create an account with Silver Walks, please ignore this email.</p>
`;

/**
 * Payment Receipt Template
 */
export const paymentReceiptTemplate = `
  <h2>Payment Receipt 💳</h2>
  
  <p>Hi {{name}},</p>
  
  <p>Thank you for your payment! Here's your receipt:</p>
  
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Payment Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Receipt Number:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">{{receiptNumber}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">{{paymentDate}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">{{description}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 2px solid #333;"><strong>Amount:</strong></td>
        <td style="padding: 8px 0; border-bottom: 2px solid #333; text-align: right; font-size: 18px; color: #28a745;"><strong>{{amount}}</strong></td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{receiptUrl}}" class="button">Download Receipt</a>
  </div>
  
  <p>If you have any questions about this payment, please contact our support team.</p>
`;

/**
 * OTP Email Verification Template
 */
export const otpEmailVerificationTemplate = `
  <h1>Email Verification</h1>
  <p>Your verification code is:</p>
  <h2 style="letter-spacing: 5px; background-color: #f4f4f4; padding: 10px; display: inline-block;">{{otpCode}}</h2>
  <p>This code will expire in {{expirationInMinutes}} minutes.</p>
`;

/**
 * OTP Password Reset Template
 */
export const otpPasswordResetTemplate = `
  <h1>Password Reset</h1>
  <p>You requested to reset your password. Use the code below:</p>
  <h2 style="letter-spacing: 5px; background-color: #f4f4f4; padding: 10px; display: inline-block;">{{otpCode}}</h2>
  <p>This code will expire in {{expirationInMinutes}} minutes.</p>
  <p>If you didn't request this, ignore this email.</p>
`;

/**
 * OTP Login Verification Template
 */
export const otpLoginVerificationTemplate = `
  <h1>Login Verification</h1>
  <p>Your verification code is:</p>
  <h2 style="letter-spacing: 5px; background-color: #f4f4f4; padding: 10px; display: inline-block;">{{otpCode}}</h2>
  <p>This code will expire in {{expirationInMinutes}} minutes.</p>
`;

