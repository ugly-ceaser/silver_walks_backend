import { Request, Response, NextFunction } from 'express';
import * as walksByService from './walks.service';
import { SlotService } from './services/Slot.service';
import { BookingService } from './services/Booking.service';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { NotFoundError, ValidationError, asyncHandler } from '../../utils/error.util';
import { logger } from '../../utils/logger.util';
import { format, addDays } from 'date-fns';
import { getPaginationParams, createPaginatedResponse } from '../../utils/pagination.util';
import NurseProfile from '../../models/NurseProfile.model';

/**
 * Helper to get elderly profile for the current user
 */
const getElderlyProfileByUserId = async (userId: string) => {
    const profile = await ElderlyProfile.findOne({ where: { user_id: userId } });
    if (!profile) {
        throw new NotFoundError('Elderly profile not found for this user');
    }
    return profile;
};

/**
 * Helper to get nurse profile for the current user
 */
const getNurseProfileByUserId = async (userId: string) => {
    const nurse = await NurseProfile.findOne({ where: { user_id: userId } });
    if (!nurse) {
        throw new NotFoundError('Nurse profile not found for this user');
    }
    return nurse;
};

/**
 * Helper to resolve nurse ID for schedule filtering
 */
const resolveNurseId = async (user: any, queryNurseId: string) => {
    if (user?.role !== 'nurse') return queryNurseId;
    const nurse = await NurseProfile.findOne({ where: { user_id: user.userId } });
    return nurse?.id || 'none';
};

/**
 * Helper to resolve elderly ID for schedule filtering
 */
const resolveElderlyId = async (user: any, queryElderlyId: string) => {
    if (user?.role !== 'elderly') return queryElderlyId;
    const elderly = await ElderlyProfile.findOne({ where: { user_id: user.userId } });
    return elderly?.id || 'none';
};

/**
 * Helper to resolve nurse and elderly IDs for schedule filtering
 */
const resolveUserIdsForSchedule = async (user: any, query: any) => {
    const nurseId = await resolveNurseId(user, query.nurse_id as string);
    const elderlyId = await resolveElderlyId(user, query.elderly_id as string);

    return { nurseId, elderlyId };
};

/**
 * Helper to parse walk filters from query
 */
const parseWalkFilters = (query: any) => {
    const { status, startDate, endDate, limit } = query;
    return {
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string) : undefined
    };
};

/**
 * Helper to fetch walk sessions based on user role
 */
const fetchWalkSessionsByRole = async (userId: string, role: string | undefined, query: any) => {
    const filters = parseWalkFilters(query);
    if (role === 'nurse') {
        const nurse = await getNurseProfileByUserId(userId);
        return walksByService.getWalkSessionsByNurse(nurse.id, filters);
    }
    const profile = await getElderlyProfileByUserId(userId);
    return walksByService.getWalkSessionsByElderly(profile.id, filters);
};

/**
 * Helper to fetch walk stats based on user role
 */
const fetchWalkStatsByRole = async (userId: string, role: string | undefined, period: any) => {
    const statsPeriod = (period as 'all-time' | 'month' | 'year') || 'all-time';
    if (role === 'nurse') {
        const nurse = await getNurseProfileByUserId(userId);
        return walksByService.getNurseWalkStatistics(nurse.id, statsPeriod);
    }
    const profile = await getElderlyProfileByUserId(userId);
    return walksByService.getWalkStatistics(profile.id, statsPeriod);
};

/**
 * Helper to fetch today's walk session
 */
const handleTodayWalkFetch = async (userId: string) => {
    const profile = await getElderlyProfileByUserId(userId);
    return walksByService.getTodayWalkSession(profile.id);
};

/**
 * Helper to fetch weekly walk sessions
 */
const handleWeeklyWalksFetch = async (userId: string, weekStart?: string) => {
    const profile = await getElderlyProfileByUserId(userId);
    return walksByService.getWeeklyWalkSessions(profile.id, weekStart as string);
};


/**
 * GET /api/v1/walks
 * Get all walk sessions for the current user (Elderly or Nurse)
 */
export const getWalkSessions = asyncHandler(async (req: Request, res: Response) => {
    const sessions = await fetchWalkSessionsByRole(req.user!.userId, req.user?.role, req.query);

    res.status(200).json({ success: true, data: sessions });
});

/**
 * GET /api/v1/walks/today
 * Get today's walk session for the current elderly user
 */
