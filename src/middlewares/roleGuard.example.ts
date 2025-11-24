/**
 * EXAMPLE USAGE OF ROLE GUARD MIDDLEWARE
 * 
 * This file shows how to use the role guard middleware in your routes.
 * Delete this file after reviewing the examples.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from './auth.middleware';
import {
  guardAdmin,
  guardNurse,
  guardElderly,
  guardElderlyOrNurse,
  guardRole,
  guardOwnershipOrAdmin,
  guardParamOwnership,
  guardRoleAndPermission,
  guardAll,
  guardAny,
} from './roleGuard.middleware';
import { asyncHandler } from '../utils/error.util';
import { UserRole } from '../models/User.model';

const router = Router();

/**
 * Example 1: Protect route with admin role only
 * Only users with ADMIN role can access this route
 */
router.get(
  '/admin-only',
  authenticate, // First authenticate the user
  guardAdmin(), // Then check if they're admin
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'This is an admin-only route',
      user: req.user,
    });
  })
);

/**
 * Example 2: Protect route with nurse role only
 */
router.get(
  '/nurse-dashboard',
  authenticate,
  guardNurse(),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Nurse dashboard',
    });
  })
);

/**
 * Example 3: Protect route with multiple roles (OR logic)
 * Either elderly OR nurse can access
 */
router.get(
  '/walk-sessions',
  authenticate,
  guardElderlyOrNurse(),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Walk sessions accessible by elderly or nurse',
    });
  })
);

/**
 * Example 4: Protect route with specific role(s)
 */
router.post(
  '/create-activity',
  authenticate,
  guardRole(UserRole.ADMIN, UserRole.NURSE), // Admin or Nurse
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Activity created',
    });
  })
);

/**
 * Example 5: Protect route with ownership check
 * User can only access their own profile, but admin can access any
 */
router.get(
  '/profile/:userId',
  authenticate,
  guardParamOwnership('userId', true), // true = allow admin to bypass
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Accessing profile for user ${req.params.userId}`,
      userId: req.params.userId,
    });
  })
);

/**
 * Example 6: Strict ownership (no admin bypass)
 */
router.put(
  '/profile/:userId',
  authenticate,
  guardParamOwnership('userId', false), // false = even admin can't bypass
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Profile updated',
    });
  })
);

/**
 * Example 7: Custom ownership check
 * Check if user owns a resource by fetching it from database
 */
router.get(
  '/walk-session/:sessionId',
  authenticate,
  guardOwnershipOrAdmin(async (req) => {
    // In real implementation, fetch walk session from database
    // and return the elderly_id or nurse_id
    const sessionId = req.params.sessionId;
    // Example: const session = await WalkSession.findByPk(sessionId);
    // return session?.elderly_id || session?.nurse_id;
    return 'some-user-id'; // Replace with actual logic
  }),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Walk session details',
    });
  })
);

/**
 * Example 8: Role AND custom permission check
 * User must be nurse AND have specific permission
 */
router.post(
  '/approve-walk',
  authenticate,
  guardRoleAndPermission(
    [UserRole.NURSE],
    async (req) => {
      // Custom permission check
      // Example: Check if nurse is verified
      // const nurseProfile = await NurseProfile.findOne({ where: { user_id: req.user.userId } });
      // return nurseProfile?.verification_status === 'approved';
      return true; // Replace with actual logic
    }
  ),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Walk approved',
    });
  })
);

/**
 * Example 9: Combine multiple guards (ALL must pass)
 */
router.delete(
  '/sensitive-action/:resourceId',
  authenticate,
  guardAll(
    guardAdmin(), // Must be admin
    guardRoleAndPermission(
      [UserRole.ADMIN],
      async (req) => {
        // Additional check: resource must exist and be deletable
        return true; // Replace with actual logic
      }
    )
  ),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Resource deleted',
    });
  })
);

/**
 * Example 10: Combine multiple guards (ANY can pass)
 */
router.get(
  '/flexible-access',
  authenticate,
  guardAny(
    guardAdmin(), // OR admin
    guardElderlyOrNurse() // OR elderly/nurse
  ),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Access granted',
    });
  })
);

/**
 * Example 11: Protect route with query parameter ownership
 */
router.get(
  '/user-data',
  authenticate,
  guardQueryOwnership('userId', true),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'User data',
    });
  })
);

/**
 * Example 12: Protect route with body field ownership
 */
router.post(
  '/transfer',
  authenticate,
  guardBodyOwnership('fromUserId', false), // Strict ownership
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Transfer completed',
    });
  })
);

export default router;

