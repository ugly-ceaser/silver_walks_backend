import { Router } from 'express';
import * as walksController from './walks.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { walksSchema } from './walks.schemaValidator';
import { UserRole } from '../../models/User.model';

const walks = Router();

// All walks routes require authentication
walks.use(authenticate);

// GET /api/v1/walks - Get all walk sessions with filters
walks.get('/', walksController.getWalkSessions);

// POST /api/v1/walks - Create a new walk session
walks.post('/', validateRequest(walksSchema.createWalk), walksController.createWalk);

// POST /api/v1/walks/book - Book a specific slot
walks.post('/book', validateRequest(walksSchema.createBooking), walksController.bookSlot);

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

// --- New Sprint 2 Routes ---

walks.post(
    '/:id/start',
    requireRole(UserRole.NURSE),
    validateRequest(walksSchema.startWalk),
    walksController.startWalk
);

walks.patch(
    '/:id/metrics',
    requireRole(UserRole.NURSE),
    validateRequest(walksSchema.updateMetrics),
    walksController.updateMetrics
);

walks.post(
    '/:id/complete',
    requireRole(UserRole.NURSE),
    validateRequest(walksSchema.completeWalk),
    walksController.completeWalk
);

walks.get(
    '/schedule/daily',
    requireRole(UserRole.NURSE, UserRole.ELDERLY),
    validateRequest(walksSchema.getSchedule),
    walksController.getScheduleDaily
);

walks.get(
    '/schedule/weekly',
    requireRole(UserRole.NURSE),
    validateRequest(walksSchema.getSchedule),
    walksController.getScheduleWeekly
);

export default walks;
