import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email({ message: 'Invalid email address' }));

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  });

const phoneField = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(/^\+?[0-9]{8,15}$/, { message: 'Invalid phone number' });

const passwordSetupFields = {
  password: passwordField,
  confirm_password: z.string().min(1, 'Please confirm your password')
};

const passwordSetupRefinement = {
  check: (data: { password: string; confirm_password: string }) =>
    data.password === data.confirm_password,
  message: { message: "Passwords don't match", path: ['confirm_password'] }
};

export const registerSchema = z.object({
  body: z.object({
    first_name: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(50, 'First name must be at most 50 characters'),
    last_name: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be at most 50 characters'),
    email: emailField,
    phone: phoneField,
    referral_code: z.string().trim().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required')
  })
});

export const verifyEmailSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Token is required'),
      ...passwordSetupFields
    })
    .refine(passwordSetupRefinement.check, passwordSetupRefinement.message)
});

export const resendVerificationSchema = z.object({
  body: z.object({ email: emailField })
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: emailField })
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Token is required'),
      new_password: passwordField,
      confirm_password: z.string().min(1, 'Please confirm your password')
    })
    .refine(d => d.new_password === d.confirm_password, {
      message: "Passwords don't match",
      path: ['confirm_password']
    })
});

export const completeProfileSchema = z.object({
  body: z.object({
    phone: phoneField,
    referral_code: z.string().trim().optional()
  })
});

export const setupPasswordSchema = z.object({
  body: z
    .object(passwordSetupFields)
    .refine(passwordSetupRefinement.check, passwordSetupRefinement.message)
});
