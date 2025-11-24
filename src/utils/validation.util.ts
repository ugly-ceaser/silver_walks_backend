import { ValidationError } from '../utils/error.util';

export interface ValidationRule {
  field: string;
  rules: Array<{
    validator: (value: any, data: any) => boolean;
    message: string;
  }>;
}

/**
 * Common validation functions
 */
export const validators = {
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  minLength: (min: number) => (value: string): boolean => {
    return value.length >= min;
  },

  maxLength: (max: number) => (value: string): boolean => {
    return value.length <= max;
  },

  min: (min: number) => (value: number): boolean => {
    return value >= min;
  },

  max: (max: number) => (value: number): boolean => {
    return value <= max;
  },

  isNumber: (value: any): boolean => {
    return !isNaN(Number(value));
  },

  isInteger: (value: any): boolean => {
    return Number.isInteger(Number(value));
  },

  isPositive: (value: number): boolean => {
    return value > 0;
  },

  isNonNegative: (value: number): boolean => {
    return value >= 0;
  },

  isUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isEnum: (enumObject: any) => (value: any): boolean => {
    return Object.values(enumObject).includes(value);
  },

  isDate: (value: any): boolean => {
    return value instanceof Date && !isNaN(value.getTime());
  },

  isPhone: (value: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
  },

  isUrl: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Validate data against rules
 */
export const validate = (data: any, rules: ValidationRule[]): void => {
  const errors: Array<{ field: string; message: string }> = [];

  for (const rule of rules) {
    const value = data[rule.field];

    for (const { validator, message } of rule.rules) {
      if (!validator(value, data)) {
        errors.push({ field: rule.field, message });
        break; // Stop at first error for this field
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
};

/**
 * Sanitize string input
 */
export const sanitizeString = (value: string): string => {
  return value.trim().replace(/[<>]/g, '');
};

/**
 * Sanitize object (recursive)
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
};