export const getTodayWalk = asyncHandler(async (req: Request, res: Response) => {
    const data = await handleTodayWalkFetch(req.user!.userId);

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * GET /api/v1/walks/weekly
 * Get weekly walk sessions for the current elderly user
 */
export const getWeeklyWalks = asyncHandler(async (req: Request, res: Response) => {
    const data = await handleWeeklyWalksFetch(req.user!.userId, req.query.weekStart as string);

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * GET /api/v1/walks/stats
 * Get walk statistics for the current user (Elderly or Nurse)
 */
export const getWalkStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await fetchWalkStatsByRole(req.user!.userId, req.user?.role, req.query.period);

    res.status(200).json({
        success: true,
        data: stats
    });
});
/**
 * POST /api/v1/walks
 * Create a new walk session
 */
export const createWalk = asyncHandler(async (req: Request, res: Response) => {
    const { scheduledDates, scheduledTime, duration, matchingMode, nurseId } = req.body;

    const sessions = await walksByService.createWalkSessions({
        scheduledDates,
        scheduledTime,
        duration,
        matchingMode,
        nurseId,
        requestedBy: req.user!.userId
    });

    res.status(201).json({
        success: true,
        data: sessions
    });
});

/**
 * Helper to handle the booking process
 */
const handleSlotBooking = async (userId: string, slotId: string, notes?: string) => {
    const profile = await getElderlyProfileByUserId(userId);
    
    const { booking } = await BookingService.createBooking({
        slotId,
        elderlyId: profile.id,
        bookedBy: userId,
        notes
    });
    
    return booking;
};

/**
 * POST /api/v1/walks/book
 * Book a specific slot
 */
export const bookSlot = asyncHandler(async (req: Request, res: Response) => {
    const { slotId, notes } = req.body;
    
    // Auth middleware ensures userId exists
    const booking = await handleSlotBooking(req.user!.userId, slotId, notes);

    res.status(201).json({
        success: true,
        message: 'Slot booked successfully',
        data: booking
    });
});

/**
 * Helper to handle the walk matching logic
 */
const handleWalkMatching = async (matchData: any) => {
    const { scheduledDate, scheduledTime, duration, latitude, longitude } = matchData;
    
    const slot = await walksByService.findMatchingSlot({ 
        date: scheduledDate, 
        time: scheduledTime, 
        duration,
        userLat: latitude,
        userLng: longitude
    });

    if (!slot?.nurse) {
        throw new NotFoundError('No nurses available for the selected time slot');
    }

    return slot.nurse;
};

/**
 * POST /api/v1/walks/match
 * Find a matching nurse for a walk session
 */
export const matchWalk = asyncHandler(async (req: Request, res: Response) => {
    const nurse = await handleWalkMatching(req.body);

    res.status(200).json({
        success: true,
        data: transformNurseMatchData(nurse)
    });
});


/**
 * Helper to transform nurse match data for response
 */
const transformNurseMatchData = (nurse: any) => {
    return {
        id: nurse.id,
        name: nurse.name,
        rating: Number(nurse.rating),
        matchingScore: nurse.rating ? Math.round(Number(nurse.rating) * 20) : null
    };
};

/**
 * Helper to parse slot filters from query
 */
const parseSlotFilters = (query: any) => {
    const { date, nurseId, minDuration } = query;
    const startDate = (date as string) || format(new Date(), 'yyyy-MM-dd');
    const endDate = format(addDays(new Date(startDate), 7), 'yyyy-MM-dd');

    return {
        nurseId: nurseId as string,
        startDate,
        endDate,
        minDuration: minDuration ? parseInt(minDuration as string) : undefined
    };
};

/**
 * Helper to transform slot data for response
 */
const transformSlotData = (slots: any[]) => {
    return slots.map(slot => ({
        id: slot.id,
        nurseId: slot.nurse_id,
        nurseName: (slot as any).nurse?.name,
        date: slot.date,
        time: slot.start_time,
        duration: slot.duration_mins,
        rating: (slot as any).nurse?.rating
    }));
};

/**
 * GET /api/v1/walks/slots
 * Get available time slots for a specific date
 */
export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const filters = parseSlotFilters(req.query);

        const { rows: slots, count: total } = await SlotService.getAvailableSlots({
            ...filters,
            limit,
            offset
        });

        const data = transformSlotData(slots);
        res.status(200).json(createPaginatedResponse(data, page, limit, total));
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/walks/:id/start
 */
export const startWalk = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const nurseId = req.user?.userId; // Assuming internal ID mapping or user ID is suitable
        
        const nurse = await getNurseProfileByUserId(nurseId as string);
        const session = await walksByService.startWalk(id, nurse.id);


        res.status(200).json({
            success: true,
            message: 'Walk started successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/v1/walks/:id/metrics
 */
export const updateMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const nurseId = req.user?.userId;

        const nurse = await getNurseProfileByUserId(nurseId as string);
        await walksByService.updateMetrics(id, nurse.id, req.body);


        res.status(204).send(); // Standard for heartbeats/updates with no content
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/walks/:id/complete
 */
export const completeWalk = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const nurseId = req.user?.userId;

        const nurse = await getNurseProfileByUserId(nurseId as string);
        const session = await walksByService.completeWalk(id, nurse.id, notes);


        res.status(200).json({
            success: true,
            message: 'Walk completed successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/walks/schedule/daily
 */
export const getScheduleDaily = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { date } = req.query;
        const ids = await resolveUserIdsForSchedule(req.user, req.query);

        const data = await walksByService.getScheduleDaily(date as string, ids);

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};


/**
 * GET /api/v1/walks/schedule/weekly
 */
export const getScheduleWeekly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { date } = req.query; // date is from-date
        const ids = await resolveUserIdsForSchedule(req.user, req.query);

        const data = await walksByService.getScheduleWeekly(date as string, ids.nurseId);

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

