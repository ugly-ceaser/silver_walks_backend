import { Router } from 'express';
import { ratingsController } from './ratings.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// All rating routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/ratings/submit
 * @desc Submit rating for a walk
 */
router.post('/submit', ratingsController.submit);

/**
 * @route GET /api/v1/ratings/gate-status
 * @desc Check if user is blocked by rating gate
 */
router.get('/gate-status', ratingsController.checkGate);

export default router;
