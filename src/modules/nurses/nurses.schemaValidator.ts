import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationErrorResponse } from '../../utils/response.util';

/**
 * Schema for updating nurse profile
 */
export const updateNurseProfileSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    gender: Joi.string().trim().valid('male', 'female', 'other').optional(),
    address: Joi.string().trim().min(5).max(500).optional(),
    experience_years: Joi.number().integer().min(0).max(50).optional(),
    max_patients_per_day: Joi.number().integer().min(1).max(20).optional(),
    specializations: Joi.array().items(Joi.string().trim()).optional(),
    profile_picture: Joi.string().uri().optional()
});

/**
 * Schema for updating nurse availability
 */
export const updateAvailabilitySchema = Joi.object({
    slots: Joi.array().items(Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6).required(),
        startTime: Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/).required(),
        endTime: Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/).required()
    })).min(1).required()
});

/**
 * Schema for adding certification
 */
export const addCertificationSchema = Joi.object({
    name: Joi.string().trim().required(),
    issuer: Joi.string().trim().required(),
    issueDate: Joi.date().iso().required(),
    expiryDate: Joi.date().iso().allow(null).optional()
});

/**
 * Schema for creating availability rules
 */
export const createAvailabilityRuleSchema = Joi.object({
    recurrence_type: Joi.string().valid('WEEKLY', 'DAILY', 'ONCE').required(),
    day_of_week: Joi.number().integer().min(0).max(6).when('recurrence_type', {
        is: 'WEEKLY',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/).required(),
    duration_mins: Joi.number().valid(30, 45, 60).required(),
    effective_from: Joi.date().iso().required(),
    effective_until: Joi.date().iso().allow(null).optional()
});

/**
 * Middleware factory for validation
 */
const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.body, {
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
};

export const validateUpdateProfile = validate(updateNurseProfileSchema);
export const validateUpdateAvailability = validate(updateAvailabilitySchema);
export const validateAddCertification = validate(addCertificationSchema);
export const validateCreateAvailabilityRule = validate(createAvailabilityRuleSchema);
