import { Request, Response, NextFunction } from 'express';
import * as nursesService from './nurses.service';
import { getPaginationParams } from '../../utils/pagination.util';
import { createdResponse, paginatedResponse } from '../../utils/response.util';
import ElderlyProfile from '../../models/ElderlyProfile.model';

/**
 * GET /api/v1/nurses
 * Get available nurses with filters
 */
export const getNurses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { specialization, date, time } = req.query;
        const pagination = getPaginationParams(req);
        const userId = req.user?.userId;

        let elderlyId: string | undefined;
        if (userId) {
            const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
            elderlyId = elderly?.id;
        }

        const { data, meta } = await nursesService.getAvailableNurses({
            specialization: specialization as string,
            date: date as string,
            time: time as string,
            elderlyId
        }, pagination);

        return paginatedResponse(res, data, meta, 'Nurses fetched successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/nurses/me
 * Get current nurse profile
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const profile = await nursesService.getNurseProfile(userId);
        return createdResponse(res, profile, 'Nurse profile fetched successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/v1/nurses/profile
 * Update nurse profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        await nursesService.updateNurseProfile(userId, req.body);
        return createdResponse(res, null, 'Nurse profile updated successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/v1/nurses/availability
 * Update nurse availability
 */
export const updateAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        await nursesService.updateNurseAvailability(userId, req.body.slots);
        return createdResponse(res, null, 'Nurse availability updated successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/nurses/certifications
 * Add certification
 */
export const addCertification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const cert = await nursesService.manageNurseCertification(userId, 'add', req.body);
        return createdResponse(res, cert, 'Certification added successfully', 201);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/nurses/certifications/:id
 * Remove certification
 */
export const removeCertification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const certId = req.params.id;
        await nursesService.manageNurseCertification(userId, 'remove', { certId });
        return createdResponse(res, null, 'Certification removed successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/nurses/availability/rules
 */
export const createAvailabilityRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const rule = await nursesService.createAvailabilityRule(userId, req.body);
        return createdResponse(res, rule, 'Availability rule created successfully', 201);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/nurses/availability/rules
 */
export const getAvailabilityRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const rules = await nursesService.getAvailabilityRules(userId);
        return createdResponse(res, rules, 'Availability rules fetched successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/nurses/availability/rules/:id
 */
export const deleteAvailabilityRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const ruleId = req.params.id;
        await nursesService.deleteAvailabilityRule(userId, ruleId);
        return createdResponse(res, null, 'Availability rule deleted successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/v1/nurses/me/device-token
 */
export const updateDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const { token } = req.body;
        await nursesService.updateDeviceToken(userId, token);
        return createdResponse(res, null, 'Device token updated successfully', 200);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/nurses/clients
 * Get nurse's clients (elderly profiles) with status filtering
 */
export const getClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const { status } = req.query;
        const clients = await nursesService.getNurseClients(userId, status as string);
        return createdResponse(res, clients, 'Clients fetched successfully', 200);
    } catch (error) {
        next(error);
    }
};
