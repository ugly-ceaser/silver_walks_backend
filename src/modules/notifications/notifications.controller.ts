import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../../services/notification.service';
import { successResponse } from '../../utils/response.util';
import { NotificationType } from '../../models/Notification.model';

/**
 * Notifications Controller
 */
export const notificationsController = {
    /**
     * Get inbox for current user
     */
    async getMyNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { limit, offset, unreadOnly, type } = req.query;

            const result = await notificationService.getUserNotifications(userId, {
                limit: limit ? parseInt(limit as string) : 50,
                offset: offset ? parseInt(offset as string) : 0,
                unreadOnly: unreadOnly === 'true',
                type: type as NotificationType
            });

            return successResponse(res, result, 'Notifications retrieved');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get unread count
     */
    async getUnreadCount(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const count = await notificationService.getUnreadCount(userId);
            return successResponse(res, { unreadCount: count }, 'Unread count retrieved');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Mark single as read
     */
    async markAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            const notification = await notificationService.markAsRead(id, userId);
            return successResponse(res, notification, 'Notification marked as read');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Mark all as read
     */
    async markAllAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const count = await notificationService.markAllAsRead(userId);
            return successResponse(res, { affectedCount: count }, 'All notifications marked as read');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete notification
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            await notificationService.deleteNotification(id, userId);
            return successResponse(res, 'Notification deleted successfully');
        } catch (error) {
            next(error);
        }
    }
};
