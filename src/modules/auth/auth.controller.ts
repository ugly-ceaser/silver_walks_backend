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

import { Request, Response, NextFunction, CookieOptions } from 'express';
import * as authService from './auth.service';
import { createdResponse, successResponse } from '../../utils/response.util';
import { config } from '../../config/env.config';
import { UnauthorizedError } from '../../utils/error.util';
import { ResponseError } from '@sendgrid/mail';

export interface  HandlerContext{
  req: Request;
  res: Response;
  next: NextFunction;
} 

const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const getRequestInfo = (req: Request) => ({
  ip: req.ip || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
});

const extractRefreshToken = (req: Request): string => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) throw new UnauthorizedError('Refresh token required');
  return token;
};

/**
 * Register Elderly User (3-step flow)
 */
export const registerElderlyUser = async ({req, res, next}:HandlerContext) => {

  try {
    const result = await authService.registerElderlyUser(req.body);
    return createdResponse(res, result, 'Elderly user registered successfully.');
  } catch (error) {
    return next(error);
  }
};

// Login Elderly User
export const loginElderlyUser = async ({req, res, next}:HandlerContext) => {
  const { identifier, password } = req.body;
  const reqInfo = getRequestInfo(req);

  try {
    const result = await authService.loginElderlyUser(identifier, password, reqInfo);
    
    // Set refresh token cookie
    res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

    return createdResponse(res, result, 'Elderly user logged in successfully.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify Email with OTP
 */
export const verifyEmail = async ({req, res, next}:HandlerContext) => {
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
export const forgotPassword = async ({req, res, next}:HandlerContext) => {
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
export const resetPassword = async ({req, res, next}:HandlerContext) => {
  const { email, otp, newPassword } = req.body;
  try {
    await authService.completePasswordReset(email, otp, newPassword);
    return createdResponse(res, null, 'Password reset successfully.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Register Nurse User
 */
export const registerNurse = async ({req, res, next}:HandlerContext) => {

  try {
    const result = await authService.registerNurse(req.body);
    return createdResponse(res, result, 'Nurse registered successfully. Please check your email for verification.');
  } catch (error) {
    return next(error);
  }
};

/**
 * Login Nurse User
 */
export const loginNurse = async ({req, res, next}:HandlerContext) => {
  const { identifier, password } = req.body;
  const reqInfo = getRequestInfo(req);

  try {
    const result = await authService.loginNurse(identifier, password, reqInfo);
    
    // Set refresh token cookie
    res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

    return createdResponse(res, result, 'Nurse logged in successfully.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Refresh Tokens
 */
export const refreshTokens = async ({req, res, next}:HandlerContext) => {
  try {
    const result = await authService.refreshTokens(extractRefreshToken(req), getRequestInfo(req));
    res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());
    return createdResponse(res, result, 'Tokens refreshed successfully.', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Logout
 */
export const logout = async ({req, res, next}:HandlerContext) => {
  const refreshToken = extractRefreshToken(req);
  const userId = (req as any).user?.userId;
  const reqInfo = getRequestInfo(req);

  try {
    await authService.logout(refreshToken, userId, reqInfo);    
    res.clearCookie('refreshToken');
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
};
