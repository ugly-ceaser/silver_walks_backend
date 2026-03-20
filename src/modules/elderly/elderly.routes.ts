import { Router } from 'express';
import * as elderlyController from './elderly.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireElderly } from '../../middlewares/rbac.middleware';
import { validateUpdateDeviceToken } from './elderly.schemaValidator';

const elderly = Router();

// Routes require authentication
elderly.use(authenticate);

// Profile management routes
elderly.patch('/me/device-token', requireElderly, validateUpdateDeviceToken, elderlyController.updateDeviceToken);

export default elderly;
