import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import LineStrategy from 'passport-line-auth';
import prisma from './prisma.js';
import { generateUniqueUsername } from '../utils/username.js';

// Helper: find or create user from OAuth profile
async function findOrCreateOAuthUser({ provider, providerId, email, displayName, avatarUrl }) {
  // 1. หา AuthAccount เดิม
  let account = await prisma.authAccount.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });
  if (account) return account.user;

  // 2. ถ้าไม่มี account แต่มี email ตรงกัน → ผูกเข้า user เดิม
  let user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!user) {
    const username = await generateUniqueUsername(displayName || email);
    user = await prisma.user.create({
      data: {
        email: email || `${provider}_${providerId}@tidjor.local`,
        username,
        displayName: displayName || username,
        avatarUrl,
        isVerified: true,
      },
    });
  }

  await prisma.authAccount.create({
    data: { userId: user.id, provider, providerId },
  });

  return user;
}

// ===== Google =====
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser({
        provider: 'GOOGLE',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, user);
    } catch (err) { done(err); }
  }));
}

// ===== Facebook =====
if (process.env.FACEBOOK_APP_ID) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'emails', 'photos'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser({
        provider: 'FACEBOOK',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, user);
    } catch (err) { done(err); }
  }));
}

// ===== LINE =====
if (process.env.LINE_CHANNEL_ID) {
  passport.use(new LineStrategy({
    channelID: process.env.LINE_CHANNEL_ID,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    callbackURL: process.env.LINE_CALLBACK_URL,
    scope: ['profile', 'openid', 'email'],
    botPrompt: 'normal',
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser({
        provider: 'LINE',
        providerId: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.pictureURL,
      });
      done(null, user);
    } catch (err) { done(err); }
  }));
}

export default passport;
