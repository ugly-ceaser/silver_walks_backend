import HealthProfile from '../../models/HealthProfile.model';
import { Op } from 'sequelize';

/**
 * Health Profile Repository
 */
export const healthProfileRepository = {
    /**
     * Find health profile by elderly ID
     */
    async findByElderlyId(elderlyId: string): Promise<HealthProfile | null> {
        return HealthProfile.findOne({
            where: { elderly_id: elderlyId }
        });
    },

    /**
     * Upsert health profile
     */
    async upsert(elderlyId: string, data: any): Promise<[HealthProfile, boolean | null]> {
        const [profile, created] = await HealthProfile.findOrCreate({
            where: { elderly_id: elderlyId },
            defaults: { ...data, elderly_id: elderlyId }
        });

        if (!created) {
            await profile.update(data);
        }

        return [profile, created];
    },

    /**
     * Narrow query for nurse-facing summary
     * Returns ONLY mobility_level and allergies
     */
    async findSummaryByElderlyId(elderlyId: string): Promise<Partial<HealthProfile> | null> {
        return HealthProfile.findOne({
            where: { elderly_id: elderlyId },
            attributes: ['mobility_level', 'allergies']
        });
    }
};
