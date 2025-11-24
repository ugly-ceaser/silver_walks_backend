import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/error.util';
import { UserRole } from '../models/User.model';

/**
 * Role-based access control middleware factory
 * Creates middleware that checks if user has required role(s)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Require elderly role
 */
export const requireElderly = requireRole(UserRole.ELDERLY);

/**
 * Require nurse role
 */
export const requireNurse = requireRole(UserRole.NURSE);

/**
 * Require either elderly or nurse role
 */
export const requireElderlyOrNurse = requireRole(UserRole.ELDERLY, UserRole.NURSE);

/**
 * Require either admin or nurse role
 */
export const requireAdminOrNurse = requireRole(UserRole.ADMIN, UserRole.NURSE);

/**
 * Require either admin or elderly role
 */
export const requireAdminOrElderly = requireRole(UserRole.ADMIN, UserRole.ELDERLY);

/**
 * Check if user owns resource or is admin
 * Use this for resources that belong to a specific user
 */
export const requireOwnershipOrAdmin = (getUserId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const resourceUserId = getUserId(req);
    const isOwner = req.user.userId === resourceUserId;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Access denied. You can only access your own resources.');
    }

    next();
  };
};

/**
 * Check if user owns resource (strict - no admin override)
 */
export const requireOwnership = (getUserId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const resourceUserId = getUserId(req);
    if (req.user.userId !== resourceUserId) {
      throw new ForbiddenError('Access denied. You can only access your own resources.');
    }

    next();
  };
};

