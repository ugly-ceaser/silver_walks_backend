import AvailabilitySlot, { SlotStatus } from '../../../models/AvailabilitySlot.model';
import NurseProfile from '../../../models/NurseProfile.model';
import { Op } from 'sequelize';

export const SlotService = {
    /**
     * Get available slots for a date range and nurse
     */
    async getAvailableSlots(params: {
        nurseId?: string;
        startDate: string;
        endDate: string;
        minDuration?: number;
    }): Promise<AvailabilitySlot[]> {
        const where: any = {
            status: SlotStatus.OPEN,
            date: {
                [Op.between]: [params.startDate, params.endDate]
            }
        };

        if (params.nurseId) {
            where.nurse_id = params.nurseId;
        }

        if (params.minDuration) {
            where.duration_mins = { [Op.gte]: params.minDuration };
        }

        return await AvailabilitySlot.findAll({
            where,
            include: [{ model: NurseProfile, as: 'nurse' }],
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });
    },

    /**
     * Get a single slot by ID
     */
    async getSlotById(slotId: string): Promise<AvailabilitySlot | null> {
        return await AvailabilitySlot.findByPk(slotId);
    }
};
