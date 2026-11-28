import cron from 'node-cron';
import { generateLists } from '../services/aiList.service.js';

// บทความรวมเรื่อง (Top list) — สร้าง/อัปเดตทีละ AI_LIST_PER_RUN หัวข้อ (หัวข้อที่ยังไม่มี/เก่าสุดก่อน)
// env: AI_LIST_CRON=0 11 * * 1 (ทุกวันจันทร์ 11:00) — ไม่ตั้ง = ปิด, AI_LIST_PER_RUN=2
export function startAiListJob() {
  const schedule = process.env.AI_LIST_CRON;
  if (!schedule || !process.env.ANTHROPIC_API_KEY) return;
  const limit = Number(process.env.AI_LIST_PER_RUN || 2);
  let running = false;
  cron.schedule(schedule, async () => {
    if (running) return;
    running = true;
    try { await generateLists({ limit }); } catch (err) { console.error('[ai-list] cron error:', err); } finally { running = false; }
  }, { timezone: 'Asia/Bangkok' });
  console.log(`[ai-list] cron ทำงาน: "${schedule}" (Asia/Bangkok) ครั้งละ ${limit} หัวข้อ`);
}
