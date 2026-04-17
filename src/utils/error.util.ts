import { Response } from 'express';
import { logger } from './logger.util';


// The agreed contract shape
export interface ErrorResponseBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    field?: string;       // which form field caused the error (optional)
    details?: any;        // extra info e.g. validation breakdown (optional)
  };
}

// Error Response Options
export interface ErrorResponseOptions {
  res: Response;
  statusCode: number;
  code: ErrorCode;
  message: string;
  field?: string;
  details?: any;
}

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_PENDING = 'ACCOUNT_PENDING',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Business Logic
  INSUFFICIENT_WALKS = 'INSUFFICIENT_WALKS',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  INSUFFICIENT_POINTS = 'INSUFFICIENT_POINTS',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  NURSE_NOT_AVAILABLE = 'NURSE_NOT_AVAILABLE',
  WALK_ALREADY_SCHEDULED = 'WALK_ALREADY_SCHEDULED',

  // Under Password Reset
  RESET_TOKEN_EXPIRED = 'RESET_TOKEN_EXPIRED',
  RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  PASSWORD_SAME_AS_OLD = 'PASSWORD_SAME_AS_OLD',
  
}

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, ErrorCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, ErrorCode.CONFLICT, true, details);
  }
}

/**
 * Send error response
 */
export const sendErrorResponse = ({
  res, statusCode, code, message,field, details
}: ErrorResponseOptions): void => {
  const response: ErrorResponseBody = {   // ← typed now
    success: false,
    error: { code, message, field, details },
  };

  res.status(statusCode).json(response);
};

/**
 * Handle and send error response
 */
export const handleError = (err: Error | AppError, res: Response): void => {
  if (err instanceof AppError &&  err.isOperational) {
    sendErrorResponse({ res, statusCode: err.statusCode, code: err.code, message: err.message, details: err.details });
  }else {
    logger.error('Unexpected error', err);
    sendErrorResponse({ res, statusCode:500, code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred'});
  }
};

/**
 * Handle async errors  
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

