import crypto from 'crypto';
import {
    otpEmailVerificationTemplate,
    otpPasswordResetTemplate,
    otpLoginVerificationTemplate
} from '../templates/email.templates';
import Otp, { OtpPurpose } from '../models/Otp.model';
import { mailService } from './mail.service';
import { logger } from '../utils/logger.util';
import { AppError, ErrorCode } from '../utils/error.util';
import { Op } from 'sequelize';

export class OtpService {
    /**
     * Generate a numeric OTP (default 6 digits)
     */
    private static generateNumericOtp(length: number = 6): string {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            // secure random index
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }
        return otp;
    }

    /**
     * Create and send an OTP
     */
    async createAndSendOtp(
        email: string,
        purpose: OtpPurpose,
        expirationInMinutes: number = 15
    ): Promise<void> {
        try {
            // Invalidate existing active OTPs for this email and purpose
            await Otp.update(
                { is_used: true },
                {
                    where: {
                        email,
                        purpose,
                        is_used: false,
                    },
                }
            );

            // Generate new OTP
            const otpCode = OtpService.generateNumericOtp();
            const expiresAt = new Date(Date.now() + expirationInMinutes * 60 * 1000);

            // Save to database
            await Otp.create({
                email,
                otp: otpCode,
                purpose,
                expires_at: expiresAt,
                is_used: false,
            });

            // Send email logic based on purpose
            let subject = 'Your One-Time Password';
            let template = '';

            switch (purpose) {
                case OtpPurpose.EMAIL_VERIFICATION:
                    subject = 'Verify Your Email Address';
                    template = otpEmailVerificationTemplate;
                    break;
                case OtpPurpose.PASSWORD_RESET:
                    subject = 'Password Reset Request';
                    template = otpPasswordResetTemplate;
                    break;
                case OtpPurpose.LOGIN_VERIFICATION:
                    subject = 'Login Verification';
                    template = otpLoginVerificationTemplate;
                    break;
            }

            await mailService.send({
                to: email,
                subject,
                template,
                data: {
                    app_name: 'Silver Walks', // Using the correct template variables from mail.service
                    otpCode: otpCode,
                    expirationInMinutes: expirationInMinutes,
                }
            });

            logger.info('OTP created and sent', { email, purpose });

        } catch (error) {
            logger.error('Failed to create and send OTP', error as Error);
            throw new AppError('Failed to send verification code', 500, ErrorCode.INTERNAL_ERROR);
        }
    }

    /**
     * Verify an OTP
     */
    async verifyOtp(
        email: string,
        otp: string,
        purpose: OtpPurpose
    ): Promise<boolean> {
        const record = await Otp.findOne({
            where: {
                email,
                otp,
                purpose,
                is_used: false,
                expires_at: {
                    [Op.gt]: new Date() // Must not be expired
                }
            },
        });

        if (!record) {
            return false;
        }

        // Mark as used
        record.is_used = true;
        await record.save();

        return true;
    }
}

export const otpService = new OtpService();
