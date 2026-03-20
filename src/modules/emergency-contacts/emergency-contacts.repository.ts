import EmergencyContact from '../../models/EmergencyContact.model';
import { Op, Transaction } from 'sequelize';

/**
 * Emergency Contact Repository
 */
export const emergencyContactRepository = {
    /**
     * Get all contacts for an elderly user
     */
    async findAllByElderlyId(elderlyId: string): Promise<EmergencyContact[]> {
        return EmergencyContact.findAll({
            where: { elderly_id: elderlyId },
            order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
        });
    },

    /**
     * Create contact
     */
    async create(data: any, transaction?: Transaction): Promise<EmergencyContact> {
        return EmergencyContact.create(data, { transaction });
    },

    /**
     * Update contact by ID and elderly ID
     */
    async update(id: string, elderlyId: string, data: any, transaction?: Transaction): Promise<[number]> {
        return EmergencyContact.update(data, {
            where: { id, elderly_id: elderlyId },
            transaction
        });
    },

    /**
     * Delete contact by ID and elderly ID
     */
    async delete(id: string, elderlyId: string, transaction?: Transaction): Promise<number> {
        return EmergencyContact.destroy({
            where: { id, elderly_id: elderlyId },
            transaction
        });
    },

    /**
     * Count contacts for an elderly user
     */
    async countByElderlyId(elderlyId: string): Promise<number> {
        return EmergencyContact.count({
            where: { elderly_id: elderlyId }
        });
    },

    /**
     * Specialized query for alerts (Sprint 3)
     */
    async getContactsForAlert(elderlyId: string): Promise<EmergencyContact[]> {
        return EmergencyContact.findAll({
            where: { elderly_id: elderlyId },
            order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
        });
    },

    /**
     * Unset all primary contacts for an elderly user
     */
    async unsetPrimaryForElderly(elderlyId: string, transaction?: Transaction): Promise<void> {
        await EmergencyContact.update(
            { is_primary: false },
            { 
                where: { elderly_id: elderlyId, is_primary: true },
                transaction 
            }
        );
    }
};
