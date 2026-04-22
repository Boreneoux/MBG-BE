import { PrismaClient } from '../../generated/prisma/client';
import {
  EMAIL_VERIFICATION_EXPIRY_MINUTES,
  PASSWORD_RESET_EXPIRY_MINUTES
} from '../config/main.config';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export const TOKEN_EXPIRY = {
  email_verification: EMAIL_VERIFICATION_EXPIRY_MINUTES,
  password_reset: PASSWORD_RESET_EXPIRY_MINUTES
} as const;

export type TokenType = keyof typeof TOKEN_EXPIRY;

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  referral_code?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleProfile {
  provider_user_id: string;
  provider_email: string;
  first_name: string;
  last_name: string;
}
