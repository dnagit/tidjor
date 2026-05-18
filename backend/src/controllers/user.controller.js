import prisma from '../config/prisma.js';

export async function publicProfile(req, res, next) {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bio: true,
        createdAt: true,
        _count: { select: { reviews: true, comments: true, watchlist: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'not_found' });

    const reviews = await prisma.review.findMany({
      where: { userId: user.id, isPublished: true, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        movie: { select: { id: true, slug: true, title: true, titleTh: true, posterUrl: true } },
      },
    });

    res.json({ user, reviews });
  } catch (err) { next(err); }
}

export async function updateMe(req, res, next) {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, bio, avatarUrl },
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}
