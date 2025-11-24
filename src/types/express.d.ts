import { Request } from 'express';
import { UserRole } from '../models/User.model';
import { JWTPayload } from '../utils/jwt.util';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
      requestId?: string;
    }
  }
}

