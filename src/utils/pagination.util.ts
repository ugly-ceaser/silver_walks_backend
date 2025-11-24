import { Request } from 'express';
import { config } from '../config/env.config';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Extract pagination parameters from request query
 */
export const getPaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    config.pagination.maxLimit,
    Math.max(1, parseInt(req.query.limit as string) || config.pagination.defaultLimit)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Create pagination metadata
 */
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Create paginated response
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => {
  return {
    data,
    meta: createPaginationMeta(page, limit, total),
  };
};

/**
 * Validate pagination parameters
 */
export const validatePaginationParams = (page: number, limit: number): void => {
  if (page < 1) {
    throw new Error('Page must be greater than 0');
  }
  if (limit < 1) {
    throw new Error('Limit must be greater than 0');
  }
  if (limit > config.pagination.maxLimit) {
    throw new Error(`Limit cannot exceed ${config.pagination.maxLimit}`);
  }
};

