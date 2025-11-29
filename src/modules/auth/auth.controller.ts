// Middlewares
import { authenticate } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { requireRole, requireAdmin, requireElderly, requireNurse } from '../../middlewares/rbac.middleware';
import { activityTracker } from '../../middlewares/activityTracker.middleware';

// Cloudinary middleware
import { uploadToCloudinarySingle, uploadToCloudinaryMultiple } from '../../middlewares/cloudinary.middleware';

// Rate limiting middlewares
import {
  apiRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  uploadRateLimiter,
  sensitiveOperationRateLimiter,
  createCustomRateLimiter,
} from '../../middlewares/rateLimit.middleware';

// JWT functions
import {
  extractTokenFromHeader,
  verifyAccessToken,
  generateAccessToken,
  generateRefreshToken,
  JWTPayload,
  TokenPair,
} from '../../utils/jwt.util';

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { createdResponse } from '../../utils/response.util';

/**
 * Register Elderly User (3-step flow)
 */
export const registerElderlyUser = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Registering elderly user:", req.body);
  try {
    
    const result = await authService.registerElderlyUser(req.body);
    return createdResponse(res, result, 'Elderly user registered successfully.');
  } catch (error) {
    return next(error);
  }
};

// Login Elderly User
export const loginElderlyUser = async (req: Request, res: Response, next: NextFunction) => {
  const { identifier, password } = req.body;
  try {
    const result = await authService.loginElderlyUser(identifier, password);
    return createdResponse(res, result, 'Elderly user logged in successfully.');
  } catch (error) {
    return next(error);
  }
};