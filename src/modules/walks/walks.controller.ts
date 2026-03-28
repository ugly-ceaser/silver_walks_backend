import { Request, Response, NextFunction } from 'express';
import * as walksByService from './walks.service';
import { SlotService } from './services/Slot.service';
import { BookingService } from './services/Booking.service';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { NotFoundError, ValidationError } from '../../utils/error.util';
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
 * GET /api/v1/walks
 * Get all walk sessions for the current user (Elderly or Nurse)
 */
export const getWalkSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) throw new ValidationError('User ID not found in request');

        const { status, startDate, endDate, limit } = req.query;
        const filters = {
            status: status as string,
            startDate: startDate as string,
            endDate: endDate as string,
            limit: limit ? parseInt(limit as string) : undefined
        };

        let sessions;

        if (role === 'nurse') {
            const nurse = await NurseProfile.findOne({ where: { user_id: userId } });
            if (!nurse) throw new NotFoundError('Nurse profile not found');
            sessions = await walksByService.getWalkSessionsByNurse(nurse.id, filters);
        } else {
            // Default to elderly
            const profile = await getElderlyProfileByUserId(userId);
            sessions = await walksByService.getWalkSessionsByElderly(profile.id, filters);
        }

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/walks/today
 * Get today's walk session for the current elderly user
 */
export const getTodayWalk = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID not found in request');

        const profile = await getElderlyProfileByUserId(userId);

        const session = await walksByService.getTodayWalkSession(profile.id);

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/walks/weekly
 * Get weekly walk sessions for the current elderly user
 */
export const getWeeklyWalks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID not found in request');

        const profile = await getElderlyProfileByUserId(userId);

        const { weekStart } = req.query;

        const data = await walksByService.getWeeklyWalkSessions(profile.id, weekStart as string);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/walks/stats
 * Get walk statistics for the current user (Elderly or Nurse)
 */
export const getWalkStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) throw new ValidationError('User ID not found in request');

        const { period } = req.query;
        const statsPeriod = (period as 'all-time' | 'month' | 'year') || 'all-time';

        let stats;

        if (role === 'nurse') {
            const nurse = await NurseProfile.findOne({ where: { user_id: userId } });
            if (!nurse) throw new NotFoundError('Nurse profile not found');
            stats = await walksByService.getNurseWalkStatistics(nurse.id, statsPeriod);
        } else {
            // Default to elderly behavior
            const profile = await getElderlyProfileByUserId(userId);
            stats = await walksByService.getWalkStatistics(profile.id, statsPeriod);
        }

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};
/**
 * POST /api/v1/walks
 * Create a new walk session
 */
export const createWalk = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID not found in request');

        const profile = await getElderlyProfileByUserId(userId);

        const { scheduledDates, scheduledTime, duration, matchingMode, nurseId } = req.body;

        const sessions = await walksByService.createWalkSessions({
            elderlyId: profile.id,
            scheduledDates,
            scheduledTime,
            duration,
            matchingMode,
            nurseId,
            requestedBy: userId
        });

        res.status(201).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/walks/book
 * Book a specific slot
 */
export const bookSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID not found in request');

        const profile = await getElderlyProfileByUserId(userId);
        const { slotId, notes } = req.body;

        const { booking } = await BookingService.createBooking({
            slotId,
            elderlyId: profile.id,
            bookedBy: userId,
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Slot booked successfully',
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/walks/match
 * Find a matching nurse for a walk session
 */
export const matchWalk = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { scheduledDate, scheduledTime, duration, latitude, longitude } = req.body;

        const slot = await walksByService.findMatchingSlot({ 
            date: scheduledDate, 
            time: scheduledTime, 
            duration,
            userLat: latitude,
            userLng: longitude
        });

        if (!slot || !slot.nurse) {
            throw new NotFoundError('No nurses available for the selected time slot');
        }

        const nurse = slot.nurse;

        res.status(200).json({
            success: true,
            data: {
                id: nurse.id,
                name: nurse.name,
                rating: Number(nurse.rating),
                matchingScore: nurse.rating ? Math.round(Number(nurse.rating) * 20) : null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/walks/slots
 * Get available time slots for a specific date
 */
export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, offset } = getPaginationParams(req);
        const { date, nurseId, minDuration } = req.query;

        // Default to today if no date provided
        const startDate = (date as string) || format(new Date(), 'yyyy-MM-dd');
        const endDate = format(addDays(new Date(startDate), 7), 'yyyy-MM-dd'); // Default to 7 days ahead

        const { rows: slots, count: total } = await SlotService.getAvailableSlots({
            nurseId: nurseId as string,
            startDate,
            endDate,
            minDuration: minDuration ? parseInt(minDuration as string) : undefined,
            limit,
            offset
        });

        const data = slots.map(slot => ({
            id: slot.id,
            nurseId: slot.nurse_id,
            nurseName: (slot as any).nurse?.name,
            date: slot.date,
            time: slot.start_time,
            duration: slot.duration_mins,
            rating: (slot as any).nurse?.rating
        }));

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
        
        // We need to resolve the nurse profile ID from the user ID
        const nurse = await NurseProfile.findOne({ where: { user_id: nurseId } });
        if (!nurse) throw new NotFoundError('Nurse profile not found');

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

        const nurse = await NurseProfile.findOne({ where: { user_id: nurseId } });
        if (!nurse) throw new NotFoundError('Nurse profile not found');

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

        const nurse = await NurseProfile.findOne({ where: { user_id: nurseId } });
        if (!nurse) throw new NotFoundError('Nurse profile not found');

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
        const { date, nurse_id, elderly_id } = req.query;
        const userId = req.user?.userId;
        const role = req.user?.role;

        // Security check: if not admin, ensure they are filtering for themselves implicitly or explicitly correctly
        let finalNurseId = nurse_id as string;
        let finalElderlyId = elderly_id as string;

        if (role === 'nurse') {
            const nurse = await NurseProfile.findOne({ where: { user_id: userId } });
            finalNurseId = nurse?.id || 'none';
        } else if (role === 'elderly') {
            const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
            finalElderlyId = elderly?.id || 'none';
        }

        const data = await walksByService.getScheduleDaily(date as string, {
            nurseId: finalNurseId,
            elderlyId: finalElderlyId
        });

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/walks/schedule/weekly
 */
export const getScheduleWeekly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { date, nurse_id } = req.query; // date is from-date
        const userId = req.user?.userId;
        const role = req.user?.role;

        let finalNurseId = nurse_id as string;

        if (role === 'nurse') {
            const nurse = await NurseProfile.findOne({ where: { user_id: userId } });
            finalNurseId = nurse?.id || 'none';
        }

        const data = await walksByService.getScheduleWeekly(date as string, finalNurseId);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};
