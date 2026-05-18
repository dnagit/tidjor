import prisma from '../config/prisma.js';

export async function dashboard(req, res, next) {
  try {
    const [users, movies, reviews, comments, recentReviews, topMovies] = await Promise.all([
      prisma.user.count(),
      prisma.movie.count(),
      prisma.review.count(),
      prisma.comment.count(),
      prisma.review.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true, displayName: true } },
          movie: { select: { title: true, slug: true } },
        },
      }),
      prisma.movie.findMany({
        take: 10,
        orderBy: { popularity: 'desc' },
        select: { id: true, slug: true, title: true, posterUrl: true, averageRating: true, reviewCount: true },
      }),
    ]);
    res.json({
      stats: { users, movies, reviews, comments },
      recentReviews, topMovies,
    });
  } catch (err) { next(err); }
}

export async function listUsers(req, res, next) {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    const take = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * take;
    const where = q ? {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
    } : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, username: true, displayName: true, avatarUrl: true,
          role: true, isBanned: true, createdAt: true, lastLoginAt: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ items, total, totalPages: Math.ceil(total / take) });
  } catch (err) { next(err); }
}

export async function setBan(req, res, next) {
  try {
    const { id } = req.params;
    const { banned } = req.body;
    const user = await prisma.user.update({
      where: { id }, data: { isBanned: !!banned },
    });
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: banned ? 'BAN_USER' : 'UNBAN_USER',
        targetType: 'User', targetId: id,
      },
    });
    res.json({ ok: true, user: { id: user.id, isBanned: user.isBanned } });
  } catch (err) { next(err); }
}

export async function setRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'invalid_role' });
    const user = await prisma.user.update({ where: { id }, data: { role } });
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id, action: 'CHANGE_ROLE',
        targetType: 'User', targetId: id, metadata: { role },
      },
    });
    res.json({ ok: true, user: { id: user.id, role: user.role } });
  } catch (err) { next(err); }
}

export async function listReviews(req, res, next) {
  try {
    const { hidden, page = 1, limit = 30 } = req.query;
    const take = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * take;
    const where = hidden ? { isHidden: true } : {};
    const items = await prisma.review.findMany({
      where, take, skip, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, displayName: true } },
        movie: { select: { title: true, slug: true } },
      },
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function hideReview(req, res, next) {
  try {
    const { id } = req.params;
    const { hidden = true } = req.body;
    const review = await prisma.review.update({ where: { id }, data: { isHidden: hidden } });
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id, action: hidden ? 'HIDE_REVIEW' : 'CREATE_MOVIE',
        targetType: 'Review', targetId: id,
      },
    });
    res.json({ ok: true, review });
  } catch (err) { next(err); }
}
