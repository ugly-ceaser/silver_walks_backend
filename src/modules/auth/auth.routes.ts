import { Router } from 'express';
import {
    loginElderlyUser,
    registerElderlyUser,
    verifyEmail,
    forgotPassword,
    resetPassword,
    registerNurse,
    loginNurse,
    refreshTokens,
    logout
} from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import {
    authRateLimiter,
    emailVerificationRateLimiter,
    passwordResetRateLimiter,
    createCustomRateLimiter
} from '../../middlewares/rateLimit.middleware';

import {
    validateElderlyRegistration,
    validateElderlyLogin,
    validateForgotPassword,
    validateResetPassword,
    validateNurseRegistration,
    validateNurseLogin
} from './auth.schemaValidator';

const auth = Router();

// Stricter rate limiter for OTP verification (e.g., 5 attempts per 15 mins)
const otpVerifyRateLimiter = createCustomRateLimiter(15 * 60 * 1000, 5, 'Too many OTP verification attempts. Please try again later.');

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

/**
 * @swagger
 * /auth/login-nurse:
 *   post:
 *     summary: Login for nurse user
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
auth.post('/login-nurse', authRateLimiter, validateNurseLogin, loginNurse);
auth.post('/login-elderly', authRateLimiter, validateElderlyLogin, loginElderlyUser);

// Email Verification (legacy/specific)
auth.post('/verify-email', emailVerificationRateLimiter, verifyEmail);

// Generic OTP verification with stricter limiting
auth.post('/verify-otp', otpVerifyRateLimiter, verifyEmail); 

// Password Reset
auth.post('/forgot-password', passwordResetRateLimiter, validateForgotPassword, forgotPassword);

auth.post('/reset-password', authRateLimiter, validateResetPassword, resetPassword);

// Token Management
auth.post('/refresh', refreshTokens);
auth.post('/logout', authenticate, logout);

export default auth;