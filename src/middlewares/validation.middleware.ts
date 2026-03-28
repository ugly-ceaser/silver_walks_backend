import { Request, Response, NextFunction } from 'express';
import { validate, sanitizeObject } from '../utils/validation.util';
import { ValidationRule } from '../utils/validation.util';

/**
 * Validation middleware factory
 * Creates a middleware that validates request body/query/params
 */
export const validateRequest = (rules: {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      if (rules.body && req.body) {
        validate(req.body, rules.body);
        // Sanitize body
        req.body = sanitizeObject(req.body);
      }

      // Validate query
      if (rules.query && req.query) {
        validate(req.query, rules.query);
        // Sanitize query by updating properties
        const sanitizedQuery = sanitizeObject(req.query);
        Object.keys(req.query).forEach(key => delete (req.query as any)[key]);
        Object.assign(req.query, sanitizedQuery);
      }

      // Validate params
      if (rules.params && req.params) {
        validate(req.params, rules.params);
        // Sanitize params by updating properties
        const sanitizedParams = sanitizeObject(req.params);
        Object.keys(req.params).forEach(key => delete (req.params as any)[key]);
        Object.assign(req.params, sanitizedParams);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string = 'id') => {
  return validateRequest({
    params: [
      {
        field: paramName,
        rules: [
          {
            validator: (value) => {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              return uuidRegex.test(value);
            },
            message: `${paramName} must be a valid UUID`,
          },
        ],
      },
    ],
  });
};

