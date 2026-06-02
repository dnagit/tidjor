import axios from 'axios';
import slugify from 'slugify';
import prisma from '../config/prisma.js';
import { mapTmdbMovie } from './tmdb.service.js';

// ============================================================
// TMDB → Database sync
//   - หนัง (movie): เขียนลงตาราง Movie เดิม → แสดงในหน้าเว็บ/แอดมิน และ "รีวิวได้"
//   - ซีรีย์ (tv):  เก็บใน tmdb_media (raw) ไว้ก่อน (Movie model เป็นหนังอย่างเดียว
//                   ถ้าต้องการให้รีวิว tv ได้ ต้องขยาย schema เพิ่ม)
//   - pagination ครบทุกหน้า, retry, rate limit, log, รันซ้ำได้ไม่ซ้ำ (upsert)
// ============================================================

// ---------- Config ----------
const BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const LANGUAGE = process.env.TMDB_LANG || 'th-TH';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

const RATE_DELAY_MS = Number(process.env.TMDB_RATE_DELAY_MS || 250);
const MAX_RETRIES = Number(process.env.TMDB_MAX_RETRIES || 4);
const TMDB_PAGE_LIMIT = 500;

const VALID_MOVIE_STATUS = ['RELEASED', 'UPCOMING', 'IN_PRODUCTION', 'RUMORED'];

// ---------- HTTP client ----------
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {},
  params: API_KEY && !ACCESS_TOKEN ? { api_key: API_KEY } : {},
});

// ---------- Helpers ----------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  console.log(`[tmdb-sync] ${new Date().toISOString()} ${msg}`);
}
function logError(msg, err) {
  const detail = err?.response?.status
    ? `HTTP ${err.response.status} ${JSON.stringify(err.response.data)}`
    : err?.message || err;
  console.error(`[tmdb-sync][ERROR] ${new Date().toISOString()} ${msg} :: ${detail ?? ''}`);
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// แปลง status ของ TMDB ให้ตรงกับ enum MovieStatus เดิม
function sanitizeMovieStatus(s) {
  if (VALID_MOVIE_STATUS.includes(s)) return s;
  if (s === 'POST_PRODUCTION' || s === 'PLANNED') return 'UPCOMING';
  return 'RELEASED';
}

// ---------- TMDB request พร้อม retry + rate limit ----------
async function tmdbGet(path, params = {}, attempt = 1) {
  if (!API_KEY && !ACCESS_TOKEN) {
    throw new Error('ไม่พบ TMDB_API_KEY หรือ TMDB_ACCESS_TOKEN ใน .env');
  }
  try {
    await delay(RATE_DELAY_MS);
    const res = await client.get(path, { params: { language: LANGUAGE, ...params } });
    return res.data;
  } catch (err) {
    const status = err.response?.status;

    if (status === 429) {
      const retryAfter = Number(err.response.headers?.['retry-after'] || 1);
      logError(`rate limited ที่ ${path} รอ ${retryAfter}s แล้วลองใหม่`);
      await delay((retryAfter + 0.5) * 1000);
      return tmdbGet(path, params, attempt);
    }

    const retryable = !status || status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      const backoff = 500 * 2 ** (attempt - 1);
      logError(`request ${path} ล้มเหลว (ครั้งที่ ${attempt}/${MAX_RETRIES}) รอ ${backoff}ms`, err);
      await delay(backoff);
      return tmdbGet(path, params, attempt + 1);
    }

    throw err;
  }
}

// ============================================================
// MOVIES → ตาราง Movie เดิม (แสดงผล + รีวิวได้)
// ============================================================
async function upsertMovie(details) {
  const baseSlug = slugify(
    `${details.original_title || details.title}-${(details.release_date || '').slice(0, 4)}`,
    { lower: true, strict: true },
  ) || `movie-${details.id}`;

  // กัน slug ชนกับหนังเรื่องอื่น (คนละ tmdbId) ตั้งแต่ต้น → ไม่ให้เกิด prisma error log
  let slug = baseSlug;
  const clash = await prisma.movie.findUnique({
    where: { slug },
    select: { tmdbId: true },
  });
  if (clash && clash.tmdbId !== details.id) {
    slug = `${baseSlug}-${details.id}`;
  }

  const mapped = mapTmdbMovie(details, slug);
  const { tmdbGenreIds, ...data } = mapped;
  data.status = sanitizeMovieStatus(data.status);

  // หา genre ในตารางเรา (seed ไว้พร้อม tmdbId แล้ว)
  const genres = await prisma.genre.findMany({
    where: { tmdbId: { in: tmdbGenreIds || [] } },
  });

  await prisma.movie.upsert({
    where: { tmdbId: details.id },
    update: data, // ไม่แตะ genres ตอน update (กัน MovieGenre ซ้ำ)
    create: {
      ...data,
      genres: { create: genres.map((g) => ({ genreId: g.id })) },
    },
  });
}

