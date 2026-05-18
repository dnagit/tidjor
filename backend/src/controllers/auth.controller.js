import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  findValidRefreshToken,
} from '../utils/jwt.js';
import { generateUniqueUsername } from '../utils/username.js';

const REFRESH_COOKIE = 'tj_refresh';
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function sendAuth(res, user, req) {
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });
  res.cookie(REFRESH_COOKIE, refresh, cookieOpts);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  };
}

export async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'email_taken' });

    const passwordHash = await bcrypt.hash(password, 12);
    const username = await generateUniqueUsername(displayName || email);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName || username,
        passwordHash,
        authProviders: {
          create: { provider: 'LOCAL', providerId: email },
        },
      },
    });

    const data = await sendAuth(res, user, req);
    res.status(201).json(data);
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' });
    if (user.isBanned) return res.status(403).json({ error: 'account_banned' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'invalid_credentials' });

    const data = await sendAuth(res, user, req);
    res.json(data);
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ error: 'no_refresh_token' });

    const valid = await findValidRefreshToken(token);
    if (!valid) {
      res.clearCookie(REFRESH_COOKIE);
      return res.status(401).json({ error: 'invalid_refresh_token' });
    }

    const newToken = await rotateRefreshToken(token, valid.user, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    res.cookie(REFRESH_COOKIE, newToken, cookieOpts);

    res.json({ accessToken: signAccessToken(valid.user) });
  } catch (err) { next(err); }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(REFRESH_COOKIE);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

// OAuth success handler — Passport ใส่ user ใน req.user
export async function oauthCallback(req, res) {
  const user = req.user;
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });
  res.cookie(REFRESH_COOKIE, refresh, cookieOpts);

  // Redirect ไป frontend พร้อม token
  const url = `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`;
  res.redirect(url);
}
