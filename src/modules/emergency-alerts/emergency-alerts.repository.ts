import EmergencyAlert, { AlertStatus } from '../../models/EmergencyAlert.model';

export class EmergencyAlertRepository {
    /**
     * Create an alert
     */
    async create(data: any): Promise<EmergencyAlert> {
        return EmergencyAlert.create(data);
    }

    /**
     * Find alert by ID
     */
    async findById(id: string): Promise<EmergencyAlert | null> {
        return EmergencyAlert.findByPk(id);
    }

    /**
     * Update an alert
     */
    async update(id: string, data: any): Promise<[number, EmergencyAlert[]]> {
        return EmergencyAlert.update(data, {
            where: { id },
            returning: true
        });
    }

    /**
     * Find active alerts for an elderly user
     */
    async findActiveByElderly(elderlyId: string): Promise<EmergencyAlert[]> {
        return EmergencyAlert.findAll({
            where: {
                elderly_id: elderlyId,
                status: AlertStatus.ACTIVE
            }
        });
    }
}

export const emergencyAlertRepository = new EmergencyAlertRepository();
