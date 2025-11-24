import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { config } from '../config/env.config';
import { ErrorCode } from '../utils/error.util';

/**
 * Create rate limiter instance
 */
const createRateLimiter = (
  windowMs: number,
  maxRequests: number,
  message?: string
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: message || {
      success: false,
      error: {
        code: ErrorCode.CONFLICT,
        message: 'Too many requests, please try again later.',
      },
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: ErrorCode.CONFLICT,
          message: message || 'Too many requests, please try again later.',
        },
      });
    },
    // Use IP address as key
    keyGenerator: (req: Request) => {
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
  });
};

/**
 * General API rate limiter (from config)
 */
export const apiRateLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests,
  'Too many requests from this IP, please try again later.'
);

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  'Too many authentication attempts, please try again later.'
);

/**
 * Rate limiter for password reset
 */
export const passwordResetRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 requests per hour
  'Too many password reset attempts, please try again later.'
);

/**
 * Rate limiter for email verification
 */
export const emailVerificationRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  3, // 3 requests per 15 minutes
  'Too many email verification requests, please try again later.'
);

/**
 * Rate limiter for file uploads
 */
export const uploadRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 uploads per hour
  'Too many file uploads, please try again later.'
);

/**
 * Rate limiter for sensitive operations (payments, withdrawals)
 */
export const sensitiveOperationRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 operations per hour
  'Too many sensitive operations, please try again later.'
);

/**
 * Custom rate limiter factory
 */
export const createCustomRateLimiter = (
  windowMs: number,
  maxRequests: number,
  message?: string
): RateLimitRequestHandler => {
  return createRateLimiter(windowMs, maxRequests, message);
};

