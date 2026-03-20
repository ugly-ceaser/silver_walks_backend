import { Request, Response, NextFunction } from 'express';
import { healthProfileService } from './health-profiles.service';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { NotFoundError } from '../../utils/error.util';
import NurseProfile from '../../models/NurseProfile.model';

/**
 * Health Profile Controller
 */
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        const profile = await healthProfileService.getByElderlyId(elderly.id);

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        const profile = await healthProfileService.createOrUpdate(elderly.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Health profile updated successfully',
            data: profile
        });
    } catch (error) {
        next(error);
    }
};

export const patchConditions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        await healthProfileService.patchConditions(elderly.id, req.body.conditions);

        res.status(200).json({
            success: true,
            message: 'Medical conditions updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const patchMedications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        await healthProfileService.patchMedications(elderly.id, req.body.medications);

        res.status(200).json({
            success: true,
            message: 'Medications updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getSummaryForNurse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { elderlyId } = req.params;
        const userId = req.user?.userId;
        
        const nurse = await NurseProfile.findOne({ where: { user_id: userId } });
        if (!nurse) throw new NotFoundError('Nurse profile not found');

        const summary = await healthProfileService.getSummaryForNurse(elderlyId, nurse.id);

        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
};
