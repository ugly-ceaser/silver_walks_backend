import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/notifications
 * @desc Get user notifications
 */
router.get('/', notificationsController.getMyNotifications);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @route PATCH /api/v1/notifications/read-all
 * @desc Mark all notifications as read
 */
router.patch('/read-all', notificationsController.markAllAsRead);

/**
 * @route PATCH /api/v1/notifications/:id/read
 * @desc Mark single notification as read
 */
router.patch('/:id/read', notificationsController.markAsRead);

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc Delete notification
 */
router.delete('/:id', notificationsController.delete);

export default router;
