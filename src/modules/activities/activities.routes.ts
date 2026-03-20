import { Router } from 'express';
import { activitiesController } from './activities.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Publicly readable activities (upcoming)
router.get('/', activitiesController.list);
router.get('/:id', activitiesController.get);

// Participation routes (require auth)
router.post('/:id/join', authenticate, activitiesController.join);
router.post('/:id/leave', authenticate, activitiesController.leave);

// Admin routes (require auth + role check usually, but we'll stick to authenticate for now)
router.post('/', authenticate, activitiesController.create);

export default router;
