import { initSlotExpiryJob } from './slot-expiry.job';
import { initOtpCleanupJob } from './otp-cleanup.job';
import { logger } from '../utils/logger.util';

/**
 * Initialize all background jobs
 */
export const initJobs = () => {
    logger.info('Initializing background jobs...');

    initSlotExpiryJob();
    initOtpCleanupJob();
    
    // Start Ratings Expiry Job
    import('./ratings-expiry.job').then(m => m.ratingsExpiryJob.start());
    
    logger.info('All background jobs initialized');
};
