import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { syncMovies, syncTvSeries, syncAllMedia, syncTvDiscover } from '../src/services/tmdbSync.service.js';

// ============================================================
// CLI runner
//   node scripts/syncTmdb.js [movies|tv|all] [maxPages]
//
// ตัวอย่าง:
//   node scripts/syncTmdb.js all          # ดึงทั้งหมด (ทุกหน้าที่ TMDB ยอมให้)
//   node scripts/syncTmdb.js movies 5     # ดึงเฉพาะหนัง 5 หน้าแรก
//   node scripts/syncTmdb.js tv 10        # ดึงเฉพาะซีรีย์ 10 หน้าแรก
//   node scripts/syncTmdb.js tv-discover 25   # ซีรีส์ไทย/เกาหลี/จีน/ญี่ปุ่น/ฝรั่ง/ดูได้ในไทย ชุดละ 25 หน้า
//
// env เสริม:
//   TMDB_RATE_DELAY_MS=250    # หน่วงระหว่าง request (กัน rate limit)
// ============================================================

const [, , cmd = 'all', pagesArg] = process.argv;
const maxPages = pagesArg ? Number(pagesArg) : Infinity;
const opts = { maxPages };

async function main() {
  switch (cmd) {
    case 'movies':
      await syncMovies(opts);
      break;
    case 'tv':
      await syncTvSeries(opts);
      break;
    case 'tv-discover':
      await syncTvDiscover({ maxPages: Number.isFinite(maxPages) ? maxPages : 5 });
      break;
    case 'all':
      await syncAllMedia(opts);
      break;
    default:
      console.error(`คำสั่งไม่ถูกต้อง: "${cmd}" — ใช้ได้: movies | tv | tv-discover | all`);
      process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('[tmdb-sync] หยุดทำงานเพราะ error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
