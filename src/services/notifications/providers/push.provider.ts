import { INotificationProvider } from "../types";
import { logger } from "../../../utils/logger.util";

/**
 * PushProvider (STUB)
 * Currently logs to console. Integrate with FCM/OneSignal here.
 */
export class PushProvider implements INotificationProvider {
    async send(recipient: string, title: string, body: string, metadata?: any): Promise<any> {
        if (!recipient) {
            logger.warn('Push Notification skipped: No device token provided');
            return { success: false, reason: 'no_token' };
        }
        
        logger.info('Push Notification (STUB)', { recipient, title, body, metadata });
        return { success: true, provider: 'stub-push' };
    }
}
