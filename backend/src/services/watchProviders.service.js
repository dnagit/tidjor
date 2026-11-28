import prisma from '../config/prisma.js';
import { getWatchProviders } from './tmdb.service.js';

// ============================================================
// "ดูได้ที่ไหน" — cache ใน Movie.watchProviders
//   - ยังไม่เคยดึง → ดึงทันที (รอไม่เกิน ~2.5 วินาที ไม่ให้หน้าเว็บช้า)
//   - เก่าเกิน 3 วัน → ส่งของเดิมไปก่อน แล้วอัปเดตเบื้องหลัง
// ============================================================

const MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const refreshing = new Set();

async function refresh(movie) {
  if (refreshing.has(movie.id)) return movie.watchProviders;
  refreshing.add(movie.id);
  try {
    const providers = await getWatchProviders(movie.tmdbId, movie.mediaType);
    await prisma.movie.update({
      where: { id: movie.id },
      // คง updatedAt เดิม — ไม่ให้ lastmod ใน sitemap เปลี่ยนทุกครั้งที่อัปเดตข้อมูลนี้
      data: { watchProviders: providers ?? {}, watchProvidersAt: new Date(), updatedAt: movie.updatedAt },
    });
    return providers;
  } finally {
    refreshing.delete(movie.id);
  }
}

export async function ensureWatchProviders(movie) {
  if (!movie.tmdbId || !process.env.TMDB_API_KEY) return movie.watchProviders || null;
  const fresh = movie.watchProvidersAt && Date.now() - movie.watchProvidersAt.getTime() < MAX_AGE;
  if (fresh) return movie.watchProviders;

  const job = refresh(movie).catch((err) => {
    console.warn(`[watch-providers] ${movie.slug}: ${err.message}`);
    return movie.watchProviders || null;
  });
  if (movie.watchProvidersAt) return movie.watchProviders; // มีของเก่า → ไม่ต้องรอ
  const timeout = new Promise((r) => setTimeout(() => r(null), 2500));
  return Promise.race([job, timeout]);
}

// มีแพลตฟอร์มให้ดูไหม (ใช้ตัดสินว่าจะโชว์กล่องหรือเปล่า)
export const hasProviders = (p) => !!p && ['stream', 'free', 'rent', 'buy'].some((k) => p[k]?.length);
