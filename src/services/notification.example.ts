/**
 * EXAMPLE USAGE OF NOTIFICATION SERVICE
 * 
 * This file shows how to use the notification service and middleware.
 * Delete this file after reviewing the examples.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createNotification,
  createBulkNotifications,
  notifyAllUsers,
  notifyRole,
  notifyWalkReminder,
  notifyWalkRequest,
  notifyPayment,
  notificationService,
} from './notification.service';
import {
  notifyOnOperation,
  notifyUserOnSuccess,
  notifyTargetUser,
  notifyAllOnOperation,
  notifyRoleOnOperation,
} from '../middlewares/notification.middleware';
import { NotificationType, NotificationPriority } from '../models/Notification.model';
import { UserRole } from '../models/User.model';
import { asyncHandler } from '../utils/error.util';

const router = Router();

/**
 * Example 1: Use notification service directly in a controller
 */
router.post(
  '/create-walk',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // ... create walk logic ...

    // Send notification to user
    await createNotification({
      userId: req.user!.userId,
      type: NotificationType.WALK_REQUEST,
      title: 'Walk Created',
      message: 'Your walk session has been created successfully',
      priority: NotificationPriority.HIGH,
      actionUrl: `/walks/${walkId}`,
    });

    res.json({ success: true, walkId });
  })
);

/**
 * Example 2: Use notification middleware (automatic notification)
 */
router.post(
  '/update-profile',
  authenticate,
  notifyUserOnSuccess(
    NotificationType.SYSTEM,
    'Profile Updated',
    'Your profile has been updated successfully',
    NotificationPriority.MEDIUM,
    '/profile'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    // ... update profile logic ...
    // Notification will be sent automatically on success
    res.json({ success: true });
  })
);

/**
 * Example 3: Notify specific user (from request params)
 */
router.post(
  '/assign-nurse/:nurseId',
  authenticate,
  notifyTargetUser(
    NotificationType.SYSTEM,
    (req) => req.params.nurseId, // Target user ID
    'Nurse Assignment',
    (req) => `You have been assigned to ${req.body.elderlyName}`,
    NotificationPriority.HIGH
  ),
  asyncHandler(async (req: Request, res: Response) => {
    // ... assign nurse logic ...
    res.json({ success: true });
  })
);

/**
 * Example 4: Notify all users
 */
router.post(
  '/system-maintenance',
  authenticate,
  notifyAllOnOperation(
    NotificationType.SYSTEM,
    'System Maintenance',
    'The system will be under maintenance from 2 AM to 4 AM',
    NotificationPriority.HIGH
  ),
  asyncHandler(async (req: Request, res: Response) => {
    // ... maintenance logic ...
    res.json({ success: true });
  })
);

/**
 * Example 5: Notify specific role
 */
router.post(
  '/new-policy',
  authenticate,
  notifyRoleOnOperation(
    NotificationType.SYSTEM,
    UserRole.NURSE,
    'New Policy',
    'A new policy has been published. Please review it.',
    NotificationPriority.MEDIUM,
    '/policies'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    // ... policy creation logic ...
    res.json({ success: true });
  })
);

/**
 * Example 6: Custom notification middleware
 */
router.post(
  '/approve-walk/:walkId',
  authenticate,
  notifyOnOperation({
    type: NotificationType.WALK_REQUEST,
    title: (req) => `Walk Approved`,
    message: (req) => `Your walk request for ${req.body.date} has been approved`,
    priority: NotificationPriority.HIGH,
    actionUrl: (req) => `/walks/${req.params.walkId}`,
    targetUserId: (req) => req.body.elderlyId, // Notify the elderly user
    onSuccess: true,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    // ... approve walk logic ...
    res.json({ success: true });
  })
);

/**
 * Example 7: Use pre-built notification helpers
 */
router.post(
  '/schedule-walk',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, date, time } = req.body;

    // Use pre-built helper
    await notifyWalkReminder(
      userId,
      date,
      time,
      `/walks/${walkId}`
    );

    res.json({ success: true });
  })
);

/**
 * Example 8: Bulk notifications
 */
router.post(
  '/announcement',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { userIds, message } = req.body;

    await createBulkNotifications({
      userIds,
      type: NotificationType.SYSTEM,
      title: 'Announcement',
      message,
      priority: NotificationPriority.MEDIUM,
    });

    res.json({ success: true });
  })
);

/**
 * Example 9: Notify all users programmatically
 */
router.post(
  '/broadcast',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { title, message } = req.body;

    await notifyAllUsers(
      NotificationType.SYSTEM,
      title,
      message,
      NotificationPriority.MEDIUM
    );

    res.json({ success: true });
  })
);

/**
 * Example 10: Notify role programmatically
 */
router.post(
  '/nurse-update',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await notifyRole(
      UserRole.NURSE,
      NotificationType.SYSTEM,
      'Important Update',
      'Please check your profile for important updates',
      NotificationPriority.HIGH
    );

    res.json({ success: true });
  })
);

/**
 * Example 11: Get user notifications
 */
router.get(
  '/notifications',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, offset = 0, unreadOnly, type } = req.query;

    const result = await notificationService.getUserNotifications(
      req.user!.userId,
      {
        limit: Number(limit),
        offset: Number(offset),
        unreadOnly: unreadOnly === 'true',
        type: type as NotificationType,
      }
    );

    res.json({
      success: true,
      data: result.notifications,
      total: result.total,
    });
  })
);

/**
 * Example 12: Mark notification as read
 */
router.patch(
  '/notifications/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAsRead(
      req.params.id,
      req.user!.userId
    );

    res.json({ success: true });
  })
);

/**
 * Example 13: Mark all as read
 */
router.patch(
  '/notifications/read-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.markAllAsRead(req.user!.userId);

    res.json({ success: true, count });
  })
);

/**
 * Example 14: Get unread count
 */
router.get(
  '/notifications/unread-count',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.userId);

    res.json({ success: true, count });
  })
);

export default router;

