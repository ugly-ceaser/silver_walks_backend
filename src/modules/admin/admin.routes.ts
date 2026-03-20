import { Router } from 'express';
import * as adminController from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { validators } from '../../utils/validation.util';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Vetting
router.get('/nurses/pending', adminController.getPendingNurses);
router.patch('/nurses/:id/approve', adminController.approveNurse);
router.patch(
    '/nurses/:id/reject', 
    validateRequest({ 
        body: [{ field: 'reason', rules: [{ validator: validators.required, message: 'Reason is required' }] }] 
    }), 
    adminController.rejectNurse
);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/deactivate', adminController.deactivateUser);

export default router;
