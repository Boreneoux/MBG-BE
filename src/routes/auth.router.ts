import { Router, Request, Response } from 'express';
import passport from 'passport';
import '../config/passport.config';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { attachGoogleProfile } from '../config/passport.config';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
  setupPasswordSchema
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', attachGoogleProfile, authController.googleCallback);
router.get('/google/failure', (_req: Request, res: Response) => {
  res.status(401).json({ success: false, message: 'Google authentication failed', data: null });
});

// Token refresh (no authenticate — access token may already be expired)
router.post('/refresh', authController.refresh);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authController.logout);
router.post('/complete-profile', authenticate, validate(completeProfileSchema), authController.completeProfile);
router.post('/setup-password', authenticate, validate(setupPasswordSchema), authController.setupPassword);

export default router;
