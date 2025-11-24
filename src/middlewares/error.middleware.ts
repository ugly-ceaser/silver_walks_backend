import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, handleError } from '../utils/error.util';
import { logger } from '../utils/logger.util';
import { config } from '../config/env.config';

export interface RequestWithId extends Request {
  id?: string;
}

/**
 * Global error handling middleware
 * Should be placed after all routes
 */
export const errorHandler = (
  err: Error | AppError,
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error
  logger.error('Error in request', err instanceof Error ? err : new Error(String(err)), {
    requestId: req.id,
    method: req.method,
    path: req.path,
  });

  // Handle known errors
  if (err instanceof AppError) {
    return handleError(err, res);
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const details = (err as any).errors?.map((e: any) => ({
      field: e.path,
      message: e.message,
    }));

    return handleError(
      new AppError(
        'Validation error',
        400,
        ErrorCode.VALIDATION_ERROR,
        true,
        details
      ),
      res
    );
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return handleError(
      new AppError(
        'Duplicate entry',
        409,
        ErrorCode.DUPLICATE_ENTRY,
        true
      ),
      res
    );
  }

  // Handle Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return handleError(
      new AppError(
        'Invalid reference',
        400,
        ErrorCode.VALIDATION_ERROR,
        true
      ),
      res
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return handleError(
      new AppError(
        'Invalid token',
        401,
        ErrorCode.INVALID_TOKEN,
        true
      ),
      res
    );
  }

  if (err.name === 'TokenExpiredError') {
    return handleError(
      new AppError(
        'Token expired',
        401,
        ErrorCode.TOKEN_EXPIRED,
        true
      ),
      res
    );
  }

  // Default error response
  const message = config.env === 'development' ? err.message : 'An unexpected error occurred';
  const stack = config.env === 'development' ? err.stack : undefined;

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      ...(stack && { stack }),
    },
  });
};

/**
 * 404 Not Found handler
 * Should be placed after all routes but before error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

