import prisma from '../config/prisma.js';

export async function list(req, res, next) {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { nameTh: 'asc' },
      include: { _count: { select: { movies: true } } },
    });
    res.json({
      items: genres.map((g) => ({ ...g, movieCount: g._count.movies, _count: undefined })),
    });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, nameTh, slug, tmdbId } = req.body;
    const genre = await prisma.genre.create({
      data: { name, nameTh, slug, tmdbId: tmdbId ?? null },
    });
    res.status(201).json(genre);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'duplicate', field: err.meta?.target });
    }
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });

    const { name, nameTh, slug, tmdbId } = req.body;
    const genre = await prisma.genre.update({
      where: { id },
      data: {
        name,
        nameTh,
        slug,
        ...(tmdbId !== undefined ? { tmdbId: tmdbId ?? null } : {}),
      },
    });
    res.json(genre);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'duplicate', field: err.meta?.target });
    }
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });

    // ความสัมพันธ์ MovieGenre เป็น onDelete: Cascade → ลบ genre แล้วหนังจะถูกถอดหมวดนี้ออกเอง
    await prisma.genre.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}
