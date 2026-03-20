import { Request, Response, NextFunction } from 'express';
import { activitiesService } from './activities.service';
import { successResponse } from '../../utils/response.util';

export const activitiesController = {
    /**
     * List upcoming activities
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const activities = await activitiesService.listUpcoming();
            return successResponse(res, activities, 'Upcoming activities retrieved');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get activity detail
     */
    async get(req: Request, res: Response, next: NextFunction) {
        try {
            const activity = await activitiesService.getDetail(req.params.id);
            return successResponse(res, activity, 'Activity details retrieved');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Join activity
     */
    async join(req: Request, res: Response, next: NextFunction) {
        try {
            const elderlyId = (req as any).user.profile?.id;
            if (!elderlyId) return res.status(403).json({ message: 'Only elderly users can join activities' });

            const participant = await activitiesService.join(req.params.id, elderlyId);
            return successResponse(res, participant, 'Successfully joined activity');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Leave activity
     */
    async leave(req: Request, res: Response, next: NextFunction) {
        try {
            const elderlyId = (req as any).user.profile?.id;
            if (!elderlyId) return res.status(403).json({ message: 'Only elderly users can leave activities' });

            await activitiesService.leave(req.params.id, elderlyId);
            return successResponse(res, null, 'Successfully left activity');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Admin: Create activity
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const activity = await activitiesService.create({ ...req.body, created_by: userId });
            return successResponse(res, activity, 'Activity created successfully', 201);
        } catch (error) {
            next(error);
        }
    }
};
