import { nursesRepository } from "./nurses.repository";
import { logger } from "../../utils/logger.util";
import { sequelize } from "../../config/database.config";
import { NotFoundError } from "../../utils/error.util";
import { nurseAvailabilityService } from "./services/nurseAvailability.service";

export const getAvailableNurses = async (filters: {
    specialization?: string;
    date?: string;
    time?: string;
    elderlyId?: string;
}) => {
    logger.info('Fetching available nurses', filters);

    try {
        let dayOfWeek: number | undefined;
        let dateObj: Date | undefined;

        if (filters.date) {
            dateObj = new Date(filters.date);
            dayOfWeek = dateObj.getDay();
        }

        const nurses = await nursesRepository.findAvailableNurses({
            specialization: filters.specialization,
            date: dateObj,
            dayOfWeek,
            time: filters.time,
            elderlyId: filters.elderlyId
        });

        // Use the centralized availability service for detailed filtering if date and time are provided
        let filteredNurses = nurses;
        if (dateObj && filters.time) {
            filteredNurses = nurseAvailabilityService.filterAvailableNurses(
                nurses,
                dateObj,
                filters.time,
                filters.elderlyId
            );
        }

        return filteredNurses.map(nurse => ({
            id: nurse.id,
            name: nurse.name,
            profilePicture: nurse.profile_picture,
            specializations: nurse.specializations,
            rating: Number(nurse.rating),
            experienceYears: nurse.experience_years,
            totalWalks: nurse.total_walks,
            matchingScore: nurse.rating ? Math.round(Number(nurse.rating) * 20) : null
        }));
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
        const cert = await nursesRepository.addCertification(nurse.id, data);
        return cert;
    } else {
        await nursesRepository.removeCertification(data.certId, nurse.id);
        return { success: true };
    }
};
