import prisma from '../config/prisma.js';

export async function mine(req, res, next) {
  try {
    const { status } = req.query;
    const items = await prisma.watchlist.findMany({
      where: { userId: req.user.id, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          select: { id: true, slug: true, title: true, titleTh: true, posterUrl: true, averageRating: true, releaseDate: true },
        },
      },
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function add(req, res, next) {
  try {
    const { movieId, status = 'WANT_TO_WATCH', note } = req.body;
    const item = await prisma.watchlist.upsert({
      where: { userId_movieId: { userId: req.user.id, movieId } },
      create: { userId: req.user.id, movieId, status, note },
      update: { status, note },
    });
    await prisma.movie.update({
      where: { id: movieId },
      data: { watchlistCount: { increment: 1 } },
    }).catch(() => {});
    res.status(201).json(item);
  } catch (err) { next(err); }
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
