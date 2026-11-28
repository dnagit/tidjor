import prisma from '../config/prisma.js';

export async function mine(req, res, next) {
  try {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    res.json({ items, unread });
  } catch (err) { next(err); }
}

export async function readAll(req, res, next) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
