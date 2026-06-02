import prisma from '../config/prisma.js';
import slugify from 'slugify';
import * as tmdb from '../services/tmdb.service.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

// ===== Public =====
export async function list(req, res, next) {
  try {
    const {
      q, genre, year, released, lang, sort = 'popularity', order = 'desc',
      page = 1, limit = 20,
    } = req.query;

    const take = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * take;

    const where = { isPublished: true };
    if (q) where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { titleTh: { contains: q, mode: 'insensitive' } },
      { titleEn: { contains: q, mode: 'insensitive' } },
    ];
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

    // กรองตามภาษาต้นฉบับ เช่น lang=th (หนังไทย)
    if (lang) where.originalLanguage = lang;

    const allowedSorts = ['popularity', 'averageRating', 'releaseDate', 'createdAt', 'reviewCount'];
    const orderBy = { [allowedSorts.includes(sort) ? sort : 'popularity']: order === 'asc' ? 'asc' : 'desc' };

    const [items, total] = await Promise.all([
      prisma.movie.findMany({
        where, orderBy, take, skip,
        select: {
          id: true, slug: true, title: true, titleTh: true, posterUrl: true,
          releaseDate: true, averageRating: true, ratingCount: true, reviewCount: true,
          genres: { select: { genre: { select: { name: true, nameTh: true, slug: true } } } },
        },
      }),
      prisma.movie.count({ where }),
    ]);

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

export async function getBySlug(req, res, next) {
  try {
    const movie = await prisma.movie.findUnique({
      where: { slug: req.params.slug },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { reviews: true, watchlist: true } },
      },
    });
    if (!movie || !movie.isPublished) return res.status(404).json({ error: 'not_found' });

    // Top reviews
    const reviews = await prisma.review.findMany({
      where: { movieId: movie.id, isPublished: true, isHidden: false },
      orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    res.json({
      ...movie,
      genres: movie.genres.map(g => g.genre),
      reviews,
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
    const existing = await prisma.movie.findUnique({ where: { tmdbId } });
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
