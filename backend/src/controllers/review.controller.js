import prisma from '../config/prisma.js';

// Recompute averageRating + counts for a movie
async function recomputeMovieStats(movieId) {
  const agg = await prisma.review.aggregate({
    where: { movieId, isPublished: true, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.movie.update({
    where: { id: movieId },
    data: {
      averageRating: agg._avg.rating || 0,
      ratingCount: agg._count._all,
      reviewCount: agg._count._all,
    },
  });
}

export async function listForMovie(req, res, next) {
  try {
    const { movieId } = req.params;
    const { sort = 'top', page = 1, limit = 10 } = req.query;
    const take = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * take;

    let orderBy;
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (sort === 'highest') orderBy = { rating: 'desc' };
    else if (sort === 'lowest') orderBy = { rating: 'asc' };
    else orderBy = [{ likeCount: 'desc' }, { createdAt: 'desc' }];

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where: { movieId, isPublished: true, isHidden: false },
        orderBy, take, skip,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.review.count({ where: { movieId, isPublished: true, isHidden: false } }),
    ]);

    res.json({ items, total, page: Number(page), totalPages: Math.ceil(total / take) });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { movieId, rating, title, content, hasSpoiler } = req.body;
    if (!rating || rating < 1 || rating > 10) return res.status(400).json({ error: 'invalid_rating' });

    const review = await prisma.review.upsert({
      where: { userId_movieId: { userId: req.user.id, movieId } },
      create: { userId: req.user.id, movieId, rating, title, content, hasSpoiler },
      update: { rating, title, content, hasSpoiler },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await recomputeMovieStats(movieId);
    res.status(201).json(review);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ error: 'not_found' });
    if (review.userId !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ error: 'forbidden' });
    }
    await prisma.review.delete({ where: { id } });
    await recomputeMovieStats(review.movieId);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function like(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId: id, userId: req.user.id } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.reviewLike.delete({ where: { id: existing.id } }),
        prisma.review.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return res.json({ liked: false });
    }
    await prisma.$transaction([
      prisma.reviewLike.create({ data: { reviewId: id, userId: req.user.id } }),
      prisma.review.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
    ]);
    res.json({ liked: true });
  } catch (err) { next(err); }
}

export async function feed(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const take = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * take;

    const items = await prisma.review.findMany({
      where: { isPublished: true, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        movie: { select: { id: true, slug: true, title: true, posterUrl: true } },
      },
    });
    res.json({ items });
  } catch (err) { next(err); }
}
