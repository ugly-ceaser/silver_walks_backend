import { Request, Response, NextFunction } from 'express';
import ActivityTracker, { ActivityAction, ActivityStatus } from '../models/ActivityTracker.model';
import { UserRole } from '../models/User.model';
import { logger } from '../utils/logger.util';
import '../types/express.d'; // Ensure extended Request type is available

/**
 * Configuration for activity tracking
 */
interface ActivityTrackerConfig {
  trackMethods?: string[]; // HTTP methods to track (default: ['POST', 'PATCH', 'DELETE'])
  trackRoles?: UserRole[]; // Roles to track (default: ['admin', 'nurse'])
  excludePaths?: string[]; // Paths to exclude from tracking
  includePaths?: string[]; // If specified, only track these paths
  sanitizeBody?: boolean; // Remove sensitive fields from request body
  sensitiveFields?: string[]; // Fields to remove from request body
  extractResourceInfo?: (req: Request) => {
    resourceType?: string;
    resourceId?: string;
  };
}

/**
 * Default configuration
 */
const defaultConfig: Required<ActivityTrackerConfig> = {
  trackMethods: ['POST', 'PATCH', 'DELETE'],
  trackRoles: [UserRole.ADMIN, UserRole.NURSE],
  excludePaths: ['/health', '/api/health'],
  includePaths: [],
  sanitizeBody: true,
  sensitiveFields: ['password', 'password_hash', 'token', 'secret', 'api_key', 'access_token'],
  extractResourceInfo: (req: Request) => {
    // Try to extract resource info from URL params
    const resourceId = req.params.id || req.params.userId || req.params.nurseId || req.params.elderlyId;
    const resourceType = req.path.split('/').filter(Boolean).pop()?.replace(/s$/, ''); // Remove plural
    
    return {
      resourceType,
      resourceId,
    };
  },
};

/**
 * Sanitize request body by removing sensitive fields
 */
const sanitizeRequestBody = (
  body: any,
  sensitiveFields: string[]
): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key], sensitiveFields);
    }
  }

  return sanitized;
};

/**
 * Map HTTP method to activity action
 */
const mapMethodToAction = (method: string): ActivityAction => {
  const upperMethod = method.toUpperCase();
  switch (upperMethod) {
    case 'POST':
      return ActivityAction.CREATE;
    case 'PATCH':
    case 'PUT':
      return ActivityAction.UPDATE;
    case 'DELETE':
      return ActivityAction.DELETE;
    default:
      return ActivityAction.OTHER;
  }
};

/**
 * Activity tracker middleware
 * Tracks POST, PATCH, and DELETE requests from nurses and admins
 */
export const activityTracker = (config: ActivityTrackerConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip if user is not authenticated
    if (!req.user) {
      return next();
    }

    // Skip if user role is not in trackRoles
    const userRole = req.user.role;
    if (!finalConfig.trackRoles.includes(userRole)) {
      return next();
    }

    // Skip if method is not in trackMethods
    if (!finalConfig.trackMethods.includes(req.method)) {
      return next();
    }

    // Skip if path is excluded
    if (finalConfig.excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Skip if includePaths is specified and path is not included
    if (
      finalConfig.includePaths.length > 0 &&
      !finalConfig.includePaths.some((path) => req.path.startsWith(path))
    ) {
      return next();
    }

    // Extract resource info
    const resourceInfo = finalConfig.extractResourceInfo(req);

    // Sanitize request body
    let sanitizedBody: any = undefined;
    if (req.body && Object.keys(req.body).length > 0) {
      sanitizedBody = finalConfig.sanitizeBody
        ? sanitizeRequestBody(req.body, finalConfig.sensitiveFields)
        : req.body;
    }

    // Create activity record (initially with PENDING status)
    let activityRecord: ActivityTracker | null = null;
    
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      activityRecord = await ActivityTracker.create({
        user_id: userId,
        user_role: userRole,
        action: mapMethodToAction(req.method),
        method: req.method,
        endpoint: req.path,
        resource_type: resourceInfo.resourceType,
        resource_id: resourceInfo.resourceId,
        request_body: sanitizedBody,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.get('user-agent'),
        status: ActivityStatus.PENDING,
        metadata: {
          query: req.query,
          params: req.params,
        },
      });
    } catch (error) {
      // Log error but don't block the request
      logger.error('Failed to create activity tracker record', error as Error);
    }

    // Store activity record ID in response locals for later update
    if (activityRecord) {
      res.locals.activityTrackerId = activityRecord.id;
    }

    // Override res.end to capture response status
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any): Response {
      // Update activity record with response status
      if (activityRecord && res.locals.activityTrackerId) {
        updateActivityRecord(
          res.locals.activityTrackerId,
          res.statusCode,
          res.statusCode >= 200 && res.statusCode < 300
            ? ActivityStatus.SUCCESS
            : ActivityStatus.FAILED
        ).catch((error) => {
          logger.error('Failed to update activity tracker record', error);
        });
      }

      return originalEnd(chunk, encoding);
    };

    // Handle errors
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      // If there's an error in the response, update activity record
      if (activityRecord && res.locals.activityTrackerId && body?.error) {
        updateActivityRecord(
          res.locals.activityTrackerId,
          res.statusCode,
          ActivityStatus.FAILED,
          body.error.message || 'Request failed'
        ).catch((error) => {
          logger.error('Failed to update activity tracker record', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Update activity record with response information
 */
const updateActivityRecord = async (
  activityId: string,
  responseStatus: number,
  status: ActivityStatus,
  errorMessage?: string
): Promise<void> => {
  try {
    await ActivityTracker.update(
      {
        response_status: responseStatus,
        status,
        error_message: errorMessage,
      },
      {
        where: { id: activityId },
      }
    );
  } catch (error) {
    logger.error('Failed to update activity tracker', error as Error);
  }
};

/**
 * Error handler for activity tracker
 * Updates activity record when an error occurs
 */
export const activityTrackerErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.locals.activityTrackerId) {
    updateActivityRecord(
      res.locals.activityTrackerId,
      res.statusCode || 500,
      ActivityStatus.FAILED,
      err.message
    ).catch((error) => {
      logger.error('Failed to update activity tracker on error', error);
    });
  }

  next(err);
};

/**
 * Pre-configured activity tracker for nurses and admins
 * Tracks POST, PATCH, DELETE requests
 */
export const trackNurseAdminActivity = activityTracker({
  trackMethods: ['POST', 'PATCH', 'DELETE'],
  trackRoles: [UserRole.ADMIN, UserRole.NURSE],
});

/**
 * Activity tracker that only tracks admin actions
 */
export const trackAdminActivity = activityTracker({
  trackMethods: ['POST', 'PATCH', 'DELETE'],
  trackRoles: [UserRole.ADMIN],
});

/**
 * Activity tracker that only tracks nurse actions
 */
export const trackNurseActivity = activityTracker({
  trackMethods: ['POST', 'PATCH', 'DELETE'],
  trackRoles: [UserRole.NURSE],
});

