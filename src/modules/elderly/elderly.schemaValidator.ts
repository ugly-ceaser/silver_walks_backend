import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationErrorResponse } from '../../utils/response.util';

/**
 * Schema for updating device token
 */
export const updateDeviceTokenSchema = Joi.object({
    token: Joi.string().trim().max(512).required()
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

export const validateUpdateDeviceToken = validate(updateDeviceTokenSchema);
