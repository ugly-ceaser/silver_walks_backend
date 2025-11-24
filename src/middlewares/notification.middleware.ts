import { Request, Response, NextFunction } from 'express';
import {
  notificationService,
  CreateNotificationOptions,
  CreateBulkNotificationOptions,
} from '../services/notification.service';
import { NotificationType, NotificationPriority } from '../models/Notification.model';
import { logger } from '../utils/logger.util';
import '../types/express.d'; // Ensure extended Request type is available

/**
 * Configuration for notification middleware
 */
interface NotificationMiddlewareConfig {
  type: NotificationType;
  title: string | ((req: Request, res: Response) => string);
  message: string | ((req: Request, res: Response) => string);
  priority?: NotificationPriority | ((req: Request, res: Response) => NotificationPriority);
  actionUrl?: string | ((req: Request, res: Response) => string);
  targetUserId?: string | ((req: Request, res: Response) => string | string[]);
  targetRole?: string | ((req: Request, res: Response) => string);
  notifyAll?: boolean | ((req: Request, res: Response) => boolean);
  onSuccess?: boolean; // Only notify on success (default: true)
  onError?: boolean; // Notify on error (default: false)
}

/**
 * Notification middleware factory
 * Creates middleware that automatically sends notifications based on route execution
 */
export const notifyOnOperation = (config: NotificationMiddlewareConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original response methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let responseStatus = 200;

    // Override res.status to capture status code
    res.status = function (code: number): Response {
      responseStatus = code;
      return originalStatus(code);
    };

    // Override res.json to capture response and send notification
    res.json = function (body: any): Response {
      const isSuccess = responseStatus >= 200 && responseStatus < 300;
      const shouldNotify = config.onSuccess !== false ? isSuccess : !isSuccess;
      const shouldNotifyOnError = config.onError === true && !isSuccess;

      if (shouldNotify || shouldNotifyOnError) {
        // Send notification asynchronously (don't block response)
        sendNotification(req, res, config, isSuccess).catch((error) => {
          logger.error('Failed to send notification in middleware', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Helper function to send notification based on config
 */
const sendNotification = async (
  req: Request,
  res: Response,
  config: NotificationMiddlewareConfig,
  isSuccess: boolean
): Promise<void> => {
  try {
    // Resolve dynamic values
    const title = typeof config.title === 'function' 
      ? config.title(req, res) 
      : config.title;
    
    const message = typeof config.message === 'function'
      ? config.message(req, res)
      : config.message;

    const priority = typeof config.priority === 'function'
      ? config.priority(req, res)
      : (config.priority || NotificationPriority.MEDIUM);

    const actionUrl = typeof config.actionUrl === 'function'
      ? config.actionUrl(req, res)
      : config.actionUrl;

    // Determine target
    const notifyAll = typeof config.notifyAll === 'function'
      ? config.notifyAll(req, res)
      : (config.notifyAll || false);

    if (notifyAll) {
      // Notify all users
      await notificationService.createNotificationForAllUsers(
        config.type,
        title,
        message,
        priority,
        actionUrl
      );
      return;
    }

    const targetRole = typeof config.targetRole === 'function'
      ? config.targetRole(req, res)
      : config.targetRole;

    if (targetRole) {
      // Notify users by role
      await notificationService.createNotificationForRole(
        targetRole as any,
        config.type,
        title,
        message,
        priority,
        actionUrl
      );
      return;
    }

    const targetUserId = typeof config.targetUserId === 'function'
      ? config.targetUserId(req, res)
      : config.targetUserId;

    if (targetUserId) {
      const userIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
      
      if (userIds.length === 1) {
        // Single user notification
        await notificationService.createNotification({
          userId: userIds[0],
          type: config.type,
          title,
          message,
          priority,
          actionUrl,
        });
      } else {
        // Multiple users
        await notificationService.createBulkNotifications({
          userIds,
          type: config.type,
          title,
          message,
          priority,
          actionUrl,
        });
      }
      return;
    }

    // Default: notify the authenticated user
    if (req.user) {
      await notificationService.createNotification({
        userId: req.user.userId,
        type: config.type,
        title,
        message,
        priority,
        actionUrl,
      });
    }
  } catch (error) {
    logger.error('Error in notification middleware', error as Error);
    // Don't throw - notification failures shouldn't break the request
  }
};

/**
 * Pre-configured middleware: Notify user on successful operation
 */
export const notifyUserOnSuccess = (
  type: NotificationType,
  title: string,
  message: string,
  priority?: NotificationPriority,
  actionUrl?: string
) => {
  return notifyOnOperation({
    type,
    title,
    message,
    priority,
    actionUrl,
    onSuccess: true,
    onError: false,
  });
};

/**
 * Pre-configured middleware: Notify specific user on operation
 */
export const notifyTargetUser = (
  type: NotificationType,
  getTargetUserId: (req: Request, res: Response) => string,
  title: string | ((req: Request, res: Response) => string),
  message: string | ((req: Request, res: Response) => string),
  priority?: NotificationPriority,
  actionUrl?: string
) => {
  return notifyOnOperation({
    type,
    title,
    message,
    priority,
    actionUrl,
    targetUserId: getTargetUserId,
    onSuccess: true,
  });
};

/**
 * Pre-configured middleware: Notify all users on operation
 */
export const notifyAllOnOperation = (
  type: NotificationType,
  title: string,
  message: string,
  priority?: NotificationPriority,
  actionUrl?: string
) => {
  return notifyOnOperation({
    type,
    title,
    message,
    priority,
    actionUrl,
    notifyAll: true,
    onSuccess: true,
  });
};

/**
 * Pre-configured middleware: Notify role on operation
 */
export const notifyRoleOnOperation = (
  type: NotificationType,
  role: string,
  title: string,
  message: string,
  priority?: NotificationPriority,
  actionUrl?: string
) => {
  return notifyOnOperation({
    type,
    title,
    message,
    priority,
    actionUrl,
    targetRole: role,
    onSuccess: true,
  });
};

