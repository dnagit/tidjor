import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { syncMovies, syncTvSeries, syncAllMedia } from '../src/services/tmdbSync.service.js';

// ============================================================
// CLI runner
//   node scripts/syncTmdb.js [movies|tv|all] [maxPages]
//
// ตัวอย่าง:
//   node scripts/syncTmdb.js all          # ดึงทั้งหมด (ทุกหน้าที่ TMDB ยอมให้)
//   node scripts/syncTmdb.js movies 5     # ดึงเฉพาะหนัง 5 หน้าแรก
//   node scripts/syncTmdb.js tv 10        # ดึงเฉพาะซีรีย์ 10 หน้าแรก
//
// env เสริม:
//   TMDB_WITH_DETAILS=false   # ข้ามการดึง details ทีละเรื่อง (เร็วขึ้นมาก)
//   TMDB_RATE_DELAY_MS=250    # หน่วงระหว่าง request (กัน rate limit)
// ============================================================

const [, , cmd = 'all', pagesArg] = process.argv;
const maxPages = pagesArg ? Number(pagesArg) : Infinity;
const withDetails = process.env.TMDB_WITH_DETAILS !== 'false';
const opts = { maxPages, withDetails };

async function main() {
  switch (cmd) {
    case 'movies':
      await syncMovies(opts);
      break;
    case 'tv':
      await syncTvSeries(opts);
      break;
    case 'all':
      await syncAllMedia(opts);
      break;
    default:
      console.error(`คำสั่งไม่ถูกต้อง: "${cmd}" — ใช้ได้: movies | tv | all`);
      process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('[tmdb-sync] หยุดทำงานเพราะ error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
