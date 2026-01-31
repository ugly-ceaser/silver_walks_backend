import { walksRepository } from "./walks.repository";
import { nursesRepository } from "../nurses/nurses.repository";
import { nurseAvailabilityService } from "../nurses/services/nurseAvailability.service";
import { WalkSessionStatus } from "../../models/WalkSession.model";
import { logger } from "../../utils/logger.util";
import { format, addMinutes, parse, isValid } from "date-fns";
import { ValidationError, NotFoundError } from "../../utils/error.util";
import NurseProfile from "../../models/NurseProfile.model";
import { sequelize } from "../../config/database.config";
import { Transaction } from "sequelize";

/**
 * Helper: Get start and end of current week (Monday to Sunday)
 */
const getCurrentWeekBounds = (weekStart?: string): { weekStart: Date; weekEnd: Date } => {
    let start: Date;

    if (weekStart) {
        start = new Date(weekStart);
    } else {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
        start = new Date(today);
        start.setDate(today.getDate() + diff);
    }

    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { weekStart: start, weekEnd: end };
};

/**
 * Helper: Format walk session for frontend
 */
const formatWalkSession = (session: any) => {
    const nurseFeedback = session.nurse_feedback || {};

    return {
        id: session.id,
        elderlyId: session.elderly_id,
        elderlyName: session.elderlyProfile?.name,
        nurseId: session.nurse_id,
        nurseName: session.nurseProfile?.name,
        scheduledDate: format(new Date(session.scheduled_date), 'yyyy-MM-dd'),
        scheduledTime: session.scheduled_time,
        duration: session.duration_minutes,
        status: mapStatusToFrontend(session.status),
        matchingScore: session.nurseProfile?.rating ? Math.round(session.nurseProfile.rating * 20) : null, // Convert 5-star to 100-point scale
        requestedAt: session.created_at,
        acceptedAt: session.status === WalkSessionStatus.CONFIRMED || session.status === WalkSessionStatus.COMPLETED ? session.updated_at : null,
        startedAt: session.actual_start_time,
        completedAt: session.actual_end_time,
        metrics: session.status === WalkSessionStatus.COMPLETED ? {
            duration: session.actual_start_time && session.actual_end_time
                ? Math.round((new Date(session.actual_end_time).getTime() - new Date(session.actual_start_time).getTime()) / (1000 * 60))
                : session.duration_minutes,
            distance: session.distance_meters || 0,
            steps: session.steps_count || 0,
            averagePace: session.distance_meters && session.actual_start_time && session.actual_end_time
                ? calculateAveragePace(session.distance_meters, session.actual_start_time, session.actual_end_time)
                : null,
            caloriesBurned: session.calories_burned || 0
        } : null,
        feedback: nurseFeedback.rating ? {
            nurseId: session.nurse_id,
            nurseName: session.nurseProfile?.name,
            rating: nurseFeedback.rating,
            status: nurseFeedback.status || 'successful',
            notes: nurseFeedback.notes || '',
            healthObservations: nurseFeedback.healthObservations || [],
            recommendFollowup: nurseFeedback.recommendFollowup || false,
            timestamp: nurseFeedback.timestamp || session.actual_end_time
        } : null,
        createdAt: session.created_at,
        updatedAt: session.updated_at
    };
};

/**
 * Helper: Map database status to frontend status
 */
const mapStatusToFrontend = (status: WalkSessionStatus): string => {
    const statusMap: Record<WalkSessionStatus, string> = {
        [WalkSessionStatus.SCHEDULED]: 'pending',
        [WalkSessionStatus.CONFIRMED]: 'accepted',
        [WalkSessionStatus.IN_PROGRESS]: 'in-progress',
        [WalkSessionStatus.COMPLETED]: 'completed',
        [WalkSessionStatus.CANCELLED]: 'cancelled',
        [WalkSessionStatus.REJECTED]: 'rejected'
    };
    return statusMap[status] || status;
};

/**
 * Helper: Calculate average pace (seconds per 100 meters)
 */
const calculateAveragePace = (distanceMeters: number, startTime: Date, endTime: Date): number => {
    if (!distanceMeters || distanceMeters === 0) return 0;

    const durationSeconds = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
    const pacePerMeter = durationSeconds / distanceMeters;
    return Math.round(pacePerMeter * 100); // Seconds per 100 meters
};

/**
 * Get all walk sessions for an elderly user with optional filters
 */
