import prisma from '../config/prisma.js';
import { generateNews } from '../services/aiNews.service.js';

const movieSelect = { select: { id: true, slug: true, title: true, mediaType: true, posterUrl: true, releaseDate: true } };
const listSelect = {
  id: true, slug: true, title: true, excerpt: true, coverUrl: true, isAi: true, publishedAt: true,
  movie: movieSelect,
};

// ===== Public =====
export async function list(req, res, next) {
  try {
    const { page = 1, limit = 12, movieId } = req.query;
    const take = Math.min(Number(limit) || 12, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = { isPublished: true, publishedAt: { lte: new Date() } };
    if (movieId) where.movieId = String(movieId);

    const [items, total] = await Promise.all([
      prisma.newsArticle.findMany({ where, orderBy: { publishedAt: 'desc' }, take, skip, select: listSelect }),
      prisma.newsArticle.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), totalPages: Math.ceil(total / take) });
  } catch (err) { next(err); }
}

export async function getBySlug(req, res, next) {
  try {
    const article = await prisma.newsArticle.findFirst({
      where: { slug: req.params.slug, isPublished: true },
      include: { movie: movieSelect },
    });
    if (!article) return res.status(404).json({ error: 'not_found' });

    const related = await prisma.newsArticle.findMany({
      where: { isPublished: true, id: { not: article.id }, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      take: 4,
      select: listSelect,
    });
    res.json({ ...article, related });
  } catch (err) { next(err); }
}

export async function sitemap(req, res, next) {
  try {
    const items = await prisma.newsArticle.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ items });
  } catch (err) { next(err); }
}

// ===== Admin / Moderator =====
export async function adminList(req, res, next) {
  try {
    const items = await prisma.newsArticle.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 100,
      include: { movie: movieSelect },
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { title, excerpt, content, slug, coverUrl, movieId } = req.body;
    if (!title?.trim() || !content?.trim() || !slug?.trim()) return res.status(400).json({ error: 'missing_fields' });
    const article = await prisma.newsArticle.create({
      data: {
        title: title.trim(),
        excerpt: (excerpt || '').trim(),
        content: content.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, ''),
        coverUrl: coverUrl || null,
        movieId: movieId || null,
      },
    });
    res.status(201).json(article);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'slug_taken' });
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = {};
    for (const key of ['title', 'excerpt', 'content', 'coverUrl']) {
      if (typeof req.body[key] === 'string') data[key] = req.body[key].trim();
    }
    if (typeof req.body.isPublished === 'boolean') data.isPublished = req.body.isPublished;
    const article = await prisma.newsArticle.update({ where: { id: req.params.id }, data });
    res.json(article);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await prisma.newsArticle.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}

// สั่ง AI เขียนข่าวทันที 1 ข่าว — ใช้เวลา ~1 นาที จึงทำเบื้องหลังแล้วตอบกลับก่อน
let generating = false;
export async function generate(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no_api_key' });
  if (generating) return res.status(409).json({ error: 'already_running' });
  generating = true;
  generateNews({ limit: 1 })
    .catch((err) => console.error('[ai-news] generate error:', err))
    .finally(() => { generating = false; });
  res.status(202).json({ status: 'started' });
}

// ===== คอมเมนต์ใต้ข่าว =====
const commentUser = { select: { id: true, username: true, displayName: true, avatarUrl: true } };

export async function listComments(req, res, next) {
  try {
    const items = await prisma.newsComment.findMany({
      where: { newsId: req.params.id, isHidden: false },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { user: commentUser },
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function addComment(req, res, next) {
  try {
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content_required' });
    if (content.length > 2000) return res.status(400).json({ error: 'too_long' });
    const news = await prisma.newsArticle.findFirst({ where: { id: req.params.id, isPublished: true }, select: { id: true } });
    if (!news) return res.status(404).json({ error: 'not_found' });
    const comment = await prisma.newsComment.create({
      data: { newsId: news.id, userId: req.user.id, content },
      include: { user: commentUser },
    });
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

export async function removeComment(req, res, next) {
  try {
    const c = await prisma.newsComment.findUnique({ where: { id: req.params.commentId } });
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (c.userId !== req.user.id && req.user.role === 'USER') return res.status(403).json({ error: 'forbidden' });
    await prisma.newsComment.delete({ where: { id: c.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}
