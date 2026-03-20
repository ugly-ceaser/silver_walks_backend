import cron from 'node-cron';
import { Op } from 'sequelize';
import AvailabilitySlot, { SlotStatus } from '../models/AvailabilitySlot.model';
import { logger } from '../utils/logger.util';
import { format } from 'date-fns';

/**
 * Job to expire past-due OPEN slots
 * Runs every 15 minutes
 */
export const initSlotExpiryJob = () => {
    // cron.schedule('*/15 * * * *', async () => {
    cron.schedule('*/15 * * * *', async () => {
        logger.info('Running slot expiry job...');

        try {
            const now = new Date();
            const currentDate = format(now, 'yyyy-MM-dd');
            const currentTime = format(now, 'HH:mm:ss');

            const [affectedRows] = await AvailabilitySlot.update(
                { status: SlotStatus.EXPIRED },
                {
                    where: {
                        status: SlotStatus.OPEN,
                        [Op.or]: [
                            { date: { [Op.lt]: currentDate } },
                            {
                                [Op.and]: [
                                    { date: currentDate },
                                    { start_time: { [Op.lt]: currentTime } }
                                ]
                            }
                        ]
                    }
                }
            );

            if (affectedRows > 0) {
                logger.info(`Expired ${affectedRows} past-due slots.`);
            } else {
                logger.info('No past-due slots to expire.');
            }
        } catch (error) {
            logger.error('Error in slot expiry job:', error as Error);
        }
    });

    logger.info('Slot expiry job scheduled (every 15 minutes)');
};
