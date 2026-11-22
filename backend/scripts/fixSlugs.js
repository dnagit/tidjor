import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { buildSlug, slugTitle } from '../src/services/tmdbSync.service.js';

// ============================================================
// แก้ slug ที่ไม่มีความหมาย (เช่น /movies/2026-1575337 ของหนังญี่ปุ่น/เกาหลี/ฮินดี)
// ให้เป็นชื่อภาษาอังกฤษจาก TMDB เช่น /movies/cosmic-princess-kaguya-2026
// slug เดิมเก็บไว้ใน oldSlugs → ลิงก์เก่า redirect 301 มาที่ใหม่
//
//   node scripts/fixSlugs.js           # แก้ทั้งหมด
//   node scripts/fixSlugs.js 20        # ลองแค่ 20 เรื่องก่อน
//   node scripts/fixSlugs.js 20 --dry  # แสดงผลอย่างเดียว ไม่บันทึก
// ============================================================

const limit = Number(process.argv[2]) || undefined;
const dry = process.argv.includes('--dry');

async function main() {
  // slug ที่มีแต่ตัวเลข เช่น 2026-1575337, 2026-tv-279246, movie-123
  const rows = await prisma.$queryRaw`
    SELECT id, slug, "tmdbId", "mediaType"::text AS "mediaType", "originalTitle", "releaseDate"
    FROM "Movie"
    WHERE "tmdbId" IS NOT NULL AND slug !~ '[a-z]'
       OR "tmdbId" IS NOT NULL AND slug ~ '^(movie|tv)-[0-9]+$'
    ORDER BY "releaseDate" DESC NULLS LAST`;
  const todo = limit ? rows.slice(0, limit) : rows;
  console.log(`[fix-slugs] พบ ${rows.length} เรื่อง → ทำ ${todo.length}${dry ? ' (dry run)' : ''}`);

  let changed = 0;
  for (const m of todo) {
    try {
      const title = await slugTitle(m.tmdbId, m.mediaType, m.originalTitle);
      if (!/[a-z]/.test(title)) continue; // TMDB ไม่มีชื่ออังกฤษ → คง slug เดิม

      // title เป็นตัวอักษรละตินแล้ว → buildSlug ใช้ตรง ๆ ไม่ต้องเรียก TMDB ซ้ำ
      const date = m.releaseDate ? m.releaseDate.toISOString() : '';
      const slug = await buildSlug(m.tmdbId, m.mediaType, title, date);
      if (slug === m.slug) continue;

      if (!dry) {
        await prisma.movie.update({
          where: { id: m.id },
          data: { slug, oldSlugs: { push: m.slug } },
        });
      }
      changed++;
      console.log(`[fix-slugs] ${m.slug} → ${slug}`);
    } catch (err) {
      console.error(`[fix-slugs] ✗ ${m.slug}:`, err.message);
    }
  }
  console.log(`[fix-slugs] เสร็จ — เปลี่ยน ${changed}/${todo.length}`);
}

main()
  .catch((err) => {
    console.error('[fix-slugs] หยุดทำงานเพราะ error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
