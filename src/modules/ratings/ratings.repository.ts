import Rating from '../../models/Rating.model';
import PendingRating from '../../models/PendingRating.model';
import { Transaction } from 'sequelize';

export class RatingsRepository {
    /**
     * Create a rating
     */
    async createRating(data: any, transaction?: Transaction): Promise<Rating> {
        return Rating.create(data, { transaction });
    }

    /**
     * Create a pending rating
     */
    async createPendingRating(data: any): Promise<PendingRating> {
        return PendingRating.create(data);
    }

    /**
     * Find pending rating for walk session
     */
    async findPendingByWalk(walkSessionId: string): Promise<PendingRating | null> {
        return PendingRating.findOne({ where: { walk_session_id: walkSessionId } });
    }

    /**
     * Find all pending ratings for elderly
     */
    async findAllPendingByElderly(elderlyId: string): Promise<PendingRating[]> {
        return PendingRating.findAll({ where: { elderly_id: elderlyId, is_expired: false } });
    }

    /**
     * Delete pending rating
     */
    async deletePending(id: string, transaction?: Transaction): Promise<number> {
        return PendingRating.destroy({ where: { id }, transaction });
    }

    /**
     * Get nurse average rating and count
     */
    async getNurseRatingStats(nurseId: string): Promise<{ avg: number, count: number }> {
        const result = await Rating.findOne({
            where: { nurse_id: nurseId },
            attributes: [
                [Rating.sequelize!.fn('AVG', Rating.sequelize!.col('rating')), 'avg'],
                [Rating.sequelize!.fn('COUNT', Rating.sequelize!.col('id')), 'count']
            ],
            raw: true
        }) as any;

        return {
            avg: parseFloat(result?.avg || 0),
            count: parseInt(result?.count || 0)
        };
    }
}

export const ratingsRepository = new RatingsRepository();
