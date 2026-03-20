import cron from 'node-cron';
import { Op } from 'sequelize';
import PendingRating from '../models/PendingRating.model';
import { logger } from '../utils/logger.util';

/**
 * Job to expire old pending ratings
 * Runs every hour
 */
export const ratingsExpiryJob = cron.schedule('0 * * * *', async () => {
    logger.info('Running PendingRating expiry job...');
    
    try {
        const now = new Date();
        
        const [affectedCount] = await PendingRating.update(
            { is_expired: true },
            {
                where: {
                    expires_at: {
                        [Op.lt]: now
                    },
                    is_expired: false
                }
            }
        );

        if (affectedCount > 0) {
            logger.info(`Expired ${affectedCount} pending ratings.`);
        }
    } catch (error) {
        logger.error('Error in PendingRating expiry job:', error as Error);
    }
});
