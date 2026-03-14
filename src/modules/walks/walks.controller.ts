import { Request, Response, NextFunction } from 'express';
import * as walksByService from './walks.service';
import { SlotService } from './services/Slot.service';
import { BookingService } from './services/Booking.service';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { NotFoundError, ValidationError } from '../../utils/error.util';
import { logger } from '../../utils/logger.util';
import { format, addDays } from 'date-fns';

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
 * Get all walk sessions for the current elderly user
 */
export const getWalkSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID not found in request');

        const profile = await getElderlyProfileByUserId(userId);

        const { status, startDate, endDate, limit } = req.query;

        const sessions = await walksByService.getWalkSessionsByElderly(profile.id, {
            status: status as string,
            startDate: startDate as string,
            endDate: endDate as string,
            limit: limit ? parseInt(limit as string) : undefined
        });

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
 * Get walk statistics for the current elderly user
 */
export const getWalkStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID not found in request');

        const profile = await getElderlyProfileByUserId(userId);

        const { period } = req.query;

        const stats = await walksByService.getWalkStatistics(
            profile.id,
            (period as 'all-time' | 'month' | 'year') || 'all-time'
        );

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
            nurseId
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

        const booking = await BookingService.createBooking({
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
        const { scheduledDate, scheduledTime, duration } = req.body;

        const nurse = await walksByService.findMatchingNurse(scheduledDate, scheduledTime, duration);

        if (!nurse) {
            throw new NotFoundError('No nurses available for the selected time slot');
        }

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
        const { date } = req.query;

        if (!date) throw new ValidationError('Date is required');

        const startDate = date as string;
        const endDate = format(addDays(new Date(startDate), 7), 'yyyy-MM-dd'); // Default to 7 days ahead

        const slots = await SlotService.getAvailableSlots({
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            data: slots.map(slot => ({
                id: slot.id,
                nurseId: slot.nurse_id,
                nurseName: (slot as any).nurse?.name,
                date: slot.date,
                time: slot.start_time,
                duration: slot.duration_mins,
                rating: (slot as any).nurse?.rating
            }))
        });
    } catch (error) {
        next(error);
    }
};
