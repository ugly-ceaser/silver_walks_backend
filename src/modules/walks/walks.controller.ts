import { Request, Response, NextFunction } from 'express';
import * as walksByService from './walks.service';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { NotFoundError, ValidationError } from '../../utils/error.util';
import { logger } from '../../utils/logger.util';

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

        const slots = await walksByService.getAvailableTimeSlots(date as string);

        res.status(200).json({
            success: true,
            data: slots
        });
    } catch (error) {
        next(error);
    }
};
