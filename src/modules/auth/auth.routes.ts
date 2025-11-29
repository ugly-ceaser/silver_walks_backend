import { Router } from 'express';
import { loginElderlyUser, registerElderlyUser } from './auth.controller';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware';

import { validateElderlyRegistration, validateElderlyLogin } from './auth.schemaValidator';

const auth = Router();

// Elderly registration route
auth.post('/register-elderly', authRateLimiter, validateElderlyRegistration, registerElderlyUser);
auth.post('/login-elderly', authRateLimiter, validateElderlyLogin, loginElderlyUser);
export default auth;