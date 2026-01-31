import { Router } from 'express';
import {
    loginElderlyUser,
    registerElderlyUser,
    verifyEmail,
    forgotPassword,
    resetPassword,
    registerNurse
} from './auth.controller';
import {
    authRateLimiter,
    emailVerificationRateLimiter,
    passwordResetRateLimiter
} from '../../middlewares/rateLimit.middleware';

import {
    validateElderlyRegistration,
    validateElderlyLogin,
    validateForgotPassword,
    validateResetPassword,
    validateNurseRegistration
} from './auth.schemaValidator';

const auth = Router();

/**
 * @swagger
 * /auth/register-elderly:
 *   post:
 *     summary: Register a new elderly user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - age
 *               - phone
 *               - homeAddress
 *               - gender
 *               - emergencyContactName
 *               - emergencyContactRelationship
 *               - emergencyContactPhone
 *             properties:
 *               fullName:
 *                 type: string
 *               age:
 *                 type: integer
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               homeAddress:
 *                 type: string
 *               gender:
 *                 type: string
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactRelationship:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               mobilityLevel:
 *                 type: string
 *     responses:
 *       201:
 *         description: Elderly user registered successfully
 *       422:
 *         description: Validation failed
 */
// Elderly registration route
auth.post('/register-elderly', authRateLimiter, validateElderlyRegistration, registerElderlyUser);

/**
 * @swagger
 * /auth/login-elderly:
 *   post:
 *     summary: Login for elderly user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or phone number
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
auth.post('/register-nurse', authRateLimiter, validateNurseRegistration, registerNurse);
auth.post('/login-elderly', authRateLimiter, validateElderlyLogin, loginElderlyUser);

// Email Verification
auth.post('/verify-email', emailVerificationRateLimiter, verifyEmail);

// Password Reset
auth.post('/forgot-password', passwordResetRateLimiter, validateForgotPassword, forgotPassword);
auth.post('/reset-password', authRateLimiter, validateResetPassword, resetPassword);

export default auth;