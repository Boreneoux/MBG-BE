import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import handlebars, { TemplateDelegate } from 'handlebars';
import {
  JWT_SECRET_TOKEN,
  JWT_ACCESS_TOKEN_EXPIRY,
  FRONTEND_URL,
  USER_EMAILER
} from '../config/main.config';
import { jwtCreateToken } from '../helpers/jwt.helper';
import transporter from '../helpers/nodemailer.helper';
import logger from '../config/logger.config';
import { user_role } from '../../generated/prisma/client';
import { TOKEN_EXPIRY } from '../types/auth';

const templateCache = new Map<string, TemplateDelegate>();

function getCompiledTemplate(templateName: string): TemplateDelegate {
  if (!templateCache.has(templateName)) {
    const templatePath = path.join(__dirname, '../templates', templateName);
    const source = fs.readFileSync(templatePath, 'utf-8');
    templateCache.set(templateName, handlebars.compile(source));
  }
  return templateCache.get(templateName)!;
}

export function generateToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function buildTokenPair(
  userId: number,
  email: string,
  role: user_role
): { accessToken: string; refreshToken: { raw: string; hashed: string } } {
  const accessToken = jwtCreateToken(
    { id: userId, email, role },
    JWT_SECRET_TOKEN!,
    { expiresIn: JWT_ACCESS_TOKEN_EXPIRY as any }
  );
  const refreshToken = generateToken();
  return { accessToken, refreshToken };
}

export function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000
  };
  return value * multipliers[match[2]];
}

export function generateReferralCode(
  firstName: string,
  lastName: string
): string {
  const prefix = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export function compileTemplate(
  templateName: string,
  vars: Record<string, string>
): string {
  const template = getCompiledTemplate(templateName);
  return template({ year: new Date().getFullYear().toString(), ...vars });
}

export function sendEmailAsync(options: {
  to: string;
  subject: string;
  html: string;
}): void {
  transporter
    .sendMail({ from: USER_EMAILER, ...options })
    .catch((err: unknown) => logger.error('Email send failed', { err }));
}

export function sendVerificationEmail(
  email: string,
  firstName: string,
  rawToken: string
): void {
  try {
    const verifyLink = `${FRONTEND_URL}/setup-password?token=${rawToken}`;
    const html = compileTemplate('verify-email.html', {
      firstName,
      verifyLink,
      expirationTime: '1 hour'
    });
    sendEmailAsync({
      to: email,
      subject: 'Verify your MagerBeliGrocery email address',
      html
    });
  } catch (err) {
    logger.error('Failed to send verification email', { err });
  }
}

export function sendStoreAdminInviteEmail(
  email: string,
  firstName: string,
  storeName: string,
  rawToken: string
): void {
  try {
    const verifyLink = `${FRONTEND_URL}/admin/setup-password?token=${rawToken}`;
    const html = compileTemplate('store-admin-invite.html', {
      firstName,
      storeName,
      verifyLink,
      expirationTime: '24 hours'
    });
    sendEmailAsync({
      to: email,
      subject: "You've been invited as a Store Admin — Set up your password",
      html
    });
  } catch (err) {
    logger.error('Failed to send store admin invite email', { err });
  }
}

export function sendResetEmail(
  email: string,
  firstName: string,
  rawToken: string
): void {
  try {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
    const html = compileTemplate('reset-password.html', {
      firstName,
      resetLink,
      expirationTime: `${TOKEN_EXPIRY.password_reset} minutes`
    });
    sendEmailAsync({
      to: email,
      subject: 'Reset your MagerBeliGrocery password',
      html
    });
  } catch (err) {
    logger.error('Failed to send reset email', { err });
  }
}
