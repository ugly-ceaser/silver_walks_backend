import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, status, and response time
 */
export const requestLogger = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  req.startTime = Date.now();
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logging middleware (should be used after error handler)
 */
export const errorLogger = (
  err: Error,
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Request error', err, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
  });

  next(err);
};

