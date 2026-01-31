import { Router } from 'express';
import * as walksController from './walks.controller';
import { authenticate } from '../../middlewares/auth.middleware';

import { validateCreateWalk } from './walks.schemaValidator';

const walks = Router();

// All walks routes require authentication
walks.use(authenticate);

// GET /api/v1/walks - Get all walk sessions with filters
walks.get('/', walksController.getWalkSessions);

// POST /api/v1/walks - Create a new walk session
walks.post('/', validateCreateWalk, walksController.createWalk);

// POST /api/v1/walks/match - Find a matching nurse
walks.post('/match', walksController.matchWalk);

// GET /api/v1/walks/slots - Get available time slots
walks.get('/slots', walksController.getAvailableSlots);

// GET /api/v1/walks/today - Get today's walk session
walks.get('/today', walksController.getTodayWalk);

// GET /api/v1/walks/weekly - Get weekly walk sessions
walks.get('/weekly', walksController.getWeeklyWalks);

// GET /api/v1/walks/stats - Get walk statistics
walks.get('/stats', walksController.getWalkStats);

export default walks;
