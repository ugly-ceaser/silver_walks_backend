import { Request, Response, NextFunction } from 'express';
import {
  extractTokenFromHeader,
  verifyAccessToken,
  JWTPayload,
} from '../utils/jwt.util';
import { UnauthorizedError } from '../utils/error.util';
import User from '../models/User.model';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    let payload: JWTPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (error: any) {
      if (error.message === 'Token expired') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }

    // Verify user still exists and is active
    const user = await User.findByPk(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('User account is inactive');
    }

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const user = await User.findByPk(payload.userId);

        if (user && user.is_active) {
          req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
          };
        }
      } catch {
        // Ignore errors for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

