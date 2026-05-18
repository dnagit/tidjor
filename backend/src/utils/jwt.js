import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export async function issueRefreshToken(user, { userAgent, ipAddress } = {}) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: { token, userId: user.id, expiresAt, userAgent, ipAddress },
  });
  return token;
}

export async function rotateRefreshToken(oldToken, user, meta) {
  await prisma.refreshToken.update({
    where: { token: oldToken },
    data: { revokedAt: new Date() },
  });
  return issueRefreshToken(user, meta);
}

export async function findValidRefreshToken(token) {
  const t = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!t || t.revokedAt || t.expiresAt < new Date()) return null;
  return t;
}
