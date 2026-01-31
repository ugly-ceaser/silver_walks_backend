import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationErrorResponse } from '../../utils/response.util';

/**
 * Schema for creating walk sessions (supports multiple dates)
 */
export const createWalkSchema = Joi.object({
    scheduledDates: Joi.array().items(Joi.date().iso()).min(1).required(),
    scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/).required(),
    duration: Joi.number().integer().min(15).max(120).required(),
    matchingMode: Joi.string().valid('auto', 'manual').required(),
    nurseId: Joi.string().uuid().when('matchingMode', {
        is: 'manual',
        then: Joi.required(),
        otherwise: Joi.optional()
    })
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

export const validateCreateWalk = validate(createWalkSchema);
