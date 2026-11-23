import cron from 'node-cron';
import { generateReviews } from '../services/aiReview.service.js';

// ============================================================
// รีวิวหนังด้วย AI อัตโนมัติทุกวัน (หนังใหม่ก่อน)
//
// env:
//   AI_REVIEW_CRON=0 9 * * *   # เวลาที่รัน (เวลาไทย) — ไม่ตั้ง = ปิด job
//   AI_REVIEW_DAILY=5          # จำนวนรีวิวต่อรอบ
//   AI_REVIEW_SERIES=2         # ในจำนวนนั้นกันไว้ให้ซีรีส์กี่เรื่อง (ที่เหลือเป็นหนัง)
// ============================================================

export function startAiReviewJob() {
  const schedule = process.env.AI_REVIEW_CRON;
  if (!schedule) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[ai-review] ข้าม cron: ยังไม่ได้ตั้ง ANTHROPIC_API_KEY');
    return;
  }

  const limit = Number(process.env.AI_REVIEW_DAILY || 5);
  let running = false;

  cron.schedule(schedule, async () => {
    if (running) return; // รอบก่อนยังไม่จบ ไม่ซ้อน
    running = true;
    try {
      await generateReviews({ limit });
    } catch (err) {
      console.error('[ai-review] cron error:', err);
    } finally {
      running = false;
    }
  }, { timezone: 'Asia/Bangkok' });

  console.log(`[ai-review] cron ทำงาน: "${schedule}" (Asia/Bangkok) วันละ ${limit} รีวิว`);
}
