import prisma from '../config/prisma.js';
import { recomputeMovieStats } from '../services/movieStats.service.js';

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
        where: { movieId, isPublished: true, isHidden: false, content: { not: '' } },
        orderBy, take, skip,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
        },
      }),
      prisma.review.count({ where: { movieId, isPublished: true, isHidden: false, content: { not: '' } } }),
    ]);

    res.json({ items, total, page: Number(page), totalPages: Math.ceil(total / take) });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { movieId, title, hasSpoiler } = req.body;
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) return res.status(400).json({ error: 'invalid_rating' });
    if (!movieId) return res.status(400).json({ error: 'movie_required' });
    // ให้คะแนนอย่างเดียว (ไม่เขียนข้อความ) ได้ — content = ''
    // ให้คะแนนซ้ำโดยไม่ส่งข้อความมา → คงข้อความรีวิวเดิมไว้
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : undefined;

    const review = await prisma.review.upsert({
      where: { userId_movieId: { userId: req.user.id, movieId } },
      create: { userId: req.user.id, movieId, rating, title, content: content ?? '', hasSpoiler: !!hasSpoiler },
      update: {
        rating,
        ...(content !== undefined && { content, title, hasSpoiler: !!hasSpoiler }),
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
      },
    });

    await recomputeMovieStats(movieId);
    // ส่งคะแนนรวมใหม่กลับไปด้วย — หน้าเว็บอัปเดตตัวเลขได้ทันทีไม่ต้องรีเฟรช
    const stats = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { averageRating: true, ratingCount: true, reviewCount: true },
    });
    res.status(201).json({ ...review, movieStats: stats });
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
      where: { isPublished: true, isHidden: false, content: { not: '' } },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
        movie: { select: { id: true, slug: true, title: true, posterUrl: true, mediaType: true } },
      },
    });
    res.json({ items });
  } catch (err) { next(err); }
}

// รีวิว/คะแนนของฉันสำหรับเรื่องนี้ (ใช้แสดงดาวที่เคยให้ไว้ และเติมฟอร์มรีวิว)
export async function mine(req, res, next) {
  try {
    const where = { userId_movieId: { userId: req.user.id, movieId: req.params.movieId } };
    const [review, watch] = await Promise.all([
      prisma.review.findUnique({ where, select: { id: true, rating: true, title: true, content: true, hasSpoiler: true } }),
      prisma.watchlist.findUnique({ where, select: { status: true } }),
    ]);
    // inWatchlist — ใช้แสดงปุ่ม Watchlist ว่าเพิ่มแล้วหรือยัง
    res.json({ review, inWatchlist: !!watch, watchStatus: watch?.status || null });
  } catch (err) { next(err); }
}
