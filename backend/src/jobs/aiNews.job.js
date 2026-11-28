import cron from 'node-cron';
import { generateNews } from '../services/aiNews.service.js';

// ============================================================
// ข่าวหนัง/ซีรีส์ที่กำลังจะเข้าฉาย/ออน ด้วย AI ทุกวัน (เผยแพร่อัตโนมัติ)
//
// env:
//   AI_NEWS_CRON=0 10 * * *   # เวลาที่รัน (เวลาไทย) — ไม่ตั้ง = ปิด job
//   AI_NEWS_DAILY=1           # จำนวนข่าวต่อรอบ
// ============================================================

export function startAiNewsJob() {
  const schedule = process.env.AI_NEWS_CRON;
  if (!schedule) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[ai-news] ข้าม cron: ยังไม่ได้ตั้ง ANTHROPIC_API_KEY');
    return;
  }

  const limit = Number(process.env.AI_NEWS_DAILY || 1);
  let running = false;

  cron.schedule(schedule, async () => {
    if (running) return;
    running = true;
    try {
      await generateNews({ limit });
    } catch (err) {
      console.error('[ai-news] cron error:', err);
    } finally {
      running = false;
    }
  }, { timezone: 'Asia/Bangkok' });

  console.log(`[ai-news] cron ทำงาน: "${schedule}" (Asia/Bangkok) วันละ ${limit} ข่าว`);
}
