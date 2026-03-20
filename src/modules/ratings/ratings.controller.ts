import { Request, Response, NextFunction } from 'express';
import { ratingsService } from './ratings.service';
import { successResponse } from '../../utils/response.util';

/**
 * Ratings Controller
 */
export const ratingsController = {
    /**
     * Submit a rating for a walk session
     */
    async submit(req: Request, res: Response, next: NextFunction) {
        try {
            const elderlyId = (req as any).user.profile?.id || (req as any).user.id;
            const { walkSessionId, rating, comment } = req.body;

            const result = await ratingsService.submitRating(elderlyId, walkSessionId, rating, comment);
            return successResponse(res, result, 'Rating submitted successfully');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Check if user has active gate
     */
    async checkGate(req: Request, res: Response, next: NextFunction) {
        try {
            const elderlyId = (req as any).user.profile?.id || (req as any).user.id;
            const hasPending = await ratingsService.hasActivePendingRatings(elderlyId);
            return successResponse(res, { hasPendingRating: hasPending }, 'Gate status retrieved');
        } catch (error) {
            next(error);
        }
    }
};
