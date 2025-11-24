/**
 * EXAMPLE USAGE OF ACTIVITY TRACKER MIDDLEWARE
 * 
 * This file shows how to use the activity tracker middleware.
 * Delete this file after reviewing the examples.
 */

import { Router } from 'express';
import { authenticate } from './auth.middleware';
import {
  activityTracker,
  trackNurseAdminActivity,
  trackAdminActivity,
  trackNurseActivity,
  activityTrackerErrorHandler,
} from './activityTracker.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

/**
 * Example 1: Use pre-configured tracker for nurses and admins
 * This tracks all POST, PATCH, DELETE requests from nurses and admins
 */
router.use(
  authenticate, // Must authenticate first
  trackNurseAdminActivity // Then track activities
);

/**
 * Example 2: Track only admin activities
 */
router.use(
  authenticate,
  trackAdminActivity
);

/**
 * Example 3: Track only nurse activities
 */
router.use(
  authenticate,
  trackNurseActivity
);

/**
 * Example 4: Custom activity tracker configuration
 */
router.use(
  authenticate,
  activityTracker({
    trackMethods: ['POST', 'PATCH', 'DELETE', 'PUT'], // Track PUT as well
    trackRoles: [UserRole.ADMIN, UserRole.NURSE],
    excludePaths: ['/health', '/api/health', '/api/v1/auth/login'], // Exclude certain paths
    sanitizeBody: true, // Remove sensitive fields
    sensitiveFields: ['password', 'password_hash', 'token', 'secret'],
    extractResourceInfo: (req) => {
      // Custom resource extraction logic
      const resourceId = req.params.id || req.params.userId;
      const resourceType = req.path.split('/').filter(Boolean).pop();
      
      return {
        resourceType,
        resourceId,
      };
    },
  })
);

/**
 * Example 5: Track specific paths only
 */
router.use(
  authenticate,
  activityTracker({
    includePaths: ['/api/v1/users', '/api/v1/walks', '/api/v1/subscriptions'],
    // Only track activities on these paths
  })
);

/**
 * Example 6: Use in app.ts (global middleware)
 * 
 * In your app.ts file:
 * 
 * import { trackNurseAdminActivity, activityTrackerErrorHandler } from './middlewares/activityTracker.middleware';
 * import { authenticate } from './middlewares/auth.middleware';
 * 
 * // Apply after authentication middleware
 * app.use('/api', authenticate, trackNurseAdminActivity);
 * 
 * // Apply error handler after routes but before global error handler
 * app.use(activityTrackerErrorHandler);
 */

/**
 * Example 7: Query activity logs
 * 
 * import ActivityTracker from '../models/ActivityTracker.model';
 * 
 * // Get all activities for a user
 * const userActivities = await ActivityTracker.findAll({
 *   where: { user_id: userId },
 *   order: [['created_at', 'DESC']],
 * });
 * 
 * // Get all admin activities
 * const adminActivities = await ActivityTracker.findAll({
 *   where: { user_role: 'admin' },
 *   order: [['created_at', 'DESC']],
 * });
 * 
 * // Get activities by action type
 * const deleteActivities = await ActivityTracker.findAll({
 *   where: { action: 'delete' },
 * });
 * 
 * // Get activities by resource type
 * const userResourceActivities = await ActivityTracker.findAll({
 *   where: { resource_type: 'user' },
 * });
 * 
 * // Get failed activities
 * const failedActivities = await ActivityTracker.findAll({
 *   where: { status: 'failed' },
 * });
 */

export default router;

