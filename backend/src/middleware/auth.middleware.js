import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../config/prisma.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, username: true, displayName: true, avatarUrl: true, isBanned: true },
    });
    if (!user || user.isBanned) return res.status(401).json({ error: 'unauthorized' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireModerator = requireRole('ADMIN', 'MODERATOR');

// Optional auth — attach user if token present, but don't fail
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, username: true },
      });
    }
  } catch (_) { /* ignore */ }
  next();
}
