import NurseProfile, { AvailabilityStatus, VerificationStatus } from "../../models/NurseProfile.model";
import NurseAvailability from "../../models/NurseAvailability.model";
import NurseCertification from "../../models/NurseCertification.model";
import ElderlyProfile from "../../models/ElderlyProfile.model";
import User from "../../models/User.model";
import { sequelize } from "../../config/database.config";
import { Op, Transaction } from "sequelize";

export class NursesRepository {
    /**
     * Find available nurses with optional filters
     */
    async findAvailableNurses(filters: {
        specialization?: string;
        date?: Date;
        dayOfWeek?: number;
        time?: string;
        elderlyId?: string;
    } = {}, pagination?: { limit: number; offset: number }): Promise<{ rows: NurseProfile[]; count: number }> {
        const where: any = {
            verification_status: VerificationStatus.APPROVED,
            [Op.or]: [
                { availability_status: AvailabilityStatus.AVAILABLE },
                filters.elderlyId ? {
                    availability_status: AvailabilityStatus.RESERVED,
                    id: {
                        [Op.in]: sequelize.literal(`(SELECT assigned_nurse_id FROM elderly_profiles WHERE id = '${filters.elderlyId}')`)
                    }
                } : {}
            ]
        };

        if (filters.specialization) {
            where.specializations = {
                [Op.contains]: [filters.specialization]
            };
        }

        const include: any[] = [
            {
                model: NurseAvailability,
                as: 'availability',
                required: false
            }
        ];

        // If date/time/dayOfWeek are provided, we should ideally filter by availability
        if (filters.dayOfWeek !== undefined || filters.date) {
            include[0].required = true;
            include[0].where = {
                [Op.or]: [
                    { day_of_week: filters.dayOfWeek, is_recurring: true },
                    filters.date ? { specific_date: filters.date } : {}
                ]
            };

            if (filters.time) {
                include[0].where.start_time = { [Op.lte]: filters.time };
                include[0].where.end_time = { [Op.gte]: filters.time };
            }
        }

        return NurseProfile.findAndCountAll({
            where,
            include,
            order: [['rating', 'DESC']],
            limit: pagination?.limit,
            offset: pagination?.offset,
            distinct: true // Required when including one-to-many associations with count
        });
    }

    /**
     * Find Nurse by ID
     */
    async findNurseById(id: string): Promise<NurseProfile | null> {
        return NurseProfile.findByPk(id, {
            include: [
                { model: NurseAvailability, as: 'availability' },
                { model: NurseCertification, as: 'certifications_list' },
                { model: User, as: 'user' }
            ]
        });
    }

    /**
     * Find Nurse by User ID
     */
    async findNurseByUserId(userId: string): Promise<NurseProfile | null> {
        return NurseProfile.findOne({
            where: { user_id: userId },
            include: [
                { model: NurseAvailability, as: 'availability' },
                { model: NurseCertification, as: 'certifications_list' },
                { model: User, as: 'user' }
            ]
        });
    }

    /**
     * Update Nurse Profile
     */
    async updateProfile(nurseId: string, data: any, t?: Transaction): Promise<[number, NurseProfile[]]> {
        return NurseProfile.update(data, {
            where: { id: nurseId },
            returning: true,
            transaction: t
        });
    }

    /**
     * Update Nurse Availability
     */
    async updateAvailability(nurseId: string, slots: any[], t?: Transaction): Promise<void> {
        // Remove existing recurring availability
        await NurseAvailability.destroy({
            where: { nurse_id: nurseId, is_recurring: true },
            transaction: t
        });

        // Add new slots
        if (slots.length > 0) {
            const availabilityData = slots.map(slot => ({
                nurse_id: nurseId,
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                is_recurring: true
            }));
            await NurseAvailability.bulkCreate(availabilityData, { transaction: t });
        }
    }

    /**
     * Add Nurse Certification
     */
    async addCertification(nurseId: string, cert: any, t?: Transaction): Promise<NurseCertification> {
        return NurseCertification.create({
            nurse_profile_id: nurseId,
            ...cert
        }, { transaction: t });
    }

    /**
     * Remove Nurse Certification
     */
    async removeCertification(certId: string, nurseId: string, t?: Transaction): Promise<number> {
        return NurseCertification.destroy({
            where: { id: certId, nurse_profile_id: nurseId },
            transaction: t
        });
    }

    /**
     * Find Elderly Profile by ID
     */
    async findElderlyProfileById(id: string): Promise<ElderlyProfile | null> {
        return ElderlyProfile.findByPk(id);
    }
}

export const nursesRepository = new NursesRepository();
