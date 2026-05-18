import prisma from '../config/prisma.js';

export async function listForReview(req, res, next) {
  try {
    const { reviewId } = req.params;
    const items = await prisma.comment.findMany({
      where: { reviewId, isHidden: false, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replies: {
          where: { isHidden: false },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { reviewId, parentId, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content_required' });

    const comment = await prisma.comment.create({
      data: { reviewId, parentId, content, userId: req.user.id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    await prisma.review.update({
      where: { id: reviewId },
      data: { commentCount: { increment: 1 } },
    });
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const c = await prisma.comment.findUnique({ where: { id } });
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (c.userId !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ error: 'forbidden' });
    }
    await prisma.comment.delete({ where: { id } });
    await prisma.review.update({
      where: { id: c.reviewId },
      data: { commentCount: { decrement: 1 } },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
