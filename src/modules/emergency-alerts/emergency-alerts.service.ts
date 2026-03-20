import { emergencyAlertRepository } from './emergency-alerts.repository';
import { emergencyContactService } from '../emergency-contacts/emergency-contacts.service';
import { notificationService } from '../../services/notification.service';
import { NotificationType, NotificationPriority, NotificationChannel } from '../../models/Notification.model';
import { AlertStatus, AlertSeverity, AlertType } from '../../models/EmergencyAlert.model';
import { NotFoundError, ValidationError } from '../../utils/error.util';
import { logger } from '../../utils/logger.util';
import ElderlyProfile from '../../models/ElderlyProfile.model';

export class EmergencyAlertService {
    /**
     * Trigger an emergency SOS alert
     */
    async triggerAlert(elderlyId: string, data: {
        alert_type: AlertType;
        severity: AlertSeverity;
        description: string;
        location_data: any;
        walk_session_id?: string;
    }) {
        // 1. Verify elderly exists
        const elderly = await ElderlyProfile.findByPk(elderlyId);
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        // 2. Create alert record
        const alert = await emergencyAlertRepository.create({
            ...data,
            elderly_id: elderlyId,
            status: AlertStatus.ACTIVE
        });

        logger.info('Emergency alert triggered', { alertId: alert.id, elderlyId });

        // 3. Get emergency contacts
        const contacts = await emergencyContactService.getContactsForAlert(elderlyId);

        // 4. Notify contacts via multiple channels
        for (const contact of contacts) {
            const message = `EMERGENCY SOS ALERT: ${elderly.name} has triggered a ${data.alert_type} alert. Severity: ${data.severity}. Description: ${data.description}. Location: ${JSON.stringify(data.location_data)}`;
            
            // Send directly to contact identifiers
            if (contact.email) {
                await notificationService.sendDirect(NotificationChannel.EMAIL, contact.email, 'EMERGENCY SOS ALERT', message);
            }
            if (contact.phone) {
                await notificationService.sendDirect(NotificationChannel.SMS, contact.phone, 'EMERGENCY SOS ALERT', message);
            }
        }

        return alert;
    }

    /**
     * Resolve an active alert
     */
    async resolveAlert(alertId: string, resolvedBy: string) {
        const alert = await emergencyAlertRepository.findById(alertId);
        if (!alert) throw new NotFoundError('Alert not found');

        if (alert.status === AlertStatus.RESOLVED) {
            throw new ValidationError('Alert is already resolved');
        }

        await emergencyAlertRepository.update(alertId, {
            status: AlertStatus.RESOLVED,
            resolved_at: new Date(),
            resolved_by: resolvedBy
        });

        logger.info('Emergency alert resolved', { alertId, resolvedBy });
        return { success: true };
    }
}

export const emergencyAlertService = new EmergencyAlertService();
