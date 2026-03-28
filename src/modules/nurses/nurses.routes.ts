import { Router } from 'express';
import * as nursesController from './nurses.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireNurse } from '../../middlewares/rbac.middleware';
import {
    validateUpdateProfile,
    validateUpdateAvailability,
    validateAddCertification,
    validateCreateAvailabilityRule,
    validateUpdateDeviceToken
} from './nurses.schemaValidator';

const nurses = Router();

// Routes require authentication
nurses.use(authenticate);

// GET /api/v1/nurses - Get available nurses
nurses.get('/', nursesController.getNurses);

// Nurse management routes
nurses.get('/me', requireNurse, nursesController.getMe);
nurses.get('/clients', requireNurse, nursesController.getClients);
nurses.patch('/profile', requireNurse, validateUpdateProfile, nursesController.updateProfile);
nurses.put('/availability', requireNurse, validateUpdateAvailability, nursesController.updateAvailability);
nurses.post('/certifications', requireNurse, validateAddCertification, nursesController.addCertification);
nurses.delete('/certifications/:id', requireNurse, nursesController.removeCertification);

// Availability Rules
nurses.get('/availability/rules', requireNurse, nursesController.getAvailabilityRules);
nurses.post('/availability/rules', requireNurse, validateCreateAvailabilityRule, nursesController.createAvailabilityRule);
nurses.delete('/availability/rules/:id', requireNurse, nursesController.deleteAvailabilityRule);
nurses.patch('/me/device-token', requireNurse, validateUpdateDeviceToken, nursesController.updateDeviceToken);

export default nurses;
