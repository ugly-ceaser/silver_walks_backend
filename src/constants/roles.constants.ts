import { UserRole } from '../models/User.model';

export const ROLES = {
  ADMIN: UserRole.ADMIN,
  ELDERLY: UserRole.ELDERLY,
  NURSE: UserRole.NURSE,
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

