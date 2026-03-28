import { walksRepository } from "./walks.repository";
import { nursesRepository } from "../nurses/nurses.repository";
import WalkSession, { WalkSessionStatus } from "../../models/WalkSession.model";
import { logger } from "../../utils/logger.util";
import { format, addMinutes, parse, isValid, differenceInMinutes, startOfDay, addDays } from "date-fns";
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from "../../utils/error.util";
import NurseProfile, { AvailabilityStatus } from "../../models/NurseProfile.model";
import ElderlyProfile from "../../models/ElderlyProfile.model";
import { sequelize } from "../../config/database.config";
import { Transaction, Op } from "sequelize";
import AvailabilitySlot, { SlotStatus } from "../../models/AvailabilitySlot.model";
import { BookingService } from "./services/Booking.service";
import { calculateHaversineDistance, calculateMatchScore } from "../../services/geolocation.service";
import { DEFAULT_MATCH_RADIUS_KM, EVENTS, WalkCompletedPayload, START_WALK_WINDOW_MINS, DISTANCE_WEIGHT } from "../../constants";
import appEvents from "../../utils/event-emitter.util";
import Booking from "../../models/Booking.model";

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
 * Helper: Calculate distance between two points in km (Haversine formula)
 * @deprecated Use GeolocationService.calculateHaversineDistance instead
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    return calculateHaversineDistance(lat1, lon1, lat2, lon2);
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
 * Get all walk sessions for a nurse user with optional filters
 */
