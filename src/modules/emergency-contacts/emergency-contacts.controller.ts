import { Request, Response, NextFunction } from 'express';
import { emergencyContactService } from './emergency-contacts.service';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { NotFoundError } from '../../utils/error.util';

/**
 * Emergency Contact Controller
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        const contacts = await emergencyContactService.getAll(elderly.id);

        res.status(200).json({
            success: true,
            data: contacts
        });
    } catch (error) {
        next(error);
    }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        const contact = await emergencyContactService.create(elderly.id, req.body);

        res.status(201).json({
            success: true,
            message: 'Emergency contact created successfully',
            data: contact
        });
    } catch (error) {
        next(error);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        await emergencyContactService.update(id, elderly.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Emergency contact updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        await emergencyContactService.remove(id, elderly.id);

        res.status(200).json({
            success: true,
            message: 'Emergency contact deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const setPrimary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const elderly = await ElderlyProfile.findOne({ where: { user_id: userId } });
        if (!elderly) throw new NotFoundError('Elderly profile not found');

        await emergencyContactService.setPrimary(id, elderly.id);

        res.status(200).json({
            success: true,
            message: 'Primary contact set successfully'
        });
    } catch (error) {
        next(error);
    }
};
