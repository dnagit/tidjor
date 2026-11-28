import prisma from '../config/prisma.js';
import { generateLists } from '../services/aiList.service.js';

const movieSelect = {
  id: true, slug: true, title: true, titleTh: true, titleEn: true, mediaType: true, posterUrl: true,
  releaseDate: true, averageRating: true, ratingCount: true, numberOfSeasons: true, watchProviders: true,
  genres: { select: { genre: { select: { nameTh: true, slug: true } } } },
};
const listSelect = { id: true, slug: true, title: true, excerpt: true, coverUrl: true, isAi: true, publishedAt: true, updatedAt: true };

export async function list(req, res, next) {
  try {
    const items = await prisma.topList.findMany({
      where: { isPublished: true }, orderBy: { updatedAt: 'desc' }, take: 60, select: listSelect,
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function getBySlug(req, res, next) {
  try {
    const l = await prisma.topList.findFirst({ where: { slug: req.params.slug, isPublished: true } });
    if (!l) return res.status(404).json({ error: 'not_found' });
    const ids = l.items.map((i) => i.movieId);
    const movies = await prisma.movie.findMany({ where: { id: { in: ids }, isPublished: true }, select: movieSelect });
    const byId = new Map(movies.map((m) => [m.id, {
      ...m,
      genres: m.genres.map((g) => g.genre),
      stream: [...(m.watchProviders?.stream || []), ...(m.watchProviders?.free || [])].map((p) => p.name),
      watchProviders: undefined,
    }]));
    const items = l.items.map((i) => ({ blurb: i.blurb, movie: byId.get(i.movieId) })).filter((i) => i.movie);
    const others = await prisma.topList.findMany({
      where: { isPublished: true, id: { not: l.id } }, orderBy: { updatedAt: 'desc' }, take: 6, select: listSelect,
    });
    res.json({ ...l, items, others });
  } catch (err) { next(err); }
}

export async function sitemap(req, res, next) {
  try {
    const items = await prisma.topList.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ items });
  } catch (err) { next(err); }
}

// ===== Admin =====
export async function adminList(req, res, next) {
  try {
    res.json({ items: await prisma.topList.findMany({ orderBy: { updatedAt: 'desc' }, select: { ...listSelect, isPublished: true, topic: true } }) });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const data = {};
    for (const k of ['title', 'excerpt', 'intro']) if (typeof req.body[k] === 'string') data[k] = req.body[k].trim();
    if (typeof req.body.isPublished === 'boolean') data.isPublished = req.body.isPublished;
    res.json(await prisma.topList.update({ where: { id: req.params.id }, data }));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await prisma.topList.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}

let generating = false;
export async function generate(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no_api_key' });
  if (generating) return res.status(409).json({ error: 'already_running' });
  generating = true;
  generateLists({ limit: 1 })
    .catch((err) => console.error('[ai-list] generate error:', err))
    .finally(() => { generating = false; });
  res.status(202).json({ status: 'started' });
}
