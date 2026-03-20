import { Response } from 'express';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  isLastPage: boolean;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Success response builder
 */
export const successResponse = <T = any>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: any
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message: message || 'Request successful',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Error response builder
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: code || 'INTERNAL_ERROR',
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Paginated response builder
 */
export const paginatedResponse = <T = any>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message?: string
): Response => {
  const response: ApiResponse<T[]> = {
    success: true,
    message: message || 'Request successful',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
    },
  };

  return res.status(200).json(response);
};

/**
 * Created response (201)
 */
export const createdResponse = <T = any>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 201
): Response => {
  return successResponse(res, data, message || 'Resource created successfully', statusCode);
};

/**
 * No content response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Bad request response (400)
 */
export const badRequestResponse = (
  res: Response,
  message: string = 'Bad request',
  details?: any
): Response => {
  return errorResponse(res, message, 400, 'BAD_REQUEST', details);
};

/**
 * Unauthorized response (401)
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Forbidden response (403)
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return errorResponse(res, message, 403, 'FORBIDDEN');
};

/**
 * Not found response (404)
 */
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return errorResponse(res, message, 404, 'NOT_FOUND');
};

/**
 * Validation error response (422)
 */
export const validationErrorResponse = (
  res: Response,
  errors: any,
  message: string = 'Validation failed'
): Response => {
  return errorResponse(res, message, 422, 'VALIDATION_ERROR', errors);
};