export const getWalkSessionsByNurse = async (
    nurseId: string,
    filters: {
        status?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    } = {}
) => {
    logger.info('Fetching walk sessions for nurse user', { nurseId, filters });

    try {
        // Map frontend status to database status
        const dbStatus = filters.status ? mapStatusToDatabase(filters.status) : undefined;

        const sessions = await walksRepository.findWalksByNurseIdWithFilters(nurseId, {
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
 * Get walk statistics for a nurse user
 */
export const getNurseWalkStatistics = async (nurseId: string, period: 'all-time' | 'month' | 'year' = 'all-time') => {
    logger.info('Fetching walk statistics for nurse user', { nurseId, period });

    try {
        const stats = await walksRepository.getWalkStatisticsByNurseId(nurseId, period);

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
    requestedBy: string;
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
                nurseId: data.nurseId,
                requestedBy: data.requestedBy
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
    requestedBy: string;
}, transaction?: Transaction) => {
    logger.info('Creating walk session with slot integration', { ...data, hasTransaction: !!transaction });

    try {
        let slotId: string;

        if (data.matchingMode === 'auto') {
            // Fetch elderly profile for location if not provided
            const elderly = await nursesRepository.findElderlyProfileById(data.elderlyId);
            const userLat = elderly?.latitude;
            const userLng = elderly?.longitude;

            const matchedSlot = await findMatchingSlot({
                date: data.scheduledDate,
                time: data.scheduledTime,
                duration: data.duration,
                userLat,
                userLng
            });

            if (!matchedSlot) {
                throw new NotFoundError(`No nurses available for the selected time slot on ${data.scheduledDate}`);
            }
            slotId = matchedSlot.id;

            // Split-slot mechanism: if matched slot is longer than requested, create a remainder slot
            if (matchedSlot.duration_mins > data.duration) {
                const t2 = transaction || await sequelize.transaction();
                try {
                    const remainderMins = matchedSlot.duration_mins - data.duration;
                    const startTimeDate = parse(matchedSlot.start_time, 'HH:mm:ss', new Date());
                    const newStartTime = format(addMinutes(startTimeDate, data.duration), 'HH:mm:ss');

                    await AvailabilitySlot.create({
                        nurse_id: matchedSlot.nurse_id,
                        date: matchedSlot.date,
                        start_time: newStartTime,
                        duration_mins: remainderMins,
                        status: SlotStatus.OPEN,
                        source: matchedSlot.source,
                        rule_id: matchedSlot.rule_id
                    }, { transaction: t2 });

                    // Update the matched slot's duration to exactly what was requested
                    await AvailabilitySlot.update(
                        { duration_mins: data.duration },
                        { where: { id: slotId }, transaction: t2 }
                    );

                    if (!transaction) await t2.commit();
                } catch (err) {
                    if (!transaction) await t2.rollback();
                    throw err;
                }
            }
        } else if (!data.nurseId) {
            throw new ValidationError('Nurse ID is required for manual matching mode');
        } else {
            // Manual mode: verify selected nurse is available via slots
            const slot = await AvailabilitySlot.findOne({
                where: {
                    nurse_id: data.nurseId,
                    date: data.scheduledDate,
                    start_time: data.scheduledTime,
                    duration_mins: { [Op.gte]: data.duration },
                    status: SlotStatus.OPEN
                },
                transaction
            });

            if (!slot) {
                throw new ValidationError(`Selected nurse is not available for the chosen time slot on ${data.scheduledDate}`);
            }
            slotId = slot.id;
        }

        // Delegate to BookingService which handles Slot update, Booking creation, and WalkSession creation
        const { walkSession } = await BookingService.createBooking({
            slotId,
            elderlyId: data.elderlyId,
            bookedBy: data.requestedBy,
            notes: `Auto-created via walk session request`
        }, transaction);

        return formatWalkSession(walkSession);
    } catch (error) {
        if (!transaction) {
            logger.error('Error creating walk session', error as Error);
        }
        throw error;
    }
};

/**
 * Find a matching slot for auto-mode
 */
export const findMatchingSlot = async (params: {
    date: string;
    time: string;
    duration: number;
    userLat?: number;
    userLng?: number;
    radiusKm?: number;
}): Promise<AvailabilitySlot | null> => {
    const { date, time, duration, userLat, userLng, radiusKm = DEFAULT_MATCH_RADIUS_KM } = params;
    logger.info('Finding matching slot using slot system with proximity', { date, time, duration, userLat, userLng });

    // 1. Find all open slots that match the date, time, and have enough duration
    const slots = await AvailabilitySlot.findAll({
        where: {
            date,
            start_time: time,
            duration_mins: { [Op.gte]: duration },
            status: SlotStatus.OPEN
        },
        include: [
            {
                model: NurseProfile,
                as: 'nurse',
                where: {
                    availability_status: { [Op.ne]: AvailabilityStatus.OFFLINE }
                }
            }
        ]
    });

    if (slots.length === 0) return null;

    // 2. Rank and Filter by distance + rating
    let rankedSlots = slots.map(slot => {
        const nurse = slot.nurse!;
        let distance = Infinity;
        let score = 0;

        if (userLat && userLng && nurse.latitude && nurse.longitude) {
            distance = calculateHaversineDistance(
                userLat, userLng, Number(nurse.latitude), Number(nurse.longitude)
            );
            score = calculateMatchScore(distance, radiusKm, Number(nurse.rating), DISTANCE_WEIGHT);
        } else {
            // No distance data, use rating only (normalised)
            score = Number(nurse.rating) / 10;
        }

        return { slot, distance, score };
    });

    // Filter by radius if coordinates are available
    if (userLat && userLng) {
        rankedSlots = rankedSlots.filter(rs => rs.distance <= radiusKm);
    }

    if (rankedSlots.length === 0) return null;

    // Sort by score DESC
    rankedSlots.sort((a, b) => b.score - a.score);

    return rankedSlots[0].slot;
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

/**
 * Start a walk session
 */
export const startWalk = async (sessionId: string, nurseId: string) => {
    logger.info('Starting walk session', { sessionId, nurseId });

    const session = await WalkSession.findByPk(sessionId);
    if (!session) throw new NotFoundError('Walk session not found');

    if (session.nurse_id !== nurseId) {
        throw new ForbiddenError('You can only start your own walk sessions');
    }

    if (session.status !== WalkSessionStatus.CONFIRMED) {
        throw new ConflictError(`Cannot start walk. Current status is ${session.status}`);
    }

    const now = new Date();
    const scheduledDateTime = parse(`${format(session.scheduled_date, 'yyyy-MM-dd')} ${session.scheduled_time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    // Check time tolerance window (±15 mins)
    const diffMins = Math.abs(differenceInMinutes(now, scheduledDateTime));
    if (diffMins > START_WALK_WINDOW_MINS) {
        throw new ValidationError(`Cannot start walk yet. Scheduled for ${session.scheduled_time}. You must be within ${START_WALK_WINDOW_MINS} minutes of the scheduled time.`);
    }

    await session.update({
        actual_start_time: now,
        status: WalkSessionStatus.IN_PROGRESS
    });

    appEvents.emit(EVENTS.WALK_STARTED, { sessionId, nurseId, startedAt: now });

    return formatWalkSession(session);
};

/**
 * Update walk metrics (heartbeat)
 */
export const updateMetrics = async (sessionId: string, nurseId: string, metrics: {
    steps_count: number;
    distance_meters: number;
    calories_burned: number;
    latitude: number;
    longitude: number;
}) => {
    logger.debug('Updating walk metrics', { sessionId, nurseId, metrics });

    const session = await WalkSession.findByPk(sessionId);
    if (!session) throw new NotFoundError('Walk session not found');

    if (session.nurse_id !== nurseId) {
        throw new ForbiddenError('You do not own this walk session');
    }

    if (session.status !== WalkSessionStatus.IN_PROGRESS) {
        throw new ConflictError('Metrics can only be updated for walks in progress');
    }

    // Append route point
    const routePoints = Array.isArray(session.route_data) ? session.route_data : [];
    routePoints.push({
        lat: metrics.latitude,
        lng: metrics.longitude,
        timestamp: new Date().toISOString()
    });

    await session.update({
        steps_count: metrics.steps_count,
        distance_meters: metrics.distance_meters,
        calories_burned: metrics.calories_burned,
        route_data: routePoints
    });
};

/**
 * Complete a walk session
 */
export const completeWalk = async (sessionId: string, nurseId: string, notes?: string) => {
    logger.info('Completing walk session', { sessionId, nurseId });

    const session = await WalkSession.findByPk(sessionId);
    if (!session) throw new NotFoundError('Walk session not found');

    if (session.nurse_id !== nurseId) {
        throw new ForbiddenError('You do not own this walk session');
    }

    if (session.status !== WalkSessionStatus.IN_PROGRESS) {
        throw new ConflictError('Only walks in progress can be completed');
    }

    const now = new Date();
    const actualDurationMinutes = session.actual_start_time 
        ? Math.round(differenceInMinutes(now, session.actual_start_time))
        : session.duration_minutes;

    const t = await sequelize.transaction();

    try {
        // 1. Update session
        await session.update({
            actual_end_time: now,
            duration_minutes: actualDurationMinutes, // Bridge the naming gap
            status: WalkSessionStatus.COMPLETED,
            nurse_feedback: notes ? { notes, timestamp: now.toISOString() } : session.nurse_feedback
        }, { transaction: t });

        // 2. Update linked Booking record if exists
        // Note: Booking search is by slot_id or elderly/nurse/date combo. 
        // Our WalkSession doesn't have slot_id directly, but we can find it via status lookup or adding slot_id to session.
        // For now, let's look for a CONFIRMED booking for this slot/elderly.
        const booking = await Booking.findOne({
            where: {
                elderly_id: session.elderly_id,
                status: 'CONFIRMED'
            },
            include: [{
                model: AvailabilitySlot,
                as: 'slot',
                where: {
                    date: format(session.scheduled_date, 'yyyy-MM-dd'),
                    start_time: session.scheduled_time
                }
            }],
            transaction: t
        });

        if (booking) {
            await booking.update({ status: 'COMPLETED' as any }, { transaction: t });
        }

        // Fetch elderly user_id for notifications
        const elderly = await ElderlyProfile.findByPk(session.elderly_id, { transaction: t });
        
        await t.commit();

        // Emit walk.completed event with guaranteed payload shape
        const payload: WalkCompletedPayload = {
            sessionId: session.id,
            bookingId: booking?.id || 'manual-match',
            nurseId: session.nurse_id,
            elderlyId: session.elderly_id,
            elderlyUserId: elderly?.user_id,
            actualDurationMins: actualDurationMinutes,
            distanceMeters: session.distance_meters || 0,
            stepsCount: session.steps_count || 0,
            caloriesBurned: session.calories_burned || 0,
            completedAt: now
        };

        appEvents.emit(EVENTS.WALK_COMPLETED, payload);

        return formatWalkSession(session);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

/**
 * Get daily schedule
 */
export const getScheduleDaily = async (date: string, filters: { nurseId?: string; elderlyId?: string }) => {
    logger.info('Fetching daily schedule', { date, filters });

    const sessions = await WalkSession.findAll({
        where: {
            scheduled_date: date,
            status: { [Op.ne]: WalkSessionStatus.CANCELLED },
            ...(filters.nurseId && { nurse_id: filters.nurseId }),
            ...(filters.elderlyId && { elderly_id: filters.elderlyId })
        },
        include: [
            { model: NurseProfile, as: 'nurseProfile', attributes: ['id', 'name', 'profile_picture', 'rating'] },
            { model: ElderlyProfile, as: 'elderlyProfile', attributes: ['id', 'name', 'profile_picture'] }
        ],
        order: [['scheduled_time', 'ASC']]
    });

    // Group by hour
    const grouped: Record<string, any[]> = {};
    for (let i = 8; i <= 20; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        grouped[hour] = [];
    }

    sessions.forEach(session => {
        const hour = session.scheduled_time.split(':')[0] + ':00';
        if (grouped[hour]) {
            grouped[hour].push(formatWalkSession(session));
        }
    });

    return {
        date,
        grouped,
        total: sessions.length
    };
};

/**
 * Get weekly schedule
 */
export const getScheduleWeekly = async (startDate: string, nurseId: string) => {
    logger.info('Fetching weekly schedule', { startDate, nurseId });

    const start = new Date(startDate);
    const end = addDays(start, 6);

    const sessions = await WalkSession.findAll({
        where: {
            nurse_id: nurseId,
            scheduled_date: { [Op.between]: [format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')] },
            status: { [Op.ne]: WalkSessionStatus.CANCELLED }
        },
        include: [
            { model: ElderlyProfile, as: 'elderlyProfile', attributes: ['id', 'name', 'profile_picture'] }
        ],
        order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
    });

    const grouped: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
        const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
        grouped[dateStr] = [];
    }

    sessions.forEach(session => {
        const dateStr = format(new Date(session.scheduled_date), 'yyyy-MM-dd');
        if (grouped[dateStr]) {
            grouped[dateStr].push(formatWalkSession(session));
        }
    });

    return {
        from: startDate,
        to: format(end, 'yyyy-MM-dd'),
        grouped,
        total: sessions.length
    };
};
