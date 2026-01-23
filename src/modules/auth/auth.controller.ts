// Middlewares
import { authenticate } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { requireRole, requireAdmin, requireElderly, requireNurse } from '../../middlewares/rbac.middleware';
import { activityTracker } from '../../middlewares/activityTracker.middleware';

// Cloudinary middleware
import { uploadToCloudinarySingle, uploadToCloudinaryMultiple } from '../../middlewares/cloudinary.middleware';

// Rate limiting middlewares code
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
    return createdResponse(res, result, 'Elderly user logged in successfully.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify Email with OTP
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp } = req.body;
  try {
    await authService.verifyEmailWithOtp(email, otp);
    return createdResponse(res, null, 'Email verified successfully.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Forgot Password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  try {
    await authService.initiatePasswordReset(email);
    // Always return success even if email doesn't exist (security)
    return createdResponse(res, null, 'If that email exists, a password reset code has been sent.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Reset Password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp, newPassword } = req.body;
  try {
    await authService.completePasswordReset(email, otp, newPassword);
    return createdResponse(res, null, 'Password reset successfully.', 200);
  } catch (error) {
    return next(error);
  }
};