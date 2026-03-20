import { Router } from 'express';
import { emergencyAlertsController } from './emergency-alerts.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// All emergency alert routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/emergency-alerts/trigger
 * @desc Trigger an SOS alert
 */
router.post('/trigger', emergencyAlertsController.trigger);

/**
 * @route PATCH /api/v1/emergency-alerts/:id/resolve
 * @desc Resolve an SOS alert
 */
router.patch('/:id/resolve', emergencyAlertsController.resolve);

export default router;
