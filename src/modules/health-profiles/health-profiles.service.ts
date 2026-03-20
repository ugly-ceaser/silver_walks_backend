import { healthProfileRepository } from './health-profiles.repository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/error.util';
import HealthProfile from '../../models/HealthProfile.model';
import WalkSession, { WalkSessionStatus } from '../../models/WalkSession.model';
import { Op } from 'sequelize';

/**
 * Health Profile Service
 */
export const healthProfileService = {
    /**
     * Get full profile for owner
     */
    async getByElderlyId(elderlyId: string): Promise<HealthProfile> {
        const profile = await healthProfileRepository.findByElderlyId(elderlyId);
        if (!profile) throw new NotFoundError('Health profile not found');
        return profile;
    },

    /**
     * Full upsert with limit validation
     */
    async createOrUpdate(elderlyId: string, data: any): Promise<HealthProfile> {
        // Validate limits
        if (data.medical_conditions && data.medical_conditions.length > 20) {
            throw new ValidationError('Maximum 20 medical conditions allowed');
        }
        if (data.medications && data.medications.length > 30) {
            throw new ValidationError('Maximum 30 medications allowed');
        }

        const [profile] = await healthProfileRepository.upsert(elderlyId, data);
        return profile;
    },

    /**
     * Patch conditions only
     */
    async patchConditions(elderlyId: string, conditions: any[]): Promise<void> {
        if (conditions.length > 20) throw new ValidationError('Maximum 20 medical conditions allowed');
        const profile = await this.getByElderlyId(elderlyId);
        await profile.update({ medical_conditions: conditions });
    },

    /**
     * Patch medications only
     */
    async patchMedications(elderlyId: string, medications: any[]): Promise<void> {
        if (medications.length > 30) throw new ValidationError('Maximum 30 medications allowed');
        const profile = await this.getByElderlyId(elderlyId);
        await profile.update({ medications });
    },

    /**
     * Exclusive narrow summary for nurses
     */
    async getSummaryForNurse(elderlyId: string, nurseId: string): Promise<Partial<HealthProfile>> {
        // Relationship check: Verify nurse has active or upcoming booking
        const hasRelationship = await WalkSession.findOne({
            where: {
                elderly_id: elderlyId,
                nurse_id: nurseId,
                status: { [Op.in]: [WalkSessionStatus.SCHEDULED, WalkSessionStatus.CONFIRMED, WalkSessionStatus.IN_PROGRESS] }
            }
        });

        if (!hasRelationship) {
            throw new ForbiddenError('You do not have an active or upcoming relationship with this user to view their health summary.');
        }

        const summary = await healthProfileRepository.findSummaryByElderlyId(elderlyId);
        if (!summary) throw new NotFoundError('Health profile summary not found');
        
        return summary;
    }
};
