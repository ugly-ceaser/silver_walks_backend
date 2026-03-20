import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';

/**
 * Admin Controller
 */
export const approveNurse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await adminService.approveNurse(id);
        res.status(200).json({ success: true, message: 'Nurse approved successfully' });
    } catch (error) {
        next(error);
    }
};

export const rejectNurse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await adminService.rejectNurse(id, reason);
        res.status(200).json({ success: true, message: 'Nurse rejected successfully' });
    } catch (error) {
        next(error);
    }
};

export const getPendingNurses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const nurses = await adminService.getPendingNurses();
        res.status(200).json({ success: true, data: nurses });
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.listUsers(req.query);
        res.status(200).json({ success: true, ...data });
    } catch (error) {
        next(error);
    }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        await adminService.deactivateUser(id, adminId!);
        res.status(200).json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};
