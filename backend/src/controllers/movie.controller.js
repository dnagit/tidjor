import prisma from '../config/prisma.js';
import slugify from 'slugify';
import * as tmdb from '../services/tmdb.service.js';
import { fillCastIds } from '../services/people.service.js';
import { ensureWatchProviders, hasProviders } from '../services/watchProviders.service.js';
import { searchMovies } from '../services/search.service.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

// ===== Public =====
export async function list(req, res, next) {
  try {
    const {
      q, genre, year, released, lang, type, from, to, order = 'desc',
      page = 1, limit = 20,
    } = req.query;
    // มีคำค้น → ค่าเริ่มต้นเรียงตามความใกล้เคียง (relevance)
    const sort = req.query.sort || (q ? 'relevance' : 'popularity');

    const take = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * take;

    const where = { isPublished: true };
    // ค้นแบบทนพิมพ์ผิด (search.service) → ได้ id ที่ตรงพร้อมคะแนนความใกล้เคียง
    let ranked = null;
    if (q && String(q).trim()) {
      ranked = await searchMovies(String(q), { limit: 600 });
      where.id = { in: ranked.map((r) => r.id) };
    }
    if (genre) where.genres = { some: { genre: { slug: genre } } };
    if (year) {
      const y = Number(year);
      where.releaseDate = {
        gte: new Date(`${y}-01-01`),
        lt: new Date(`${y + 1}-01-01`),
      };
    }

    // หนังเข้าใหม่: เฉพาะที่ฉายแล้ว (releaseDate ≤ วันนี้)
    if ((released === '1' || released === 'true') && !where.releaseDate) {
      where.releaseDate = { lte: new Date() };
    }

    // ช่วงวันฉาย from/to (YYYY-MM-DD) — ใช้ในหน้าเข้าฉายเร็ว ๆ นี้ (/upcoming)
    const fromDate = from && new Date(from);
    const toDate = to && new Date(to);
    if (!where.releaseDate && (fromDate || toDate)) {
      where.releaseDate = {};
      if (fromDate && !Number.isNaN(fromDate.getTime())) where.releaseDate.gte = fromDate;
      if (toDate && !Number.isNaN(toDate.getTime())) where.releaseDate.lte = toDate;
    }

    // กรองตามภาษาต้นฉบับ เช่น lang=th (หนังไทย)
    if (lang) where.originalLanguage = lang;

    // type=movie (หนัง) | type=tv (ซีรีส์) — ไม่ระบุ = ทั้งหมด
    if (type === 'movie' || type === 'tv') where.mediaType = type;

    const select = {
      id: true, slug: true, title: true, titleTh: true, posterUrl: true,
      releaseDate: true, averageRating: true, ratingCount: true, reviewCount: true,
      mediaType: true, numberOfSeasons: true,
      genres: { select: { genre: { select: { name: true, nameTh: true, slug: true } } } },
    };

    let items;
    let total;
    if (ranked && sort === 'relevance') {
      // เรียงตามคะแนนค้นหา (ผลลัพธ์ไม่เกิน 600 เรื่อง → กรองแล้วแบ่งหน้าในหน่วยความจำ)
      const rank = new Map(ranked.map((r, i) => [r.id, i]));
      const all = await prisma.movie.findMany({ where, select });
      all.sort((a, b) => rank.get(a.id) - rank.get(b.id));
      total = all.length;
      items = all.slice(skip, skip + take);
    } else {
      const allowedSorts = ['popularity', 'averageRating', 'releaseDate', 'createdAt', 'reviewCount'];
      const orderBy = { [allowedSorts.includes(sort) ? sort : 'popularity']: order === 'asc' ? 'asc' : 'desc' };
      [items, total] = await Promise.all([
        prisma.movie.findMany({ where, orderBy, take, skip, select }),
        prisma.movie.count({ where }),
      ]);
    }

    res.json({
      items: items.map(m => ({
        ...m,
        genres: m.genres.map(g => g.genre),
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (err) { next(err); }
}

// ค้นหาแบบพิมพ์ไปแนะนำไป (ช่องค้นหาด้านบน) — ผลน้อย ตอบเร็ว
export async function suggest(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ items: [] });
    const ranked = await searchMovies(q, { limit: 8 });
    const rows = await prisma.movie.findMany({
      where: { id: { in: ranked.map((r) => r.id) } },
      select: { id: true, slug: true, title: true, titleTh: true, titleEn: true, posterUrl: true, releaseDate: true, mediaType: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    res.json({ items: ranked.map((r) => byId.get(r.id)).filter(Boolean) });
  } catch (err) { next(err); }
}

// slug ทั้งหมดสำหรับ sitemap.xml ใน request เดียว (list API จำกัด 50 ต่อหน้า)
export async function sitemap(req, res, next) {
  try {
    const items = await prisma.movie.findMany({
      where: { isPublished: true },
      select: { slug: true, mediaType: true, updatedAt: true },
      orderBy: { releaseDate: { sort: 'desc', nulls: 'last' } },
    });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ items });
  } catch (err) { next(err); }
}

export async function getBySlug(req, res, next) {
  try {
    const movie = await prisma.movie.findUnique({
      where: { slug: req.params.slug },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { reviews: true, watchlist: true } },
      },
    });
    if (!movie) {
      // slug เก่า (เปลี่ยนชื่อ URL ไปแล้ว) → 301 ไป slug ปัจจุบัน
      const moved = await prisma.movie.findFirst({
        where: { oldSlugs: { has: req.params.slug }, isPublished: true },
        select: { slug: true },
      });
      if (moved) return res.redirect(301, `${req.baseUrl}/slug/${encodeURIComponent(moved.slug)}`);
    }
    if (!movie || !movie.isPublished) return res.status(404).json({ error: 'not_found' });

    // cast เก่ายังไม่มี person id → เติมจาก TMDB (ครั้งแรกครั้งเดียว) ให้กดไปหน้านักแสดงได้
    // ดึงพร้อมกันกับ cast — ไม่ให้หน้าเว็บรอนานขึ้น
    const [cast, providers] = await Promise.all([fillCastIds(movie), ensureWatchProviders(movie)]);
    movie.cast = cast;
    movie.watchProviders = hasProviders(providers) ? providers : null;
    delete movie.watchProvidersAt;

    // Top reviews
    const reviews = await prisma.review.findMany({
      where: { movieId: movie.id, isPublished: true, isHidden: false, content: { not: '' } },
      orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    // คะแนนจากผู้ใช้จริงเท่านั้น — ใช้ใน JSON-LD (AggregateRating) ของ Google
    // ซึ่งต้องมาจากผู้ใช้ ไม่ใช่ AI (averageRating บนหน้าเว็บรวมคะแนนบอทด้วย)
    const human = await prisma.review.aggregate({
      where: { movieId: movie.id, isPublished: true, isHidden: false, user: { isBot: false } },
      _avg: { rating: true },
      _count: { _all: true },
    });

    res.json({
      ...movie,
      genres: movie.genres.map(g => g.genre),
      reviews,
      userRating: { average: human._avg.rating || 0, count: human._count._all },
    });
  } catch (err) { next(err); }
}

// ===== Admin =====
export async function create(req, res, next) {
  try {
    const data = req.body;
    if (!data.slug) {
      data.slug = slugify(`${data.titleEn || data.title}-${new Date().getFullYear()}`, { lower: true, strict: true });
    }
    const movie = await prisma.movie.create({
      data: {
        ...data,
        source: 'MANUAL',
        addedById: req.user.id,
        genres: data.genreIds ? {
          create: data.genreIds.map(id => ({ genreId: id })),
        } : undefined,
        genreIds: undefined,
      },
    });
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'CREATE_MOVIE',
        targetType: 'Movie',
        targetId: movie.id,
      },
    });
    res.status(201).json(movie);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;
    const movie = await prisma.movie.update({
      where: { id },
      data: {
        ...data,
        genres: data.genreIds ? {
          deleteMany: {},
          create: data.genreIds.map(gid => ({ genreId: gid })),
        } : undefined,
        genreIds: undefined,
      },
    });
    await prisma.adminLog.create({
      data: { adminId: req.user.id, action: 'UPDATE_MOVIE', targetType: 'Movie', targetId: id },
    });
    res.json(movie);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.movie.delete({ where: { id } });
    await prisma.adminLog.create({
      data: { adminId: req.user.id, action: 'DELETE_MOVIE', targetType: 'Movie', targetId: id },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ===== Poster =====
export async function uploadPoster(req, res, next) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'no_file' });

    const dir = 'uploads/posters';
    await fs.mkdir(dir, { recursive: true });

    const filename = `${id}-${Date.now()}.webp`;
    const filepath = path.join(dir, filename);

    await sharp(req.file.buffer)
      .resize(500, 750, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    const posterUrl = `/uploads/posters/${filename}`;
    await prisma.movie.update({ where: { id }, data: { posterUrl } });
    await prisma.adminLog.create({
      data: { adminId: req.user.id, action: 'UPDATE_POSTER', targetType: 'Movie', targetId: id },
    });

    res.json({ posterUrl });
  } catch (err) { next(err); }
}

export async function removePoster(req, res, next) {
  try {
    const { id } = req.params;
    const movie = await prisma.movie.findUnique({ where: { id }, select: { posterUrl: true } });

    if (movie?.posterUrl?.startsWith('/uploads/')) {
      await fs.unlink(movie.posterUrl.slice(1)).catch(() => {});
    }

    await prisma.movie.update({ where: { id }, data: { posterUrl: null } });
    await prisma.adminLog.create({
      data: { adminId: req.user.id, action: 'REMOVE_POSTER', targetType: 'Movie', targetId: id },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ===== Generic image upload (poster / backdrop) =====
const IMAGE_SPECS = {
  poster: { dir: 'uploads/posters', width: 500, height: 750 },
  backdrop: { dir: 'uploads/backdrops', width: 1280, height: 720 },
};

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'no_file' });

    const type = req.body.type === 'backdrop' ? 'backdrop' : 'poster';
    const spec = IMAGE_SPECS[type];
    await fs.mkdir(spec.dir, { recursive: true });

    const filename = `${type}-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
    const filepath = path.join(spec.dir, filename);

    await sharp(req.file.buffer)
      .resize(spec.width, spec.height, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    // absolute URL so <img> works from the SSR frontend on a different origin
    const url = `${req.protocol}://${req.get('host')}/${spec.dir}/${filename}`;
    res.status(201).json({ url, type });
  } catch (err) { next(err); }
}

// ===== TMDB Import =====
export async function searchTmdb(req, res, next) {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.status(400).json({ error: 'query_required' });
    const data = await tmdb.searchMovies(q, page);
    res.json(data);
  } catch (err) { next(err); }
}

export async function importFromTmdb(req, res, next) {
  try {
    const { tmdbId } = req.body;
    const existing = await prisma.movie.findUnique({ where: { tmdbId_mediaType: { tmdbId, mediaType: 'movie' } } });
    if (existing) return res.status(409).json({ error: 'already_imported', movie: existing });

    const details = await tmdb.getMovieDetails(tmdbId);
    const baseSlug = slugify(`${details.original_title || details.title}-${(details.release_date || '').slice(0, 4)}`, { lower: true, strict: true }) || `movie-${tmdbId}`;

    // กัน slug ซ้ำกับหนังเรื่องอื่น (คนละ tmdbId)
    let slug = baseSlug;
    const slugClash = await prisma.movie.findUnique({ where: { slug }, select: { id: true } });
    if (slugClash) slug = `${baseSlug}-${tmdbId}`;

    const movieData = tmdb.mapTmdbMovie(details, slug);
    const { tmdbGenreIds, ...rest } = movieData;

    // map status ให้ตรงกับ enum MovieStatus (กัน POST_PRODUCTION/PLANNED ฯลฯ พัง)
    const validStatus = ['RELEASED', 'UPCOMING', 'IN_PRODUCTION', 'RUMORED'];
    if (!validStatus.includes(rest.status)) {
      rest.status = (rest.status === 'POST_PRODUCTION' || rest.status === 'PLANNED') ? 'UPCOMING' : 'RELEASED';
    }

    // หา genre IDs ใน DB ของเรา
    const genres = await prisma.genre.findMany({ where: { tmdbId: { in: tmdbGenreIds } } });

    const movie = await prisma.movie.create({
      data: {
        ...rest,
        addedById: req.user.id,
        genres: { create: genres.map(g => ({ genreId: g.id })) },
      },
    });

    await prisma.adminLog.create({
      data: { adminId: req.user.id, action: 'IMPORT_TMDB', targetType: 'Movie', targetId: movie.id },
    });

    res.status(201).json(movie);
  } catch (err) { next(err); }
}