export async function syncMovies({ maxPages = Infinity, startPage = 1 } = {}) {
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  const first = await tmdbGet('/movie/popular', { page: startPage });
  const lastPage = Math.min(first.total_pages || 1, TMDB_PAGE_LIMIT, startPage - 1 + maxPages);
  log(`เริ่ม sync หนัง → ตาราง Movie | total_pages=${first.total_pages} → หน้า ${startPage}..${lastPage}`);

  for (let page = startPage; page <= lastPage; page++) {
    let data;
    try {
      data = page === startPage ? first : await tmdbGet('/movie/popular', { page });
    } catch (err) {
      failed++;
      logError(`ดึงหน้า ${page} ไม่สำเร็จ ข้ามไป`, err);
      continue;
    }

    for (const item of data.results || []) {
      try {
        // เช็คซ้ำก่อน: ถ้ามีใน DB แล้ว ข้ามเลย (ไม่ต้องดึง details / ไม่ต้องเขียนทับ)
        const exists = await prisma.movie.findUnique({
          where: { tmdbId: item.id },
          select: { id: true },
        });
        if (exists) { skipped++; continue; }

        // เฉพาะเรื่องใหม่ → ดึง details เต็มเพื่อ map เข้า Movie (genres, runtime, director ฯลฯ)
        const details = await tmdbGet(`/movie/${item.id}`, {
          append_to_response: 'credits,videos,images',
        });
        await upsertMovie(details);
        saved++;
      } catch (err) {
        failed++;
        logError(`บันทึกหนัง id=${item.id} ไม่สำเร็จ`, err);
      }
    }

    log(`หนัง หน้า ${page}/${lastPage} เสร็จ (เพิ่มใหม่=${saved}, ข้ามซ้ำ=${skipped}, ล้มเหลว=${failed})`);
  }

  log(`✅ เสร็จสิ้น หนัง — เพิ่มใหม่ ${saved} เรื่อง, ข้ามที่ซ้ำ ${skipped} เรื่อง, ล้มเหลว ${failed}`);
  return { type: 'movie', saved, skipped, failed };
}

// ============================================================
// TV → ตาราง tmdb_media (raw, ยังไม่รองรับรีวิวในระบบเดิม)
// ============================================================
function mapTv(raw, details = null) {
  const posterPath = raw.poster_path || null;
  const backdropPath = raw.backdrop_path || null;
  return {
    tmdbId: raw.id,
    type: 'tv',
    title: raw.name || raw.original_name || '(ไม่มีชื่อ)',
    originalTitle: raw.original_name || null,
    overview: raw.overview || null,
    releaseDate: safeDate(raw.first_air_date),
    posterPath,
    posterUrl: posterPath ? `${POSTER_BASE}${posterPath}` : null,
    backdropPath,
    backdropUrl: backdropPath ? `${BACKDROP_BASE}${backdropPath}` : null,
    voteAverage: raw.vote_average ?? null,
    voteCount: raw.vote_count ?? null,
    popularity: raw.popularity ?? null,
    originalLanguage: raw.original_language || null,
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids : (details?.genres?.map((g) => g.id) ?? []),
    genres: details?.genres ?? undefined,
    adult: raw.adult ?? false,
    status: details?.status ?? null,
  };
}

export async function syncTvSeries({ maxPages = Infinity, withDetails = true, startPage = 1 } = {}) {
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  const first = await tmdbGet('/tv/popular', { page: startPage });
  const lastPage = Math.min(first.total_pages || 1, TMDB_PAGE_LIMIT, startPage - 1 + maxPages);
  log(`เริ่ม sync ซีรีย์ → ตาราง tmdb_media | total_pages=${first.total_pages} → หน้า ${startPage}..${lastPage}`);
  log('หมายเหตุ: ซีรีย์เก็บใน tmdb_media (ยังรีวิวในหน้าเว็บไม่ได้ จนกว่าจะขยาย schema)');

  for (let page = startPage; page <= lastPage; page++) {
    let data;
    try {
      data = page === startPage ? first : await tmdbGet('/tv/popular', { page });
    } catch (err) {
      failed++;
      logError(`[tv] ดึงหน้า ${page} ไม่สำเร็จ`, err);
      continue;
    }

    for (const item of data.results || []) {
      try {
        // เช็คซ้ำก่อน: ถ้ามีแล้ว ข้ามเลย
        const exists = await prisma.tmdbMedia.findUnique({
          where: { tmdbId_type: { tmdbId: item.id, type: 'tv' } },
          select: { id: true },
        });
        if (exists) { skipped++; continue; }

        const details = withDetails ? await tmdbGet(`/tv/${item.id}`) : null;
        const { tmdbId, type, ...rest } = mapTv(item, details);
        await prisma.tmdbMedia.create({ data: { tmdbId, type, ...rest } });
        saved++;
      } catch (err) {
        failed++;
        logError(`[tv] บันทึก id=${item.id} ไม่สำเร็จ`, err);
      }
    }

    log(`ซีรีย์ หน้า ${page}/${lastPage} เสร็จ (เพิ่มใหม่=${saved}, ข้ามซ้ำ=${skipped}, ล้มเหลว=${failed})`);
  }

  log(`✅ เสร็จสิ้น ซีรีย์ — เพิ่มใหม่ ${saved}, ข้ามที่ซ้ำ ${skipped}, ล้มเหลว ${failed}`);
  return { type: 'tv', saved, skipped, failed };
}

export async function syncAllMedia(opts = {}) {
  log('==== เริ่ม syncAllMedia ====');
  const movies = await syncMovies(opts);
  const tv = await syncTvSeries(opts);
  const summary = {
    movies,
    tv,
    totalSaved: movies.saved + tv.saved,
    totalSkipped: (movies.skipped || 0) + (tv.skipped || 0),
    totalFailed: movies.failed + tv.failed,
  };
  log(`==== syncAllMedia เสร็จ — เพิ่มใหม่ ${summary.totalSaved}, ข้ามซ้ำ ${summary.totalSkipped}, ล้มเหลว ${summary.totalFailed} ====`);
  return summary;
}
