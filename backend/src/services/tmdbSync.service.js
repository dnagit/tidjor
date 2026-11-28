import axios from 'axios';
import slugify from 'slugify';
import prisma from '../config/prisma.js';
import { mapTmdbMovie, mapTmdbTv } from './tmdb.service.js';

// ============================================================
// TMDB → Database sync
//   - หนัง (movie) และซีรีย์ (tv) เขียนลงตาราง Movie เดียวกัน แยกด้วย mediaType
//     → แสดงในหน้าเว็บ/แอดมิน และ "รีวิวได้" ทั้งคู่
//   - (ตาราง tmdb_media เดิมไม่ได้ใช้แล้ว)
//   - pagination ครบทุกหน้า, retry, rate limit, log, รันซ้ำได้ไม่ซ้ำ (upsert)
// ============================================================

// ---------- Config ----------
const BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const LANGUAGE = process.env.TMDB_LANG || 'th-TH';

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

// แปลง status ของ TMDB ให้ตรงกับ enum MovieStatus เดิม
function sanitizeMovieStatus(s) {
  if (VALID_MOVIE_STATUS.includes(s)) return s;
  if (s === 'POST_PRODUCTION' || s === 'PLANNED') return 'UPCOMING';
  return 'RELEASED';
}

// ---------- TMDB request พร้อม retry + rate limit ----------
export async function tmdbGet(path, params = {}, attempt = 1) {
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
// MOVIES / TV → ตาราง Movie (แสดงผล + รีวิวได้)
// ============================================================

// genre ที่มีเฉพาะซีรีย์ (id ของ TMDB คนละชุดกับหนัง) — สร้างให้อัตโนมัติก่อน sync tv
const TV_ONLY_GENRES = [
  { tmdbId: 10759, name: 'Action & Adventure', nameTh: 'แอ็คชั่นและผจญภัย', slug: 'action-adventure' },
  { tmdbId: 10762, name: 'Kids', nameTh: 'เด็ก', slug: 'kids' },
  { tmdbId: 10763, name: 'News', nameTh: 'ข่าว', slug: 'news' },
  { tmdbId: 10764, name: 'Reality', nameTh: 'เรียลลิตี้', slug: 'reality' },
  { tmdbId: 10765, name: 'Sci-Fi & Fantasy', nameTh: 'ไซไฟและแฟนตาซี', slug: 'sci-fi-fantasy' },
  { tmdbId: 10766, name: 'Soap', nameTh: 'ละครชุด', slug: 'soap' },
  { tmdbId: 10767, name: 'Talk', nameTh: 'ทอล์กโชว์', slug: 'talk' },
  { tmdbId: 10768, name: 'War & Politics', nameTh: 'สงครามและการเมือง', slug: 'war-politics' },
];

async function ensureTvGenres() {
  for (const g of TV_ONLY_GENRES) {
    await prisma.genre.upsert({ where: { tmdbId: g.tmdbId }, update: {}, create: g });
  }
}

const toSlug = (s) => slugify(s || '', { lower: true, strict: true });

// ชื่อสำหรับ slug: ใช้ชื่อต้นฉบับถ้าเป็นตัวอักษรละติน
// ไม่งั้น (ญี่ปุ่น/เกาหลี/จีน/ไทย/ฮินดี ฯลฯ ที่ slugify แล้วว่าง) ดึงชื่อภาษาอังกฤษจาก TMDB
export async function slugTitle(tmdbId, mediaType, originalName) {
  const original = toSlug(originalName);
  if (/[a-z]/.test(original)) return original;
  try {
    const en = await tmdbGet(`/${mediaType}/${tmdbId}`, { language: 'en-US' });
    const english = toSlug(mediaType === 'tv' ? en.name : en.title);
    if (/[a-z]/.test(english)) return english;
  } catch (err) {
    logError(`ดึงชื่ออังกฤษ ${mediaType}/${tmdbId} ไม่สำเร็จ`, err);
  }
  return original;
}

// slug = ชื่อ-ปี และกันชนกับเรื่องอื่น (คนละ tmdbId หรือคนละประเภท) → ต่อท้ายด้วย tmdbId
export async function buildSlug(tmdbId, mediaType, originalName, date) {
  const title = await slugTitle(tmdbId, mediaType, originalName);
  const baseSlug = [title || mediaType, (date || '').slice(0, 4)].filter(Boolean).join('-');
  const clash = await prisma.movie.findUnique({
    where: { slug: baseSlug },
    select: { tmdbId: true, mediaType: true },
  });
  if (clash && (clash.tmdbId !== tmdbId || clash.mediaType !== mediaType)) {
    return `${baseSlug}-${mediaType === 'tv' ? 'tv-' : ''}${tmdbId}`;
  }
  return baseSlug;
}

async function upsertMovie(details, mediaType = 'movie') {
  const isTv = mediaType === 'tv';
  const name = isTv ? (details.original_name || details.name) : (details.original_title || details.title);
  const date = isTv ? details.first_air_date : details.release_date;
  const slug = await buildSlug(details.id, mediaType, name, date);

  const mapped = isTv ? mapTmdbTv(details, slug) : mapTmdbMovie(details, slug);
  const { tmdbGenreIds, ...data } = mapped;
  data.status = sanitizeMovieStatus(data.status);

  // หา genre ในตารางเรา (seed ไว้พร้อม tmdbId แล้ว)
  const genres = await prisma.genre.findMany({
    where: { tmdbId: { in: tmdbGenreIds || [] } },
  });

  await prisma.movie.upsert({
    where: { tmdbId_mediaType: { tmdbId: details.id, mediaType } },
    update: data, // ไม่แตะ genres ตอน update (กัน MovieGenre ซ้ำ)
    create: {
      ...data,
      genres: { create: genres.map((g) => ({ genreId: g.id })) },
    },
  });
}

// ค้นจาก TMDB Discover (ใช้เลือกเรื่องให้บทความรวมเรื่อง) — คืน results หน้าแรก
export async function discover(mediaType, params = {}) {
  const data = await tmdbGet(`/discover/${mediaType}`, { include_adult: false, ...params });
  return data.results || [];
}

// list: 'popular' | 'now_playing' (กำลังฉาย) | 'upcoming' | 'top_rated'
// ดึงเรื่องเดียวตาม tmdbId (ถ้ายังไม่มีใน DB) แล้วคืนค่า Movie
export async function syncOne(tmdbId, mediaType = 'movie') {
  const where = { tmdbId_mediaType: { tmdbId, mediaType } };
  const existing = await prisma.movie.findUnique({ where });
  if (existing) return existing;

  if (mediaType === 'tv') await ensureTvGenres();
  const details = await tmdbGet(`/${mediaType}/${tmdbId}`, {
    append_to_response: mediaType === 'tv' ? 'credits,videos,external_ids' : 'credits,videos,images',
  });
  await upsertMovie(details, mediaType);
  return prisma.movie.findUnique({ where });
}

export async function syncMovies({ maxPages = Infinity, startPage = 1, list = 'popular' } = {}) {
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  const first = await tmdbGet(`/movie/${list}`, { page: startPage });
  const lastPage = Math.min(first.total_pages || 1, TMDB_PAGE_LIMIT, startPage - 1 + maxPages);
  log(`เริ่ม sync หนัง (${list}) → ตาราง Movie | total_pages=${first.total_pages} → หน้า ${startPage}..${lastPage}`);

  for (let page = startPage; page <= lastPage; page++) {
    let data;
    try {
      data = page === startPage ? first : await tmdbGet(`/movie/${list}`, { page });
    } catch (err) {
      failed++;
      logError(`ดึงหน้า ${page} ไม่สำเร็จ ข้ามไป`, err);
      continue;
    }

    for (const item of data.results || []) {
      try {
        // เช็คซ้ำก่อน: ถ้ามีใน DB แล้ว ข้ามเลย (ไม่ต้องดึง details / ไม่ต้องเขียนทับ)
        const exists = await prisma.movie.findUnique({
          where: { tmdbId_mediaType: { tmdbId: item.id, mediaType: 'movie' } },
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
// TV → ตาราง Movie (mediaType = tv)
// list: 'popular' | 'on_the_air' (กำลังออกอากาศ) | 'airing_today' | 'top_rated'
// ============================================================
// discover = params ของ /discover/tv (ใช้แทน list) เช่น { with_original_language: 'th' }
export async function syncTvSeries({ maxPages = Infinity, startPage = 1, list = 'popular', discover: discoverParams, label } = {}) {
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  await ensureTvGenres();
  const path = discoverParams ? '/discover/tv' : `/tv/${list}`;
  const params = discoverParams ? { include_adult: false, sort_by: 'popularity.desc', ...discoverParams } : {};
  const name = label || list;
  const first = await tmdbGet(path, { ...params, page: startPage });
  const lastPage = Math.min(first.total_pages || 1, TMDB_PAGE_LIMIT, startPage - 1 + maxPages);
  log(`เริ่ม sync ซีรีย์ (${name}) → ตาราง Movie | total_pages=${first.total_pages} → หน้า ${startPage}..${lastPage}`);

  for (let page = startPage; page <= lastPage; page++) {
    let data;
    try {
      data = page === startPage ? first : await tmdbGet(path, { ...params, page });
    } catch (err) {
      failed++;
      logError(`[tv] ดึงหน้า ${page} ไม่สำเร็จ`, err);
      continue;
    }

    for (const item of data.results || []) {
      try {
        // เช็คซ้ำก่อน: ถ้ามีแล้ว ข้ามเลย
        const exists = await prisma.movie.findUnique({
          where: { tmdbId_mediaType: { tmdbId: item.id, mediaType: 'tv' } },
          select: { id: true },
        });
        if (exists) { skipped++; continue; }

        const details = await tmdbGet(`/tv/${item.id}`, {
          append_to_response: 'credits,videos,external_ids',
        });
        await upsertMovie(details, 'tv');
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

// ============================================================
// ซีรีส์ที่คนไทยดู — popular ของ TMDB เป็นซีรีส์ฝรั่งเกือบทั้งหมด จึงดึงแยกตามภาษา/ที่ดูได้ในไทยเพิ่ม
// ตัดรายการข่าว (10763) และทอล์กโชว์ (10767) — ไทย/เกาหลี/ดูได้ในไทย เก็บวาไรตี้ไว้ (เช่น Running Man มีคนดูในไทยเยอะ)
// ============================================================
const NO_TALK = { without_genres: '10763|10767' };
const NO_VARIETY = { without_genres: '10763|10764|10767' }; // + ตัดเรียลลิตี้/วาไรตี้ (ชื่อมักไม่มีภาษาไทย)
export const TV_DISCOVER_SETS = [
  { label: 'ดูได้ในไทย (สตรีมมิง)', params: { watch_region: 'TH', with_watch_monetization_types: 'flatrate|free|ads', 'vote_count.gte': 20, ...NO_TALK } },
  { label: 'ซีรีส์ไทย', params: { with_original_language: 'th', 'vote_count.gte': 2, ...NO_TALK } },
  { label: 'ซีรีส์เกาหลี', params: { with_original_language: 'ko', 'vote_count.gte': 20, ...NO_TALK } },
  { label: 'ซีรีส์จีน', params: { with_original_language: 'zh', 'vote_count.gte': 10, ...NO_VARIETY } },
  { label: 'ซีรีส์ญี่ปุ่น/อนิเมะ', params: { with_original_language: 'ja', 'vote_count.gte': 30, ...NO_VARIETY } },
  { label: 'ซีรีส์ฝรั่ง', params: { with_original_language: 'en', 'vote_count.gte': 300, ...NO_VARIETY } },
];

export async function syncTvDiscover({ maxPages = 5 } = {}) {
  const results = [];
  for (const set of TV_DISCOVER_SETS) {
    results.push(await syncTvSeries({ discover: set.params, label: set.label, maxPages }));
  }
  const saved = results.reduce((n, r) => n + r.saved, 0);
  log(`✅ ซีรีส์ตามภาษา/ดูได้ในไทย — เพิ่มใหม่รวม ${saved} เรื่อง`);
  return { saved, results };
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