export const getWalkSessionsByElderly = async (
    elderlyId: string,
    filters: {
        status?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    } = {}
) => {
    logger.info('Fetching walk sessions for elderly user', { elderlyId, filters });

    try {
        // Map frontend status to database status
        const dbStatus = filters.status ? mapStatusToDatabase(filters.status) : undefined;

        const sessions = await walksRepository.findWalksByElderlyIdWithFilters(elderlyId, {
            status: dbStatus,
            startDate: filters.startDate ? new Date(filters.startDate) : undefined,
            endDate: filters.endDate ? new Date(filters.endDate) : undefined,
            limit: filters.limit
        });

        return sessions.map(formatWalkSession);
    } catch (error) {
        logger.error('Error fetching walk sessions', error as Error);
        throw error;
    }
};

/**
 * Helper: Map frontend status to database status
 */
const mapStatusToDatabase = (status: string): WalkSessionStatus | undefined => {
    const statusMap: Record<string, WalkSessionStatus> = {
        'pending': WalkSessionStatus.SCHEDULED,
        'accepted': WalkSessionStatus.CONFIRMED,
        'in-progress': WalkSessionStatus.IN_PROGRESS,
        'completed': WalkSessionStatus.COMPLETED,
        'cancelled': WalkSessionStatus.CANCELLED,
        'rejected': WalkSessionStatus.REJECTED
    };
    return statusMap[status];
};

/**
 * Get today's walk session for an elderly user
 */
export const getTodayWalkSession = async (elderlyId: string) => {
    logger.info('Fetching today\'s walk for elderly user', { elderlyId });

    try {
        const session = await walksRepository.findTodayWalkByElderlyId(elderlyId);

        if (!session) {
            return null;
        }

        return {
            id: session.id,
            elderlyId: session.elderly_id,
            scheduledDate: format(new Date(session.scheduled_date), 'yyyy-MM-dd'),
            scheduledTime: session.scheduled_time,
            duration: session.duration_minutes,
            status: mapStatusToFrontend(session.status),
            nurseId: session.nurse_id,
            nurseName: session.nurseProfile?.name,
            metrics: session.status === WalkSessionStatus.COMPLETED ? {
                duration: session.actual_start_time && session.actual_end_time
                    ? Math.round((new Date(session.actual_end_time).getTime() - new Date(session.actual_start_time).getTime()) / (1000 * 60))
                    : session.duration_minutes,
                steps: session.steps_count || 0
            } : null
        };
    } catch (error) {
        logger.error('Error fetching today\'s walk', error as Error);
        throw error;
    }
};

/**
 * Get weekly walk sessions for an elderly user
 */
export const getWeeklyWalkSessions = async (elderlyId: string, weekStartParam?: string) => {
    logger.info('Fetching weekly walks for elderly user', { elderlyId, weekStartParam });

    try {
        const { weekStart, weekEnd } = getCurrentWeekBounds(weekStartParam);

        const sessions = await walksRepository.findWeeklyWalksByElderlyId(elderlyId, weekStart, weekEnd);

        const completedSessions = sessions.filter(s => s.status === WalkSessionStatus.COMPLETED);

        return {
            weekStart: format(weekStart, 'yyyy-MM-dd'),
            weekEnd: format(weekEnd, 'yyyy-MM-dd'),
            sessions: sessions.map(session => ({
                id: session.id,
                scheduledDate: format(new Date(session.scheduled_date), 'yyyy-MM-dd'),
                status: mapStatusToFrontend(session.status),
                metrics: session.status === WalkSessionStatus.COMPLETED ? {
                    duration: session.actual_start_time && session.actual_end_time
                        ? Math.round((new Date(session.actual_end_time).getTime() - new Date(session.actual_start_time).getTime()) / (1000 * 60))
                        : session.duration_minutes,
                    steps: session.steps_count || 0
                } : null
            })),
            summary: {
                totalWalks: completedSessions.length,
                targetWalks: 7,
                completionRate: Number(((completedSessions.length / 7) * 100).toFixed(2))
            }
        };
    } catch (error) {
        logger.error('Error fetching weekly walks', error as Error);
        throw error;
    }
};

/**
 * Get walk statistics for an elderly user
 */
