import prisma from '../config/prisma.js';

export async function mine(req, res, next) {
  try {
    const { status } = req.query;
    const items = await prisma.watchlist.findMany({
      where: { userId: req.user.id, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          select: { id: true, slug: true, title: true, titleTh: true, posterUrl: true, averageRating: true, releaseDate: true, mediaType: true },
        },
      },
    });
    const ratings = await prisma.review.findMany({
      where: { userId: req.user.id, movieId: { in: items.map((i) => i.movieId) } },
      select: { movieId: true, rating: true },
    });
    const byMovie = Object.fromEntries(ratings.map((r) => [r.movieId, r.rating]));
    res.json({ items: items.map((i) => ({ ...i, myRating: byMovie[i.movieId] ?? null })) });
  } catch (err) { next(err); }
}

export async function add(req, res, next) {
  try {
    const { movieId, status = 'WANT_TO_WATCH', note } = req.body;
    const where = { userId_movieId: { userId: req.user.id, movieId } };
    const existed = await prisma.watchlist.findUnique({ where, select: { id: true } });
    const item = await prisma.watchlist.upsert({
      where,
      create: { userId: req.user.id, movieId, status, note },
      update: { status, note },
    });
    // นับเพิ่มเฉพาะครั้งแรก (กดซ้ำไม่ให้ตัวเลขเพิ่ม)
    if (!existed) {
      await prisma.movie.update({ where: { id: movieId }, data: { watchlistCount: { increment: 1 } } }).catch(() => {});
    }
    res.status(201).json(item);
  } catch (err) { next(err); }
}

const STATUSES = ['WANT_TO_WATCH', 'WATCHING', 'WATCHED'];
export async function setStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid_status' });
    const item = await prisma.watchlist.update({
      where: { userId_movieId: { userId: req.user.id, movieId: req.params.movieId } },
      data: { status },
    });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { movieId } = req.params;
    await prisma.watchlist.delete({
      where: { userId_movieId: { userId: req.user.id, movieId } },
    });
    await prisma.movie.update({
      where: { id: movieId },
      data: { watchlistCount: { decrement: 1 } },
    }).catch(() => {});
    res.json({ ok: true });
  } catch (err) { next(err); }
}
