import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationErrorResponse } from '../../utils/response.util';

// sanitizers (place near top of file)
const stripHtmlAndControlChars = (value: string) => {
  // remove HTML tags and non-printable/control characters
  return value.replace(/<[^>]*>?/gm, '').replace(/[\x00-\x1F\x7F]/g, '').trim();
};

const sanitize = (value: string, helpers: any) => {
  if (typeof value !== 'string') return value;
  const cleaned = stripHtmlAndControlChars(value);
  return cleaned;
};

/**
 * Schema for elderly user registration
 */
export const registerElderlySchema = Joi.object({
  // Step 1: Personal Information
  fullName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name must not exceed 100 characters',
      'any.required': 'Full name is required',
    }),

  age: Joi.number()
    .integer()
    .min(50)
    .max(120)
    .required()
    .messages({
      'number.base': 'Age must be a number',
      'number.min': 'Age must be at least 50',
      'number.max': 'Age must not exceed 120',
      'any.required': 'Age is required',
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{1,14}|0\d{9,14})$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Invalid phone number format. Use international (+1...) or local (0...) format',
      'any.required': 'Phone number is required',
    }),

  email: Joi.string()
    .trim()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Invalid email format',
    }),

  homeAddress: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Home address is required',
      'string.min': 'Home address must be at least 10 characters',
      'string.max': 'Home address must not exceed 500 characters',
      'any.required': 'Home address is required',
    }),

  gender: Joi.string()
    .trim()
    .valid('male', 'female', 'other')
    .required()
    .messages({
      'string.empty': 'Gender is required',
      'any.only': 'Gender must be male, female, or other',
      'any.required': 'Gender is required',
    }),

  // Step 2: Emergency Contact
  emergencyContactName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Emergency contact name is required',
      'string.min': 'Emergency contact name must be at least 2 characters',
      'string.max': 'Emergency contact name must not exceed 100 characters',
      'any.required': 'Emergency contact name is required',
    }),

  emergencyContactRelationship: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Relationship is required',
      'string.min': 'Relationship must be at least 2 characters',
      'string.max': 'Relationship must not exceed 50 characters',
      'any.required': 'Relationship is required',
    }),

  emergencyContactPhone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{1,14}|0\d{9,14})$/)
    .required()
    .messages({
      'string.empty': 'Emergency contact phone is required',
      'string.pattern.base': 'Invalid emergency contact phone format. Use international (+1...) or local (0...) format',
      'any.required': 'Emergency contact phone is required',
    }),

  // Step 3: Health Information (Optional)
  healthConditions: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Maximum 20 health conditions allowed',
      'string.max': 'Each health condition must not exceed 200 characters',
    }),

  currentMedications: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(30)
    .optional()
    .messages({
      'array.max': 'Maximum 30 medications allowed',
      'string.max': 'Each medication must not exceed 200 characters',
    }),

  specialNeeds: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Special needs must not exceed 1000 characters',
    }),

  mobilityLevel: Joi.string()
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.empty': 'Mobility level is optional',
    }),
});


/**
 * Login schema for elderly user
 * - identifier: email (RFC-like) OR phone (international with country code)
 * - password: min 8 chars, uppercase, lowercase, number, special char
 */
export const loginElderlySchema = Joi.object({
  identifier: Joi.alternatives()
    .try(
      Joi.string()
        .custom(sanitize, 'sanitize input')
        .lowercase()
        .trim()
        .max(254)
        .email({ tlds: { allow: false } }) // RFC-like validation via Joi
        .messages({
          'string.email': 'Invalid Credentials',
          'string.max': 'Email must not exceed 254 characters',
        }),

      Joi.string()
        .custom(sanitize, 'sanitize input')
        .trim()
        .pattern(/^\+?[1-9]\d{1,14}$/) // E.164-ish: + followed by country code and subscriber number
        .messages({
          'string.pattern.base':
            'Invalid Credentials',
        })
    )
    .required()
    .messages({
      'any.required': 'email or phone number is required',
      'alternatives.match': 'enter a valid email or phone number',
    }),

  password: Joi.string()
    .custom(sanitize, 'sanitize input')
    .min(8)
    .max(128)
    .trim()
    .pattern(/(?=.*[a-z])/, 'lowercase')
    .pattern(/(?=.*[A-Z])/, 'uppercase')
    .pattern(/(?=.*\d)/, 'number')
    .pattern(/(?=.*[^\w\s])/, 'special')
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.name':
        'Invalid Credentials',
    })
    .required(),
});


/**
 * Middleware to validate elderly registration data
 */
export const validateElderlyRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error, value } = registerElderlySchema.validate(req.body, {
    abortEarly: false, // Return all errors, not just the first one
    stripUnknown: true, // Remove unknown fields
  });

  if (error) {
    const errors = error.details.map((detail: Joi.ValidationErrorItem) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    validationErrorResponse(res, errors, 'Validation failed');
    return;
  }

  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Middleware to validate elderly user login data
 */
export const validateElderlyLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error, value } = loginElderlySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail: Joi.ValidationErrorItem) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    validationErrorResponse(res, errors, 'Validation failed');
    return;
  }

  req.body = value;
  next();
};

/**
 * Forgot Password Schema
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .custom(sanitize, 'sanitize input')
    .lowercase()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .custom(sanitize, 'sanitize input')
    .lowercase()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  otp: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'OTP is required',
    }),

  newPassword: Joi.string()
    .custom(sanitize, 'sanitize input')
    .min(8)
    .max(128)
    .trim()
    .pattern(/(?=.*[a-z])/, 'lowercase')
    .pattern(/(?=.*[A-Z])/, 'uppercase')
    .pattern(/(?=.*\d)/, 'number')
    .pattern(/(?=.*[^\w\s])/, 'special')
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.name':
        'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    })
    .required(),
});

/**
 * Middleware to validate forgot password data
 */
export const validateForgotPassword = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error, value } = forgotPasswordSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail: Joi.ValidationErrorItem) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    validationErrorResponse(res, errors, 'Validation failed');
    return;
  }

  req.body = value;
  next();
};

/**
 * Middleware to validate reset password data
 */
export const validateResetPassword = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error, value } = resetPasswordSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail: Joi.ValidationErrorItem) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    validationErrorResponse(res, errors, 'Validation failed');
    return;
  }

  req.body = value;
  next();
};

/**
 * Schema for nurse registration
 */
export const registerNurseSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  gender: Joi.string().trim().valid('male', 'female', 'other').required(),
  yearsOfExperience: Joi.number().integer().min(0).max(50).required(),
  maxPatientsPerDay: Joi.number().integer().min(1).max(20).required(),
  address: Joi.string().trim().min(5).max(500).required(),
  specializations: Joi.array().items(Joi.string().trim()).min(1).required(),
  certifications: Joi.array().items(Joi.object({
    name: Joi.string().trim().required(),
    issuer: Joi.string().trim().required(),
    issueDate: Joi.date().iso().required(),
    expiryDate: Joi.date().iso().allow(null).optional()
  })).min(1).required(),
  availableTimeSlots: Joi.array().items(Joi.object({
    dayOfWeek: Joi.number().integer().min(0).max(6).required(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/).required(),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/).required()
  })).min(1).required()
});

/**
 * Middleware to validate nurse registration data
 */
export const validateNurseRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error, value } = registerNurseSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail: Joi.ValidationErrorItem) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    validationErrorResponse(res, errors, 'Validation failed');
    return;
  }

  req.body = value;
  next();
};
