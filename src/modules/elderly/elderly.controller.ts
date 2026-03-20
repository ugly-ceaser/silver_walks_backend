import { Request, Response, NextFunction } from 'express';
import * as elderlyService from './elderly.service';
import { createdResponse } from '../../utils/response.util';

/**
 * PATCH /api/v1/elderly/me/device-token
 */
export const updateDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any).userId;
        const { token } = req.body;
        await elderlyService.updateDeviceToken(userId, token);
        return createdResponse(res, null, 'Device token updated successfully', 200);
    } catch (error) {
        next(error);
    }
};
