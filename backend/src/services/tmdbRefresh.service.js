import prisma from '../config/prisma.js';
import { tmdbGet } from './tmdbSync.service.js';
import { mapTmdbMovie, mapTmdbTv } from './tmdb.service.js';
import { notifyWatchers } from './notification.service.js';

// ============================================================
// อัปเดตข้อมูลเรื่องที่มีในเว็บอยู่แล้ว (sync ปกติข้ามเรื่องที่มีแล้ว ข้อมูลจึงค้าง)
//   - refreshChanged: ถาม TMDB Changes API ว่าเรื่องไหนเปลี่ยนใน N วัน → อัปเดตเฉพาะที่เรามี (รายวัน)
//   - refreshStale: ไล่อัปเดตเรื่องที่ยังเปลี่ยนได้ (ซีรีส์ทั้งหมด, หนังใกล้ฉาย/เพิ่งฉาย) (ครั้งเดียว/สำรอง)
// ไม่แตะ: slug, genres, เรื่องที่แอดมินเพิ่มเอง (MANUAL), โปสเตอร์ที่แอดมินอัปโหลด
// ซีซั่นใหม่ → แจ้งเตือนคนที่มีเรื่องนั้นใน Watchlist
// ============================================================

const DAY = 864e5;
const log = (msg) => console.log(`[tmdb-refresh] ${msg}`);
const isTmdbImage = (url) => !url || url.includes('image.tmdb.org');
const hasThai = (s) => /[฀-๿]/.test(s || '');

export async function refreshOne(movie) {
  const tv = movie.mediaType === 'tv';
  const details = await tmdbGet(`/${movie.mediaType}/${movie.tmdbId}`, {
    append_to_response: tv ? 'credits,videos,external_ids' : 'credits,videos',
  });
  const fresh = tv ? mapTmdbTv(details, movie.slug) : mapTmdbMovie(details, movie.slug);

  const data = {};
  const set = (key, value) => {
    if (value === undefined || value === null || value === '') return; // ไม่ลบข้อมูลเดิมด้วยค่าว่าง
    if (JSON.stringify(value) !== JSON.stringify(movie[key])) data[key] = value;
  };
  set('overview', fresh.overview);
  set('tagline', fresh.tagline);
  set('trailerUrl', fresh.trailerUrl);
  set('releaseDate', fresh.releaseDate);
  set('runtime', fresh.runtime);
  set('status', ['RELEASED', 'UPCOMING', 'IN_PRODUCTION', 'RUMORED'].includes(fresh.status) ? fresh.status : 'RELEASED');
  set('director', fresh.director);
  set('studio', fresh.studio);
  set('imdbId', fresh.imdbId);
  if (fresh.cast?.length) set('cast', fresh.cast);
  if (isTmdbImage(movie.posterUrl)) set('posterUrl', fresh.posterUrl);
  if (isTmdbImage(movie.backdropUrl)) set('backdropUrl', fresh.backdropUrl);
  // ชื่อไทยที่ TMDB เพิ่มทีหลัง — ใช้เฉพาะตอนที่ชื่อเดิมยังไม่ใช่ภาษาไทย
  if (hasThai(fresh.title) && !hasThai(movie.title)) data.title = fresh.title;
  if (tv) {
    set('numberOfSeasons', fresh.numberOfSeasons);
    set('numberOfEpisodes', fresh.numberOfEpisodes);
  }
  if (!Object.keys(data).length) return { changed: false };

  if (data.imdbId) {
    // imdbId เป็น unique — ถ้าชนกับเรื่องอื่น ไม่ต้องอัปเดตช่องนี้
    const clash = await prisma.movie.findFirst({ where: { imdbId: data.imdbId, id: { not: movie.id } }, select: { id: true } });
    if (clash) delete data.imdbId;
  }
  await prisma.movie.update({ where: { id: movie.id }, data });

  // ซีซั่นใหม่ → แจ้งเตือน (รวมคนที่ดูซีซั่นก่อนจบแล้ว)
  let notified = 0;
  if (tv && data.numberOfSeasons && movie.numberOfSeasons && data.numberOfSeasons > movie.numberOfSeasons) {
    const name = data.title || movie.titleTh || movie.title;
    notified = await notifyWatchers({ ...movie, ...data }, `season:${movie.id}:${data.numberOfSeasons}`,
      `🆕 ${name} มีซีซั่น ${data.numberOfSeasons} แล้ว`, 'เรื่องที่อยู่ใน Watchlist ของคุณ ดูรายละเอียดและวันออกอากาศ',
      { includeWatched: true });
  }
  return { changed: true, fields: Object.keys(data), notified };
}

