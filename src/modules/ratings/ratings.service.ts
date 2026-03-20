import { ratingsRepository } from './ratings.repository';
import { sequelize } from '../../config/database.config';
import { NotFoundError, ValidationError } from '../../utils/error.util';
import NurseProfile from '../../models/NurseProfile.model';
import appEvents from '../../utils/event-emitter.util';
import { EVENTS } from '../../constants';
import { logger } from '../../utils/logger.util';
import { notificationService } from '../../services/notification.service';
import { NotificationType, NotificationPriority, NotificationChannel } from '../../models/Notification.model';

export class RatingsService {
    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Automatically create pending rating when walk is completed
        appEvents.on(EVENTS.WALK_COMPLETED, async (payload) => {
            try {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24h

                await ratingsRepository.createPendingRating({
                    walk_session_id: payload.sessionId,
                    elderly_id: payload.elderlyId,
                    nurse_id: payload.nurseId,
                    expires_at: expiresAt
                });

                // Notify elderly to rate the walk
                if (payload.elderlyUserId) {
                    await notificationService.createNotification({
                        userId: payload.elderlyUserId,
                        type: NotificationType.SYSTEM,
                        title: 'Rate Your Walk',
                        message: 'Please take a moment to rate your recent walk session.',
                        priority: NotificationPriority.MEDIUM,
                    });
                }

                logger.info('Pending rating created for completed walk', { sessionId: payload.sessionId });
            } catch (error) {
                logger.error('Failed to create pending rating', error as Error);
            }
        });
    }

    /**
     * Submit a rating
     */
    async submitRating(elderlyId: string, walkSessionId: string, ratingValue: number, comment?: string) {
        const pending = await ratingsRepository.findPendingByWalk(walkSessionId);
        if (!pending || pending.elderly_id !== elderlyId) {
            throw new ValidationError('No pending rating found for this walk session');
        }

        const t = await sequelize.transaction();
        try {
            // 1. Create rating
            const rating = await ratingsRepository.createRating({
                walk_session_id: walkSessionId,
                elderly_id: elderlyId,
                nurse_id: pending.nurse_id,
                rating: ratingValue,
                comment
            }, t);

            // 2. Delete pending
            await ratingsRepository.deletePending(pending.id, t);

            // 3. Update nurse average rating
            const { avg } = await ratingsRepository.getNurseRatingStats(pending.nurse_id);
            // Since we are inside transaction, stats might not include NEW rating yet? 
            // Better to calculate after commit or use raw query in transaction.
            // Actually, we'll do it after commit for simplicity or use the new avg.
            
            await t.commit();
            
            // Re-fetch stats after commit to get new average
            const stats = await ratingsRepository.getNurseRatingStats(pending.nurse_id);
            await NurseProfile.update(
                { rating: stats.avg },
                { where: { id: pending.nurse_id } }
            );

            return rating;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Check if user has active pending ratings
     */
    async hasActivePendingRatings(elderlyId: string): Promise<boolean> {
        const pending = await ratingsRepository.findAllPendingByElderly(elderlyId);
        return pending.length > 0;
    }
}

export const ratingsService = new RatingsService();
