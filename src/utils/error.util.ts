import { Response } from 'express';
import { logger } from './logger.util';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
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
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: any
): void => {
  const response: any = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle and send error response
 */
export const handleError = (err: Error | AppError, res: Response): void => {
  if (err instanceof AppError) {
    if (err.isOperational) {
      sendErrorResponse(res, err.statusCode, err.code, err.message, err.details);
    } else {
      logger.error('Non-operational error', err);
      sendErrorResponse(
        res,
        500,
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred'
      );
    }
  } else {
    logger.error('Unexpected error', err);
    sendErrorResponse(
      res,
      500,
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred'
    );
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