const select = {
  id: true, slug: true, tmdbId: true, mediaType: true, title: true, titleTh: true, posterUrl: true, backdropUrl: true,
  overview: true, tagline: true, trailerUrl: true, releaseDate: true, runtime: true, status: true, director: true,
  studio: true, imdbId: true, cast: true, numberOfSeasons: true, numberOfEpisodes: true,
};

async function refreshMany(movies, label) {
  let changed = 0; let failed = 0; let notified = 0; const seasons = [];
  for (const [i, m] of movies.entries()) {
    try {
      const r = await refreshOne(m);
      if (r.changed) changed++;
      if (r.fields?.includes('numberOfSeasons')) seasons.push(m.slug);
      notified += r.notified || 0;
    } catch (err) {
      failed++;
      if (err.response?.status !== 404) log(`✗ ${m.slug}: ${err.message}`);
    }
    if ((i + 1) % 200 === 0) log(`${label}: ${i + 1}/${movies.length} (อัปเดต ${changed})`);
  }
  log(`✅ ${label}: ตรวจ ${movies.length} เรื่อง อัปเดต ${changed} เรื่อง ล้มเหลว ${failed}` +
    `${seasons.length ? ` · ซีซั่นใหม่ ${seasons.length} เรื่อง (แจ้งเตือน ${notified} คน)` : ''}`);
  return { checked: movies.length, changed, failed, notified };
}

// TMDB Changes API: id ที่เปลี่ยนในช่วงวันที่ (ย้อนได้สูงสุด 14 วัน, หน้าละ 100)
async function changedIds(type, days) {
  const ymd = (t) => new Date(t).toISOString().slice(0, 10);
  const params = { start_date: ymd(Date.now() - days * DAY), end_date: ymd(Date.now()) };
  const ids = new Set();
  const first = await tmdbGet(`/${type}/changes`, { ...params, page: 1 });
  const pages = Math.min(first.total_pages || 1, 500);
  for (const r of first.results || []) ids.add(r.id);
  for (let page = 2; page <= pages; page++) {
    const data = await tmdbGet(`/${type}/changes`, { ...params, page });
    for (const r of data.results || []) ids.add(r.id);
  }
  return [...ids];
}

export async function refreshChanged({ days = 2 } = {}) {
  const results = {};
  for (const type of ['tv', 'movie']) {
    const ids = await changedIds(type, Math.min(days, 14));
    const movies = [];
    for (let i = 0; i < ids.length; i += 1000) {
      movies.push(...await prisma.movie.findMany({
        where: { mediaType: type, source: 'TMDB', tmdbId: { in: ids.slice(i, i + 1000) } },
        select,
      }));
    }
    log(`${type}: TMDB แจ้งว่าเปลี่ยน ${ids.length} เรื่อง → มีในเว็บ ${movies.length} เรื่อง`);
    results[type] = await refreshMany(movies, type === 'tv' ? 'ซีรีส์ที่เปลี่ยน' : 'หนังที่เปลี่ยน');
  }
  return results;
}

// ไล่อัปเดตเรื่องที่ข้อมูลยังเปลี่ยนได้ — ใช้ครั้งแรก (ข้อมูลเก่าก่อนมีระบบนี้) หรือสำรอง
export async function refreshStale({ limit = 5000 } = {}) {
  const now = Date.now();
  const movies = await prisma.movie.findMany({
    where: {
      source: 'TMDB', tmdbId: { not: null },
      OR: [
        { mediaType: 'tv' },
        { releaseDate: { gte: new Date(now - 180 * DAY) } }, // หนังเพิ่งฉาย/ใกล้ฉาย
        { releaseDate: null },
        { status: { not: 'RELEASED' } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    select,
  });
  return refreshMany(movies, 'อัปเดตเรื่องที่ยังเปลี่ยนได้');
}
