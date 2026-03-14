import { nursesRepository } from "./nurses.repository";
import { logger } from "../../utils/logger.util";
import { sequelize } from "../../config/database.config";
import { NotFoundError } from "../../utils/error.util";
import { nurseAvailabilityService } from "./services/nurseAvailability.service";
import { AvailabilityRuleService } from "./services/availabilityRule.service";
import { AvailabilityRuleCreationAttributes } from "../../models/AvailabilityRule.model";

import { getPaginationParams, createPaginationMeta } from "../../utils/pagination.util";

export const getAvailableNurses = async (filters: {
    specialization?: string;
    date?: string;
    time?: string;
    elderlyId?: string;
}, pagination: { limit: number; offset: number; page: number }) => {
    logger.info('Fetching available nurses', { filters, pagination });

    try {
        let dayOfWeek: number | undefined;
        let dateObj: Date | undefined;

        if (filters.date) {
            dateObj = new Date(filters.date);
            dayOfWeek = dateObj.getDay();
        }

        const { rows: nurses, count: total } = await nursesRepository.findAvailableNurses({
            specialization: filters.specialization,
            date: dateObj,
            dayOfWeek,
            time: filters.time,
            elderlyId: filters.elderlyId
        }, pagination);

        const data = nurses.map(nurse => ({
            id: nurse.id,
            name: nurse.name,
            profilePicture: nurse.profile_picture,
            specializations: nurse.specializations,
            rating: Number(nurse.rating),
            experienceYears: nurse.experience_years,
            totalWalks: nurse.total_walks_completed,
            matchingScore: nurse.rating ? Math.round(Number(nurse.rating) * 20) : 0
        }));

        const meta = createPaginationMeta(pagination.page, pagination.limit, total);

        return { data, meta };
    } catch (error) {
        logger.error('Error fetching available nurses', error as Error);
        throw error;
    }
};

/**
 * Get the current nurse's profile
 */
export const getNurseProfile = async (userId: string) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) {
        throw new NotFoundError('Nurse profile not found');
    }

    return {
        id: nurse.id,
        name: nurse.name,
        email: (nurse as any).user?.email, // We might need to include User in the repository query if we want email
        phone: nurse.phone,
        gender: nurse.gender,
        experience_years: nurse.experience_years,
        max_patients_per_day: nurse.max_patients_per_day,
        address: nurse.address,
        specializations: nurse.specializations,
        profile_picture: nurse.profile_picture,
        rating: Number(nurse.rating),
        availability: nurse.availability,
        certifications: nurse.certifications_list
    };
};

/**
 * Update nurse profile
 */
export const updateNurseProfile = async (userId: string, data: any) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) {
        throw new NotFoundError('Nurse profile not found');
    }

    await nursesRepository.updateProfile(nurse.id, data);
    return { success: true };
};

/**
 * Update nurse availability
 */
export const updateNurseAvailability = async (userId: string, slots: any[]) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) {
        throw new NotFoundError('Nurse profile not found');
    }

    await sequelize.transaction(async (t) => {
        await nursesRepository.updateAvailability(nurse.id, slots, t);
    });

    return { success: true };
};

/**
 * Add or remove nurse certification
 */
export const manageNurseCertification = async (userId: string, action: 'add' | 'remove', data: any) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) {
        throw new NotFoundError('Nurse profile not found');
    }

    if (action === 'add') {
        const { issueDate, expiryDate, ...rest } = data;
        const certData = {
            ...rest,
            issue_date: issueDate,
            expiry_date: expiryDate
        };
        const cert = await nursesRepository.addCertification(nurse.id, certData);
        return cert;
    } else {
        await nursesRepository.removeCertification(data.certId, nurse.id);
        return { success: true };
    }
};

/**
 * Availability Rule Management
 */
export const createAvailabilityRule = async (userId: string, data: Partial<AvailabilityRuleCreationAttributes>) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) throw new NotFoundError('Nurse profile not found');

    return await AvailabilityRuleService.createRule({
        ...data,
        nurse_id: nurse.id
    } as AvailabilityRuleCreationAttributes);
};

export const getAvailabilityRules = async (userId: string) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) throw new NotFoundError('Nurse profile not found');

    return await AvailabilityRuleService.getRulesByNurse(nurse.id);
};

export const deleteAvailabilityRule = async (userId: string, ruleId: string) => {
    const nurse = await nursesRepository.findNurseByUserId(userId);
    if (!nurse) throw new NotFoundError('Nurse profile not found');

    return await AvailabilityRuleService.deleteRule(ruleId, nurse.id);
};
