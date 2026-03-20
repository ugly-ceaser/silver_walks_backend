import { INotificationProvider } from "../types";
import { logger } from "../../../utils/logger.util";

/**
 * SMSProvider (STUB)
 * Currently logs to console. Integrate with Twilio/Termii here.
 */
export class SMSProvider implements INotificationProvider {
    async send(recipient: string, title: string, body: string, metadata?: any): Promise<any> {
        logger.info('SMS Notification (STUB)', { recipient, title, body, metadata });
        return { success: true, provider: 'stub-sms' };
    }
}
