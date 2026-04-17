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
    private static generateNumericOtp(): string {
        return crypto.randomInt(100000, 999999).toString();
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
     * Verify an OTP with timing-safe comparison and brute-force protection
     */
    async verifyOtp(
        email: string,
        submittedOtp: string,
        purpose: OtpPurpose
    ): Promise<boolean> {
        const record = await Otp.findOne({
            where: {
                email,
                purpose,
                is_used: false,
                expires_at: {
                    [Op.gt]: new Date()
                }
            },
            order: [['created_at', 'DESC']]
        });

        if (!record) {
            // Constant time dummy comparison even if no record found
            // Use a dummy 6-digit string
            crypto.timingSafeEqual(Buffer.from('000000'), Buffer.from(submittedOtp.padEnd(6).substring(0, 6)));
            return false;
        }

        // Increment attempt count
        record.attempt_count += 1;
        
        // Timing-safe comparison
        // Note: Buffer.from requires same lengths for timingSafeEqual
        const recordOtpBuf = Buffer.from(record.otp);
        const submittedOtpBuf = Buffer.from(submittedOtp.padEnd(record.otp.length).substring(0, record.otp.length));
        
        const isMatch = crypto.timingSafeEqual(recordOtpBuf, submittedOtpBuf);

        if (isMatch) {
            record.is_used = true;
            await record.save();
            return true;
        }

        // If no match, check if we should burn the OTP
        if (record.attempt_count >= record.max_attempts) {
            record.is_used = true;
            logger.warn('OTP burned due to max attempts reached', { email, purpose });
        }

        await record.save();
        return false;
    }

    /**
     * Cleanup expired or used OTPs
     */
    async cleanup(): Promise<number> {
        const deleted = await Otp.destroy({
            where: {
                [Op.or]: [
                    { is_used: true },
                    { expires_at: { [Op.lt]: new Date() } }
                ]
            }
        });
        logger.info('OTP cleanup completed', { deletedCount: deleted });
        return deleted;
    }


    async verifyOtpWithReason(
        email: string,
        submittedOtp: string,
        purpose: OtpPurpose
        ): Promise<{ valid: boolean; reason?: 'expired' | 'invalid' | 'max_attempts' }> {
        
        // First check if an expired record exists
        const expiredRecord = await Otp.findOne({
            where: { email, purpose, is_used: false, expires_at: { [Op.lte]: new Date() } },
            order: [['created_at', 'DESC']]
        });

        // Check for a valid (non-expired) record
        const record = await Otp.findOne({
            where: { email, purpose, is_used: false, expires_at: { [Op.gt]: new Date() } },
            order: [['created_at', 'DESC']]
        });

        if (!record) {
            crypto.timingSafeEqual(Buffer.from('000000'), Buffer.from(submittedOtp.padEnd(6).substring(0, 6)));
            return { valid: false, reason: expiredRecord ? 'expired' : 'invalid' };
        }

        record.attempt_count += 1;

        const recordOtpBuf = Buffer.from(record.otp);
        const submittedOtpBuf = Buffer.from(submittedOtp.padEnd(record.otp.length).substring(0, record.otp.length));
        const isMatch = crypto.timingSafeEqual(recordOtpBuf, submittedOtpBuf);

        if (isMatch) {
            record.is_used = true;
            await record.save();
            return { valid: true };
        }

        if (record.attempt_count >= record.max_attempts) {
            record.is_used = true;
            logger.warn('OTP burned due to max attempts reached', { email, purpose });
            await record.save();
            return { valid: false, reason: 'max_attempts' };
        }

        await record.save();
        return { valid: false, reason: 'invalid' };
    }
}

export const otpService = new OtpService();
