import cron from 'node-cron';
import { otpService } from '../services/otp.service';
import { logger } from '../utils/logger.util';

/**
 * Job to clean up expired or used OTPs daily at 2:00 AM
 */
export const initOtpCleanupJob = () => {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('Starting daily OTP cleanup job...');
        try {
            const deletedCount = await otpService.cleanup();
            logger.info(`Daily OTP cleanup job completed. Deleted ${deletedCount} records.`);
        } catch (error) {
            logger.error('Daily OTP cleanup job failed', error as Error);
        }
    });

    logger.info('OTP cleanup job scheduled (daily at 2:00 AM)');
};
