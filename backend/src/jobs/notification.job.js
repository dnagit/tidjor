import cron from 'node-cron';
import { runWatchlistNotifications } from '../services/notification.service.js';

// แจ้งเตือนจาก Watchlist ทุกวัน — NOTIFY_CRON (ค่าเริ่มต้น 07:00 เวลาไทย, ตั้ง "off" = ปิด)
export function startNotificationJob() {
  const schedule = process.env.NOTIFY_CRON || '0 7 * * *';
  if (schedule === 'off') return;
  let running = false;
  cron.schedule(schedule, async () => {
    if (running) return;
    running = true;
    try { await runWatchlistNotifications(); } catch (err) { console.error('[notify] cron error:', err); } finally { running = false; }
  }, { timezone: 'Asia/Bangkok' });
  console.log(`[notify] cron ทำงาน: "${schedule}" (Asia/Bangkok)`);
}
