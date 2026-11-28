import cron from 'node-cron';
import { refreshChanged } from '../services/tmdbRefresh.service.js';

// อัปเดตข้อมูลเรื่องที่มีอยู่แล้ว (ซีซั่นใหม่ จำนวนตอน สถานะ เรื่องย่อ ฯลฯ) จาก TMDB Changes API ทุกวัน
// TMDB_REFRESH_CRON (ค่าเริ่มต้น 06:00 เวลาไทย — ก่อนแจ้งเตือน 07:00, "off" = ปิด)
export function startTmdbRefreshJob() {
  const schedule = process.env.TMDB_REFRESH_CRON || '0 6 * * *';
  if (schedule === 'off' || !process.env.TMDB_API_KEY) return;
  let running = false;
  cron.schedule(schedule, async () => {
    if (running) return;
    running = true;
    try { await refreshChanged({ days: 2 }); } catch (err) { console.error('[tmdb-refresh] cron error:', err); } finally { running = false; }
  }, { timezone: 'Asia/Bangkok' });
  console.log(`[tmdb-refresh] cron ทำงาน: "${schedule}" (Asia/Bangkok)`);
}
