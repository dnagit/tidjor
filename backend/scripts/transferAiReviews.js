import './loadEnv.js';
import fs from 'fs/promises';
import prisma from '../src/config/prisma.js';
import { getBotUsers } from '../src/services/aiReview.service.js';
import { syncOne } from '../src/services/tmdbSync.service.js';
import { recomputeMovieStats } from '../src/services/movieStats.service.js';

// ============================================================
// ย้ายรีวิวจากบอท (AI) ระหว่างฐานข้อมูล เช่น เครื่อง dev → server
//   node scripts/transferAiReviews.js export [file]   # ดึงรีวิวบอทออกเป็น JSON
//   node scripts/transferAiReviews.js import [file]   # นำเข้า (รันซ้ำได้ ไม่ซ้ำ)
//
// จับคู่หนังด้วย tmdbId + mediaType (id ในแต่ละ DB ไม่ตรงกัน)
// เรื่องที่ DB ปลายทางยังไม่มี จะดึงจาก TMDB ให้อัตโนมัติ
// ============================================================

const [, , cmd, file = 'prisma/ai-reviews.json'] = process.argv;

async function exportReviews() {
  const reviews = await prisma.review.findMany({
    where: { user: { isBot: true }, movie: { tmdbId: { not: null } } },
    include: {
      user: { select: { username: true } },
      movie: { select: { tmdbId: true, mediaType: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const data = reviews.map((r) => ({
    username: r.user.username,
    tmdbId: r.movie.tmdbId,
    mediaType: r.movie.mediaType,
    movieTitle: r.movie.title,
    rating: r.rating,
    title: r.title,
    content: r.content,
    hasSpoiler: r.hasSpoiler,
    sources: r.sources,
    createdAt: r.createdAt,
  }));
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log(`[transfer] export ${data.length} รีวิว → ${file}`);
}

async function importReviews() {
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  const bots = Object.fromEntries((await getBotUsers()).map((b) => [b.username, b]));
  let done = 0;

  for (const r of data) {
    try {
      const bot = bots[r.username];
      if (!bot) throw new Error(`ไม่รู้จักบอท ${r.username}`);
      const movie = await syncOne(r.tmdbId, r.mediaType);
      if (!movie) throw new Error('หาเรื่องนี้ใน TMDB ไม่เจอ');

      const review = {
        rating: r.rating, title: r.title, content: r.content,
        hasSpoiler: r.hasSpoiler, sources: r.sources ?? undefined,
      };
      await prisma.review.upsert({
        where: { userId_movieId: { userId: bot.id, movieId: movie.id } },
        create: { ...review, userId: bot.id, movieId: movie.id, createdAt: new Date(r.createdAt) },
        update: review,
      });
      await recomputeMovieStats(movie.id);
      done++;
      console.log(`[transfer] ✓ ${movie.title} — ${r.rating}/10`);
    } catch (err) {
      console.error(`[transfer] ✗ ${r.movieTitle}:`, err.message);
    }
  }
  console.log(`[transfer] import เสร็จ ${done}/${data.length}`);
}

const run = { export: exportReviews, import: importReviews }[cmd];
if (!run) {
  console.error('ใช้: node scripts/transferAiReviews.js export|import [file]');
  process.exitCode = 1;
} else {
  run()
    .catch((err) => {
      console.error('[transfer] หยุดทำงานเพราะ error:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
