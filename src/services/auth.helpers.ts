import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { JWT_SECRET_TOKEN, FRONTEND_URL, USER_EMAILER } from '../config/main.config';
import { jwtCreateToken } from '../helpers/jwt.helper';
import transporter from '../helpers/nodemailer.helper';
import logger from '../config/logger.config';
import { user_role } from '../../generated/prisma/client';
import { TOKEN_EXPIRY } from '../types/auth';

export function generateToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function buildCookieToken(userId: number, email: string, role: user_role): string {
  return jwtCreateToken({ id: userId, email, role }, JWT_SECRET_TOKEN!, { expiresIn: '7d' });
}

export function generateReferralCode(firstName: string, lastName: string): string {
  const prefix = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export function compileTemplate(templateName: string, vars: Record<string, string>): string {
  const templatePath = path.join(__dirname, '../templates', templateName);
  const source = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(source)({ year: new Date().getFullYear().toString(), ...vars });
}

export function sendEmailAsync(options: { to: string; subject: string; html: string }): void {
  transporter
    .sendMail({ from: USER_EMAILER, ...options })
    .catch((err: unknown) => logger.error('Email send failed', { err }));
}

export function sendVerificationEmail(email: string, firstName: string, rawToken: string): void {
  const verifyLink = `${FRONTEND_URL}/setup-password?token=${rawToken}`;
  const html = compileTemplate('verify-email.html', {
    firstName,
    verifyLink,
    expirationTime: '1 hour'
  });
  sendEmailAsync({ to: email, subject: 'Verify your MalesBeliGrocery email address', html });
}

export function sendResetEmail(email: string, firstName: string, rawToken: string): void {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
  const html = compileTemplate('reset-password.html', {
    firstName,
    resetLink,
    expirationTime: `${TOKEN_EXPIRY.password_reset} minutes`
  });
  sendEmailAsync({ to: email, subject: 'Reset your MalesBeliGrocery password', html });
}
