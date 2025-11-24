import Notification, {
  NotificationType,
  NotificationPriority,
} from '../models/Notification.model';
import User, { UserRole } from '../models/User.model';
import { logger } from '../utils/logger.util';
import { AppError, ErrorCode } from '../utils/error.util';

/**
 * Notification creation options
 */
export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
}

/**
 * Bulk notification options
 */
export interface CreateBulkNotificationOptions {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
}

/**
 * Notification service class
 */
class NotificationService {
  /**
   * Create a notification for a single user
   */
  async createNotification(
    options: CreateNotificationOptions
  ): Promise<Notification> {
    try {
      // Verify user exists
      const user = await User.findByPk(options.userId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      const notification = await Notification.create({
        user_id: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        priority: options.priority || NotificationPriority.MEDIUM,
        action_url: options.actionUrl,
        is_read: false,
      });

      logger.info('Notification created', {
        notificationId: notification.id,
        userId: options.userId,
        type: options.type,
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', error as Error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(
    options: CreateBulkNotificationOptions
  ): Promise<Notification[]> {
    try {
      const notifications = await Promise.all(
        options.userIds.map((userId) =>
          Notification.create({
            user_id: userId,
            type: options.type,
            title: options.title,
            message: options.message,
            priority: options.priority || NotificationPriority.MEDIUM,
            action_url: options.actionUrl,
            is_read: false,
          })
        )
      );

      logger.info('Bulk notifications created', {
        count: notifications.length,
        type: options.type,
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to create bulk notifications', error as Error);
      throw error;
    }
  }

  /**
   * Create notification for all users
   */
  async createNotificationForAllUsers(
    type: NotificationType,
    title: string,
    message: string,
    priority?: NotificationPriority,
    actionUrl?: string
  ): Promise<Notification[]> {
    try {
      const users = await User.findAll({
        where: { is_active: true },
        attributes: ['id'],
      });

      const userIds = users.map((user) => user.id);

      return this.createBulkNotifications({
        userIds,
        type,
        title,
        message,
        priority,
        actionUrl,
      });
    } catch (error) {
      logger.error('Failed to create notifications for all users', error as Error);
      throw error;
    }
  }

  /**
   * Create notification for users by role
   */
  async createNotificationForRole(
    role: UserRole,
    type: NotificationType,
    title: string,
    message: string,
    priority?: NotificationPriority,
    actionUrl?: string
  ): Promise<Notification[]> {
    try {
      const users = await User.findAll({
        where: {
          role,
          is_active: true,
        },
        attributes: ['id'],
      });

      const userIds = users.map((user) => user.id);

      if (userIds.length === 0) {
        logger.warn(`No active users found for role: ${role}`);
        return [];
      }

      return this.createBulkNotifications({
        userIds,
        type,
        title,
        message,
        priority,
        actionUrl,
      });
    } catch (error) {
      logger.error('Failed to create notifications for role', error as Error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await Notification.findOne({
        where: {
          id: notificationId,
          user_id: userId,
        },
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, ErrorCode.NOT_FOUND);
      }

      notification.is_read = true;
      await notification.save();

      return notification;
    } catch (error) {
      logger.error('Failed to mark notification as read', error as Error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const [count] = await Notification.update(
        { is_read: true },
        {
          where: {
            user_id: userId,
            is_read: false,
          },
        }
      );

      logger.info('Marked all notifications as read', {
        userId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error as Error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const where: any = { user_id: userId };

      if (options.unreadOnly) {
        where.is_read = false;
      }

      if (options.type) {
        where.type = options.type;
      }

      const { count, rows } = await Notification.findAndCountAll({
        where,
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: [['created_at', 'DESC']],
      });

      return {
        notifications: rows,
        total: count,
      };
    } catch (error) {
      logger.error('Failed to get user notifications', error as Error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      const count = await Notification.destroy({
        where: {
          id: notificationId,
          user_id: userId,
        },
      });

      if (count === 0) {
        throw new AppError('Notification not found', 404, ErrorCode.NOT_FOUND);
      }

      logger.info('Notification deleted', {
        notificationId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete notification', error as Error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });
    } catch (error) {
      logger.error('Failed to get unread count', error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

/**
 * Convenience functions
 */

/**
 * Create notification for a single user
 */
export const createNotification = async (
  options: CreateNotificationOptions
): Promise<Notification> => {
  return notificationService.createNotification(options);
};

/**
 * Create notifications for multiple users
 */
export const createBulkNotifications = async (
  options: CreateBulkNotificationOptions
): Promise<Notification[]> => {
  return notificationService.createBulkNotifications(options);
};

/**
 * Create notification for all users
 */
export const notifyAllUsers = async (
  type: NotificationType,
  title: string,
  message: string,
  priority?: NotificationPriority,
  actionUrl?: string
): Promise<Notification[]> => {
  return notificationService.createNotificationForAllUsers(
    type,
    title,
    message,
    priority,
    actionUrl
  );
};

/**
 * Create notification for users by role
 */
export const notifyRole = async (
  role: UserRole,
  type: NotificationType,
  title: string,
  message: string,
  priority?: NotificationPriority,
  actionUrl?: string
): Promise<Notification[]> => {
  return notificationService.createNotificationForRole(
    role,
    type,
    title,
    message,
    priority,
    actionUrl
  );
};

/**
 * Pre-built notification helpers
 */

/**
 * Notify user about walk reminder
 */
export const notifyWalkReminder = async (
  userId: string,
  walkDate: string,
  walkTime: string,
  actionUrl?: string
): Promise<Notification> => {
  return createNotification({
    userId,
    type: NotificationType.WALK_REMINDER,
    title: 'Walk Reminder',
    message: `You have a walk scheduled on ${walkDate} at ${walkTime}`,
    priority: NotificationPriority.HIGH,
    actionUrl,
  });
};

/**
 * Notify user about walk request
 */
export const notifyWalkRequest = async (
  userId: string,
  requesterName: string,
  actionUrl?: string
): Promise<Notification> => {
  return createNotification({
    userId,
    type: NotificationType.WALK_REQUEST,
    title: 'New Walk Request',
    message: `${requesterName} has requested a walk session`,
    priority: NotificationPriority.HIGH,
    actionUrl,
  });
};

/**
 * Notify user about cancelled walk
 */
export const notifyWalkCancelled = async (
  userId: string,
  reason: string,
  actionUrl?: string
): Promise<Notification> => {
  return createNotification({
    userId,
    type: NotificationType.WALK_CANCELLED,
    title: 'Walk Cancelled',
    message: `Your walk has been cancelled. Reason: ${reason}`,
    priority: NotificationPriority.MEDIUM,
    actionUrl,
  });
};

/**
 * Notify user about payment
 */
export const notifyPayment = async (
  userId: string,
  amount: number,
  status: string,
  actionUrl?: string
): Promise<Notification> => {
  return createNotification({
    userId,
    type: NotificationType.PAYMENT,
    title: 'Payment Notification',
    message: `Your payment of $${amount} has been ${status}`,
    priority: NotificationPriority.MEDIUM,
    actionUrl,
  });
};

/**
 * Notify user with system message
 */
export const notifySystem = async (
  userId: string,
  title: string,
  message: string,
  priority: NotificationPriority = NotificationPriority.MEDIUM,
  actionUrl?: string
): Promise<Notification> => {
  return createNotification({
    userId,
    type: NotificationType.SYSTEM,
    title,
    message,
    priority,
    actionUrl,
  });
};

