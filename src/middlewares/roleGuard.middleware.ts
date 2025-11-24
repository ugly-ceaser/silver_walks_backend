import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/error.util';
import { UserRole } from '../models/User.model';

/**
 * Role Guard Middleware
 * Comprehensive role-based access control with flexible permission checking
 */

// Permission checker function type
type PermissionChecker = (req: Request) => boolean | Promise<boolean>;

// Role guard configuration
interface RoleGuardConfig {
  roles?: UserRole[];
  requireAll?: boolean; // If true, user must have ALL roles (AND), otherwise ANY role (OR)
  customCheck?: PermissionChecker;
  allowIf?: PermissionChecker; // Additional condition that allows access
  denyIf?: PermissionChecker; // Condition that denies access
  errorMessage?: string;
}

/**
 * Main role guard middleware factory
 * Creates middleware that enforces role-based access control
 */
export const roleGuard = (config: RoleGuardConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if user account is active (if you add this check to auth middleware, remove this)
      // This is a safety check

      // Deny if condition is met
      if (config.denyIf) {
        const shouldDeny = await Promise.resolve(config.denyIf(req));
        if (shouldDeny) {
          throw new ForbiddenError(
            config.errorMessage || 'Access denied'
          );
        }
      }

      // Allow if condition is met (bypasses role check)
      if (config.allowIf) {
        const shouldAllow = await Promise.resolve(config.allowIf(req));
        if (shouldAllow) {
          return next();
        }
      }

      // Role-based check
      if (config.roles && config.roles.length > 0) {
        const userRole = req.user.role;
        
        if (config.requireAll) {
          // User must have ALL specified roles (AND logic)
          // Since a user can only have one role, this will only work if roles array has one element
          if (!config.roles.includes(userRole)) {
            throw new ForbiddenError(
              config.errorMessage || 
              `Access denied. Required roles: ${config.roles.join(' and ')}`
            );
          }
        } else {
          // User must have ANY of the specified roles (OR logic)
          if (!config.roles.includes(userRole)) {
            throw new ForbiddenError(
              config.errorMessage || 
              `Access denied. Required role: ${config.roles.join(' or ')}`
            );
          }
        }
      }

      // Custom permission check
      if (config.customCheck) {
        const hasPermission = await Promise.resolve(config.customCheck(req));
        if (!hasPermission) {
          throw new ForbiddenError(
            config.errorMessage || 'Access denied. Insufficient permissions.'
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require specific role(s)
 */
export const guardRole = (...roles: UserRole[]) => {
  return roleGuard({ roles });
};

/**
 * Require admin role
 */
export const guardAdmin = () => {
  return roleGuard({
    roles: [UserRole.ADMIN],
    errorMessage: 'Access denied. Admin role required.',
  });
};

/**
 * Require elderly role
 */
export const guardElderly = () => {
  return roleGuard({
    roles: [UserRole.ELDERLY],
    errorMessage: 'Access denied. Elderly role required.',
  });
};

/**
 * Require nurse role
 */
export const guardNurse = () => {
  return roleGuard({
    roles: [UserRole.NURSE],
    errorMessage: 'Access denied. Nurse role required.',
  });
};

/**
 * Require either elderly or nurse role
 */
export const guardElderlyOrNurse = () => {
  return roleGuard({
    roles: [UserRole.ELDERLY, UserRole.NURSE],
    errorMessage: 'Access denied. Elderly or Nurse role required.',
  });
};

/**
 * Require either admin or nurse role
 */
export const guardAdminOrNurse = () => {
  return roleGuard({
    roles: [UserRole.ADMIN, UserRole.NURSE],
    errorMessage: 'Access denied. Admin or Nurse role required.',
  });
};

/**
 * Require either admin or elderly role
 */
export const guardAdminOrElderly = () => {
  return roleGuard({
    roles: [UserRole.ADMIN, UserRole.ELDERLY],
    errorMessage: 'Access denied. Admin or Elderly role required.',
  });
};

/**
 * Guard that allows admin to bypass, otherwise requires ownership
 */
export const guardOwnershipOrAdmin = (getResourceUserId: (req: Request) => string | Promise<string>) => {
  return roleGuard({
    allowIf: async (req) => {
      if (!req.user) return false;
      if (req.user.role === UserRole.ADMIN) return true;
      
      const resourceUserId = await Promise.resolve(getResourceUserId(req));
      return req.user.userId === resourceUserId;
    },
    errorMessage: 'Access denied. You can only access your own resources.',
  });
};

/**
 * Guard that strictly requires ownership (no admin bypass)
 */
export const guardOwnership = (getResourceUserId: (req: Request) => string | Promise<string>) => {
  return roleGuard({
    customCheck: async (req) => {
      if (!req.user) return false;
      const resourceUserId = await Promise.resolve(getResourceUserId(req));
      return req.user.userId === resourceUserId;
    },
    errorMessage: 'Access denied. You can only access your own resources.',
  });
};

/**
 * Guard that requires role AND custom permission check
 */
export const guardRoleAndPermission = (
  roles: UserRole[],
  permissionCheck: PermissionChecker
) => {
  return roleGuard({
    roles,
    customCheck: permissionCheck,
    errorMessage: 'Access denied. Insufficient role or permissions.',
  });
};

/**
 * Guard that requires role OR custom permission check
 */
export const guardRoleOrPermission = (
  roles: UserRole[],
  permissionCheck: PermissionChecker
) => {
  return roleGuard({
    allowIf: async (req) => {
      if (!req.user) return false;
      
      // Check if user has required role
      if (roles.includes(req.user.role)) return true;
      
      // Check custom permission
      return await Promise.resolve(permissionCheck(req));
    },
    errorMessage: 'Access denied. Required role or permission not met.',
  });
};

/**
 * Guard that requires user to be the owner of a resource identified by a parameter
 * Common use case: /users/:userId - user can only access their own profile
 */
export const guardParamOwnership = (paramName: string = 'userId', allowAdmin: boolean = true) => {
  return roleGuard({
    allowIf: async (req) => {
      if (!req.user) return false;
      
      const paramUserId = req.params[paramName];
      if (!paramUserId) return false;
      
      // Admin can access any user's resource
      if (allowAdmin && req.user.role === UserRole.ADMIN) return true;
      
      // User can only access their own resource
      return req.user.userId === paramUserId;
    },
    errorMessage: `Access denied. You can only access your own ${paramName}.`,
  });
};

/**
 * Guard that requires user to be the owner of a resource identified by a query parameter
 */
export const guardQueryOwnership = (queryName: string = 'userId', allowAdmin: boolean = true) => {
  return roleGuard({
    allowIf: async (req) => {
      if (!req.user) return false;
      
      const queryUserId = req.query[queryName] as string;
      if (!queryUserId) return false;
      
      // Admin can access any user's resource
      if (allowAdmin && req.user.role === UserRole.ADMIN) return true;
      
      // User can only access their own resource
      return req.user.userId === queryUserId;
    },
    errorMessage: `Access denied. You can only access your own ${queryName}.`,
  });
};

/**
 * Guard that requires user to be the owner of a resource identified in request body
 */
export const guardBodyOwnership = (bodyField: string = 'userId', allowAdmin: boolean = true) => {
  return roleGuard({
    allowIf: async (req) => {
      if (!req.user) return false;
      
      const bodyUserId = req.body[bodyField];
      if (!bodyUserId) return false;
      
      // Admin can access any user's resource
      if (allowAdmin && req.user.role === UserRole.ADMIN) return true;
      
      // User can only access their own resource
      return req.user.userId === bodyUserId;
    },
    errorMessage: `Access denied. You can only access your own ${bodyField}.`,
  });
};

/**
 * Composite guard - combine multiple guards
 * All guards must pass for access to be granted
 */
export const guardAll = (...guards: Array<(req: Request, res: Response, next: NextFunction) => void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const guard of guards) {
      await new Promise<void>((resolve, reject) => {
        guard(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    next();
  };
};

/**
 * Composite guard - any guard can pass
 * At least one guard must pass for access to be granted
 */
export const guardAny = (...guards: Array<(req: Request, res: Response, next: NextFunction) => void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: Error[] = [];
    
    for (const guard of guards) {
      try {
        await new Promise<void>((resolve, reject) => {
          guard(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        // If we get here, this guard passed
        return next();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    // All guards failed
    throw new ForbiddenError('Access denied. None of the required conditions were met.');
  };
};

