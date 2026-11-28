import prisma from '../config/prisma.js';
import { refreshNow } from './watchProviders.service.js';

// ============================================================
// แจ้งเตือนจาก Watchlist (ในเว็บ — กระดิ่งมุมบนขวา)
//   1) เรื่องที่รอ เข้าฉาย/เริ่มออนวันนี้
//   2) เรื่องที่รอ มาลงสตรีมมิงในไทย (เช่น Netflix) — เทียบกับข้อมูลครั้งก่อน
// key ใน Notification กันแจ้งซ้ำ (unique ต่อผู้ใช้)
// ============================================================

const DAY = 24 * 60 * 60 * 1000;
const pathOf = (m) => `${m.mediaType === 'tv' ? '/series' : '/movies'}/${m.slug}`;
const MAX_PROVIDER_CHECKS = Number(process.env.NOTIFY_PROVIDER_CHECKS || 300);

// includeWatched: แจ้งคนที่ดูแล้วด้วย (เช่น ซีซั่นใหม่ — คนที่ดูจบซีซั่นก่อนอยากรู้ที่สุด)
export async function notifyWatchers(movie, key, title, body, { includeWatched = false } = {}) {
  const watchers = await prisma.watchlist.findMany({
    where: {
      movieId: movie.id,
      ...(!includeWatched && { status: { not: 'WATCHED' } }),
      user: { isBot: false, isBanned: false },
    },
    select: { userId: true },
  });
  if (!watchers.length) return 0;
  const { count } = await prisma.notification.createMany({
    data: watchers.map(({ userId }) => ({
      userId, key, title, body, url: pathOf(movie), imageUrl: movie.posterUrl,
    })),
    skipDuplicates: true,
  });
  return count;
}

export async function runWatchlistNotifications() {
  let sent = 0;
  const watched = { watchlist: { some: { status: { not: 'WATCHED' } } } };

  // 1) เข้าฉาย/เริ่มออน — ช่วง 2 วันที่ผ่านมา (เผื่อ cron พลาดไป 1 รอบ / เขตเวลา)
  const now = Date.now();
  const released = await prisma.movie.findMany({
    where: { ...watched, isPublished: true, releaseDate: { gte: new Date(now - 2 * DAY), lte: new Date(now) } },
    select: { id: true, slug: true, title: true, titleTh: true, mediaType: true, posterUrl: true },
  });
  for (const m of released) {
    const name = m.titleTh || m.title;
    sent += await notifyWatchers(m, `release:${m.id}`,
      m.mediaType === 'tv' ? `📺 ${name} เริ่มออนแล้ว` : `🎬 ${name} เข้าฉายแล้ว`,
      'เรื่องที่อยู่ใน Watchlist ของคุณ ดูได้ที่ไหน กดดูรายละเอียด');
  }

  // 2) มาลงสตรีมมิง — อัปเดตข้อมูล "ดูได้ที่ไหน" ของเรื่องที่มีคนรอ (เก่าสุดก่อน)
  const pending = await prisma.movie.findMany({
    where: { ...watched, isPublished: true, tmdbId: { not: null } },
    orderBy: { watchProvidersAt: { sort: 'asc', nulls: 'first' } },
    take: MAX_PROVIDER_CHECKS,
    select: {
      id: true, slug: true, title: true, titleTh: true, mediaType: true, posterUrl: true,
      tmdbId: true, updatedAt: true, watchProviders: true, watchProvidersAt: true,
    },
  });
  for (const m of pending) {
    try {
      const { before, after, firstFetch } = await refreshNow(m);
      if (firstFetch) continue; // ครั้งแรกไม่รู้ว่า "ใหม่" หรือมีอยู่แล้ว → ไม่แจ้ง
      const name = m.titleTh || m.title;
      for (const provider of after.filter((p) => !before.includes(p))) {
        sent += await notifyWatchers(m, `stream:${m.id}:${provider}`,
          `🍿 ${name} มาลง ${provider} แล้ว`, 'เรื่องที่อยู่ใน Watchlist ของคุณ ดูได้แล้วในไทย');
      }
    } catch (err) {
      console.warn(`[notify] ${m.slug}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 250)); // ไม่ยิง TMDB ถี่เกิน
  }

  // ลบแจ้งเตือนที่อ่านแล้วเก่ากว่า 90 วัน
  await prisma.notification.deleteMany({ where: { isRead: true, createdAt: { lt: new Date(now - 90 * DAY) } } });
  console.log(`[notify] ส่งแจ้งเตือน ${sent} รายการ (เข้าฉาย ${released.length} เรื่อง, ตรวจสตรีมมิง ${pending.length} เรื่อง)`);
  return sent;
}
