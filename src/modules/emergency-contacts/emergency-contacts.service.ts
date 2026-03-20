import { emergencyContactRepository } from './emergency-contacts.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/error.util';
import { MAX_EMERGENCY_CONTACTS } from '../../constants';
import { sequelize } from '../../config/database.config';
import EmergencyContact from '../../models/EmergencyContact.model';

/**
 * Emergency Contact Service
 */
export const emergencyContactService = {
    /**
     * List all contacts
     */
    async getAll(elderlyId: string): Promise<EmergencyContact[]> {
        return emergencyContactRepository.findAllByElderlyId(elderlyId);
    },

    /**
     * Create contact with limit check and primary logic
     */
    async create(elderlyId: string, data: any): Promise<EmergencyContact> {
        const count = await emergencyContactRepository.countByElderlyId(elderlyId);
        if (count >= MAX_EMERGENCY_CONTACTS) {
            throw new ValidationError(`Maximum of ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed`);
        }

        const t = await sequelize.transaction();
        try {
            if (data.is_primary) {
                await emergencyContactRepository.unsetPrimaryForElderly(elderlyId, t);
            }

            const contact = await emergencyContactRepository.create({ ...data, elderly_id: elderlyId }, t);
            await t.commit();
            return contact;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    /**
     * Update contact
     */
    async update(id: string, elderlyId: string, data: any): Promise<void> {
        const t = await sequelize.transaction();
        try {
            if (data.is_primary) {
                await emergencyContactRepository.unsetPrimaryForElderly(elderlyId, t);
            }

            const [affectedCount] = await emergencyContactRepository.update(id, elderlyId, data, t);
            if (affectedCount === 0) throw new NotFoundError('Emergency contact not found');

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    /**
     * Delete contact with primary check
     */
    async remove(id: string, elderlyId: string): Promise<void> {
        const contacts = await emergencyContactRepository.findAllByElderlyId(elderlyId);
        const contactToDelete = contacts.find(c => c.id === id);
        
        if (!contactToDelete) throw new NotFoundError('Emergency contact not found');

        if (contactToDelete.is_primary && contacts.length > 1) {
            throw new ValidationError('Cannot delete the primary contact. Please designate another contact as primary first.');
        }

        await emergencyContactRepository.delete(id, elderlyId);
    },

    /**
     * Flip primary contact
     */
    async setPrimary(id: string, elderlyId: string): Promise<void> {
        const t = await sequelize.transaction();
        try {
            await emergencyContactRepository.unsetPrimaryForElderly(elderlyId, t);
            const [affectedCount] = await emergencyContactRepository.update(id, elderlyId, { is_primary: true }, t);
            if (affectedCount === 0) throw new NotFoundError('Emergency contact not found');
            
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    /**
     * Get contacts for SOS alert dispatch
     */
    async getContactsForAlert(elderlyId: string): Promise<EmergencyContact[]> {
        const contacts = await emergencyContactRepository.findAllByElderlyId(elderlyId);
        
        // Priority: primary contact first, then others
        return contacts.sort((a, b) => {
            if (a.is_primary) return -1;
            if (b.is_primary) return 1;
            return 0;
        });
    }
};
