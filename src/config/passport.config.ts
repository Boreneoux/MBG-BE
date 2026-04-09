import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } from './main.config';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      callbackURL: GOOGLE_CALLBACK_URL!
    },
    (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
      const email = profile.emails?.[0]?.value ?? `${profile.id}@google.oauth`;
      done(null, {
        provider_user_id: profile.id,
        provider_email: email,
        first_name: profile.name?.givenName ?? profile.displayName ?? '',
        last_name: profile.name?.familyName ?? ''
      } as unknown as Express.User);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

export function attachGoogleProfile(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'google',
    { session: false, failureRedirect: '/api/auth/google/failure' },
    (err: Error | null, profile: Express.User | false) => {
      if (err || !profile) return next(err ?? new Error('Google authentication failed'));
      req.googleProfile = profile as any;
      next();
    }
  )(req, res, next);
}
