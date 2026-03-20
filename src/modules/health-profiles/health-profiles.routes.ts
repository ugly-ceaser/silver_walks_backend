import { Router } from 'express';
import * as healthProfileController from './health-profiles.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { healthProfileSchema } from './health-profiles.schemaValidator';
import { UserRole } from '../../models/User.model';

const router = Router();

// All health profile routes require authentication
router.use(authenticate);

// Elderly endpoints
router.get(
    '/me',
    requireRole(UserRole.ELDERLY),
    healthProfileController.getMyProfile
);

router.put(
    '/me',
    requireRole(UserRole.ELDERLY),
    validateRequest(healthProfileSchema.updateProfile),
    healthProfileController.updateMyProfile
);

router.patch(
    '/me/conditions',
    requireRole(UserRole.ELDERLY),
    validateRequest(healthProfileSchema.patchConditions),
    healthProfileController.patchConditions
);

router.patch(
    '/me/medications',
    requireRole(UserRole.ELDERLY),
    validateRequest(healthProfileSchema.patchMedications),
    healthProfileController.patchMedications
);

// Nurse endpoints
router.get(
    '/summary/:elderlyId',
    requireRole(UserRole.NURSE),
    healthProfileController.getSummaryForNurse
);

export default router;
