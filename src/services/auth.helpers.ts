import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { prisma } from '../config/prisma-client.config';
import {
  JWT_SECRET_TOKEN,
  FRONTEND_URL,
  USER_EMAILER
} from '../config/main.config';
import { AppError } from '../utils/AppError';
import { jwtCreateToken } from '../helpers/jwt.helper';
import transporter from '../helpers/nodemailer.helper';
import logger from '../config/logger.config';
import { user_role, PrismaClient } from '../../generated/prisma/client';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

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

export const TOKEN_EXPIRY = {
  email_verification: 60, // 1 hour
  password_reset: 15      // 15 minutes
};

export function generateToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function buildCookieToken(
  userId: number,
  email: string,
  role: user_role
) {
  return jwtCreateToken({ id: userId, email, role }, JWT_SECRET_TOKEN!, {
    expiresIn: '7d'
  });
}

function generateReferralCode(firstName: string, lastName: string): string {
  const prefix = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export async function getUniqueReferralCode(
  firstName: string,
  lastName: string
): Promise<string> {
  let code = generateReferralCode(firstName, lastName);
  let exists = await prisma.user.findUnique({ where: { referral_code: code } });
  while (exists) {
    code = generateReferralCode(firstName, lastName);
    exists = await prisma.user.findUnique({ where: { referral_code: code } });
  }
  return code;
}

export function compileTemplate(
  templateName: string,
  vars: Record<string, string>
) {
  const templatePath = path.join(__dirname, '../templates', templateName);
  const source = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(source)({
    year: new Date().getFullYear().toString(),
    ...vars
  });
}

export function sendEmailAsync(options: {
  to: string;
  subject: string;
  html: string;
}) {
  transporter
    .sendMail({ from: USER_EMAILER, ...options })
    .catch((err: unknown) => logger.error('Email send failed', { err }));
}

export function sendVerificationEmail(
  email: string,
  firstName: string,
  rawToken: string
) {
  const verifyLink = `${FRONTEND_URL}/setup-password?token=${rawToken}`;
  const html = compileTemplate('verify-email.html', {
    firstName,
    verifyLink,
    expirationTime: '1 hour'
  });
  sendEmailAsync({
    to: email,
    subject: 'Verify your MalesBeliGrocery email address',
    html
  });
}

export function sendResetEmail(
  email: string,
  firstName: string,
  rawToken: string
) {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
  const html = compileTemplate('reset-password.html', {
    firstName,
    resetLink,
    expirationTime: `${TOKEN_EXPIRY.password_reset} minutes`
  });
  sendEmailAsync({
    to: email,
    subject: 'Reset your MalesBeliGrocery password',
    html
  });
}

export async function createVerificationToken(
  userId: number,
  type: string,
  expiryMinutes: number
) {
  const { raw, hashed } = generateToken();
  const expires_at = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await prisma.verificationToken.create({
    data: { user_id: userId, token: hashed, type, expires_at }
  });
  return raw;
}

export async function invalidateTokens(userId: number, type: string) {
  await prisma.verificationToken.updateMany({
    where: { user_id: userId, type, is_used: false },
    data: { is_used: true }
  });
}

export async function validateVerificationToken(
  rawToken: string,
  expectedType: string
) {
  const hashed = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed }
  });
  if (!record || record.type !== expectedType)
    throw new AppError('Invalid or expired link', 400);
  if (record.is_used)
    throw new AppError('This link has already been used', 400);
  if (new Date(record.expires_at) < new Date())
    throw new AppError('This link has expired', 400);
  return record;
}

export async function validateReferrer(
  referral_code: string
): Promise<{ id: number }> {
  const referrer = await prisma.user.findUnique({
    where: { referral_code },
    select: { id: true }
  });
  if (!referrer) throw new AppError('Invalid referral code', 400);
  return referrer;
}

export async function applyReferralVoucher(tx: Tx, userId: number) {
  const voucher = await tx.voucher.findFirst({
    where: {
      is_referral: true,
      deleted_at: null,
      expired_at: { gt: new Date() }
    }
  });
  if (voucher) {
    await tx.userVoucher.create({
      data: { user_id: userId, voucher_id: voucher.id }
    });
  }
}
