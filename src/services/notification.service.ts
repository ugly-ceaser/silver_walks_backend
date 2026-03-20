import Notification, {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../models/Notification.model';
import User, { UserRole } from '../models/User.model';
import NurseProfile from '../models/NurseProfile.model';
import ElderlyProfile from '../models/ElderlyProfile.model';
import { logger } from '../utils/logger.util';
import { AppError, ErrorCode } from '../utils/error.util';
import { EmailProvider } from './notifications/providers/email.provider';
import { SMSProvider } from './notifications/providers/sms.provider';
import { PushProvider } from './notifications/providers/push.provider';
import { INotificationProvider } from './notifications/types';
import appEvents from '../utils/event-emitter.util';
import { EVENTS } from '../constants';

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
  channels?: NotificationChannel[];
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
  private providers: Map<NotificationChannel, INotificationProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set(NotificationChannel.EMAIL, new EmailProvider());
    this.providers.set(NotificationChannel.SMS, new SMSProvider());
    this.providers.set(NotificationChannel.PUSH, new PushProvider());
  }

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
        channel: NotificationChannel.IN_APP, // Always create in-app record
        action_url: options.actionUrl,
        is_read: false,
      });

      logger.info('In-app notification created', {
        notificationId: notification.id,
        userId: options.userId,
      });

      // Handle external channels
      const channels = options.channels || [];
      if (channels.length > 0) {
        await this.sendToExternalChannels(user, options);
      }

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
            channel: NotificationChannel.IN_APP,
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

  /**
   * Internal helper to route notifications to external providers
   */
  private async sendToExternalChannels(user: User, options: CreateNotificationOptions): Promise<void> {
    const channels = options.channels || [];
    
    for (const channel of channels) {
      if (channel === NotificationChannel.IN_APP) continue;

      const provider = this.providers.get(channel);
      if (!provider) {
        logger.warn(`No provider found for channel: ${channel}`);
        continue;
      }

      try {
        let recipient: string | undefined;

        if (channel === NotificationChannel.EMAIL) {
          recipient = user.email;
        } else if (channel === NotificationChannel.SMS || channel === NotificationChannel.PUSH) {
          // Fetch phone/token from specific profile
          if (user.role === UserRole.NURSE) {
            const profile = await NurseProfile.findOne({ where: { user_id: user.id } });
            recipient = channel === NotificationChannel.SMS ? profile?.phone : profile?.device_token;
          } else if (user.role === UserRole.ELDERLY) {
            const profile = await ElderlyProfile.findOne({ where: { user_id: user.id } });
            recipient = channel === NotificationChannel.SMS ? profile?.phone : profile?.device_token;
          }
        }

        if (!recipient) {
          logger.warn(`Could not find recipient identifier for channel ${channel}`, { userId: user.id });
          continue;
        }

        await provider.send(recipient, options.title, options.message);
        
        // Log individual channel success as separate records if needed, 
        // but typically one DB record (IN_APP) is enough for history, 
        // external ones are "sent" events.
        
        logger.info(`Notification sent via ${channel}`, { userId: user.id });
      } catch (err) {
        logger.error(`Failed to send notification via ${channel}`, err as Error);
        // We don't throw here to avoid failing the whole request if one channel fails
      }
    }
  }

  /**
   * Internal helper to send directly to a recipient string via a channel
   */
  public async sendDirect(channel: NotificationChannel, recipient: string, title: string, message: string, metadata?: any): Promise<void> {
    const provider = this.providers.get(channel);
    if (!provider) {
        logger.warn(`No provider found for channel: ${channel}`);
        return;
    }
    
    try {
        await provider.send(recipient, title, message, metadata);
        logger.info(`Direct notification sent via ${channel}`, { recipient });
    } catch (err) {
        logger.error(`Failed to send direct notification via ${channel}`, err as Error);
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
  return notificationService.createNotification({
    userId,
    type: NotificationType.SYSTEM,
    title,
    message,
    priority,
    actionUrl,
  });
};

/**
 * Event Listeners
 */

// Listen for completed walks to notify the elderly user
appEvents.on(EVENTS.WALK_COMPLETED, async (payload) => {
  try {
    const message = `Your walk session with Nurse ${payload.nurseId} is complete. You walked ${payload.distanceMeters} meters!`;
    
    if (payload.elderlyUserId) {
      await createNotification({
        userId: payload.elderlyUserId,
        type: NotificationType.SYSTEM,
        title: 'Walk Completed',
        message: message,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH]
      });
    }
    
    logger.info(`Automated notification sent for ${EVENTS.WALK_COMPLETED}`, { sessionId: payload.sessionId });
  } catch (error) {
    logger.error(`Error in ${EVENTS.WALK_COMPLETED} listener`, error as Error);
  }
});

// Listen for cancelled walks
appEvents.on(EVENTS.WALK_CANCELLED, async (payload) => {
  try {
    await notifyWalkCancelled(
      payload.userId,
      payload.reason,
      payload.actionUrl
    );
  } catch (error) {
    logger.error(`Error in ${EVENTS.WALK_CANCELLED} listener`, error as Error);
  }
});