export const getWalkStatistics = async (elderlyId: string, period: 'all-time' | 'month' | 'year' = 'all-time') => {
    logger.info('Fetching walk statistics for elderly user', { elderlyId, period });

    try {
        const stats = await walksRepository.getWalkStatisticsByElderlyId(elderlyId, period);

        return {
            totalWalks: stats.totalWalks,
            totalDuration: stats.totalDuration,
            totalSteps: stats.totalSteps,
            totalDistance: stats.totalDistance,
            avgDuration: stats.avgDuration,
            avgSteps: stats.avgSteps,
            avgDistance: stats.avgDistance,
            avgRating: stats.avgRating,
            completionRate: stats.completionRate
        };
    } catch (error) {
        logger.error('Error fetching walk statistics', error as Error);
        throw error;
    }
};
/**
 * Create multiple walk sessions
 */
export const createWalkSessions = async (data: {
    elderlyId: string;
    scheduledDates: string[];
    scheduledTime: string;
    duration: number;
    matchingMode: 'auto' | 'manual';
    nurseId?: string;
}) => {
    logger.info('Creating multiple walk sessions', data);

    if (!data.scheduledDates || data.scheduledDates.length === 0) {
        throw new ValidationError('At least one scheduled date is required');
    }

    const t = await sequelize.transaction();

    try {
        const sessions = [];

        for (const date of data.scheduledDates) {
            const session = await createWalkSession({
                elderlyId: data.elderlyId,
                scheduledDate: date,
                scheduledTime: data.scheduledTime,
                duration: data.duration,
                matchingMode: data.matchingMode,
                nurseId: data.nurseId
            }, t);
            sessions.push(session);
        }

        await t.commit();
        return sessions;
    } catch (error) {
        await t.rollback();
        logger.error('Error creating multiple walk sessions', error as Error);
        throw error;
    }
};

/**
 * Create a new walk session
 */
export const createWalkSession = async (data: {
    elderlyId: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    matchingMode: 'auto' | 'manual';
    nurseId?: string;
}, transaction?: Transaction) => {
    logger.info('Creating walk session', { ...data, hasTransaction: !!transaction });

    try {
        let finalNurseId = data.nurseId;

        if (data.matchingMode === 'auto') {
            const matchedNurse = await findMatchingNurse(data.scheduledDate, data.scheduledTime, data.duration, data.elderlyId);
            if (!matchedNurse) {
                throw new NotFoundError(`No nurses available for the selected time slot on ${data.scheduledDate}`);
            }
            finalNurseId = matchedNurse.id;
        } else if (!finalNurseId) {
            throw new ValidationError('Nurse ID is required for manual matching mode');
        } else {
            // Manual mode: verify selected nurse is available
            const nurse = await nursesRepository.findNurseById(finalNurseId);
            if (!nurse) {
                throw new NotFoundError('Selected nurse not found');
            }

            const isAvailable = nurseAvailabilityService.isNurseAvailable(
                nurse,
                new Date(data.scheduledDate),
                data.scheduledTime,
                data.elderlyId
            );

            if (!isAvailable) {
                throw new ValidationError(`Selected nurse is not available for the chosen time slot on ${data.scheduledDate}`);
            }
        }

        const session = await walksRepository.createWalkSession({
            elderly_id: data.elderlyId,
            nurse_id: finalNurseId!,
            scheduled_date: new Date(data.scheduledDate),
            scheduled_time: data.scheduledTime,
            duration_minutes: data.duration,
            status: WalkSessionStatus.SCHEDULED
        }, transaction);

        return formatWalkSession(session);
    } catch (error) {
        if (!transaction) {
            logger.error('Error creating walk session', error as Error);
        }
        throw error;
    }
};

/**
 * Find a matching nurse for auto-mode
 */
export const findMatchingNurse = async (
    date: string,
    time: string,
    duration: number,
    elderlyId?: string
): Promise<NurseProfile | null> => {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const nurses = await nursesRepository.findAvailableNurses({
        date: dateObj,
        dayOfWeek,
        time,
        elderlyId
    });

    // Detailed filtering via service
    const availableNurses = nurseAvailabilityService.filterAvailableNurses(
        nurses,
        dateObj,
        time,
        elderlyId
    );

    if (availableNurses.length === 0) return null;

    // Simple matching: pick the one with the highest rating
    return availableNurses[0];
};

/**
 * Get available time slots for a specific date
 */
export const getAvailableTimeSlots = async (date: string) => {
    logger.info('Fetching available time slots', { date });

    try {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();

        // Standard slots if no specific availability logic is needed yet
        const slots = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
        ];

        // For now, return these slots. In a real app, we'd check nurse count for each slot.
        return slots.map(time => ({
            time,
            label: format(parse(time, 'HH:mm', new Date()), 'h:mm a'),
            available: true
        }));
    } catch (error) {
        logger.error('Error fetching available slots', error as Error);
        throw error;
    }
};
