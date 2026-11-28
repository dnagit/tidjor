import cron from 'node-cron';
import { syncMovies, syncTvSeries, syncTvDiscover } from '../services/tmdbSync.service.js';
import { buildSearchAliases } from '../services/searchAliases.service.js';
import { invalidateSearchIndex } from '../services/search.service.js';

// ============================================================
// ดึงหนังและซีรีย์ใหม่จาก TMDB ทุกวัน — ตั้งเวลาให้รันก่อน AI review
// (หนังที่มีใน DB แล้วจะถูกข้าม จึงรันซ้ำได้เร็ว)
//
// env:
//   TMDB_SYNC_CRON=0 8 * * *   # เวลาที่รัน (เวลาไทย) — ไม่ตั้ง = ปิด job
//   TMDB_SYNC_PAGES=5          # จำนวนหน้าต่อ list (หน้าละ 20 เรื่อง)
// ============================================================

export function startTmdbSyncJob() {
  const schedule = process.env.TMDB_SYNC_CRON;
  if (!schedule) return;

  const maxPages = Number(process.env.TMDB_SYNC_PAGES || 5);
  let running = false;

  cron.schedule(schedule, async () => {
    if (running) return; // รอบก่อนยังไม่จบ ไม่ซ้อน
    running = true;
    try {
      // กำลังฉาย = หนังใหม่, popular = หนังที่คนกำลังสนใจ
      await syncMovies({ list: 'now_playing', maxPages });
      await syncMovies({ list: 'popular', maxPages });
      // ซีรีย์: กำลังออกอากาศ + ยอดนิยม
      await syncTvSeries({ list: 'on_the_air', maxPages });
      await syncTvSeries({ list: 'popular', maxPages });
      // ซีรีส์ไทย/เกาหลี/จีน/ญี่ปุ่น/ดูได้ในไทย — ชุดละ 2 หน้า (เรื่องที่มีแล้วข้ามเร็ว)
      await syncTvDiscover({ maxPages: Number(process.env.TMDB_SYNC_TV_DISCOVER_PAGES || 2) });
      // เรื่องใหม่ → ชื่อเรียกอื่นสำหรับค้นหา (ชื่ออังกฤษ/ไทยทางการ + คำอ่านไทย)
      await buildSearchAliases({ limit: 1000 });
      invalidateSearchIndex();
    } catch (err) {
      console.error('[tmdb-sync] cron error:', err);
    } finally {
      running = false;
    }
  }, { timezone: 'Asia/Bangkok' });

  console.log(`[tmdb-sync] cron ทำงาน: "${schedule}" (Asia/Bangkok) ${maxPages} หน้า/list`);
}
