import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { generateReviews } from '../src/services/aiReview.service.js';

// ============================================================
// CLI runner
//   node scripts/generateReviews.js [limit|slug]
//
// ตัวอย่าง:
//   node scripts/generateReviews.js            # รีวิวหนังยอดนิยมที่บอทยังไม่ได้รีวิว 10 เรื่อง
//   node scripts/generateReviews.js 50         # 50 เรื่อง
//   node scripts/generateReviews.js dune-part-two   # รีวิว (ใหม่) เฉพาะเรื่องนี้
//
// env:
//   ANTHROPIC_API_KEY             # จำเป็น
//   OMDB_API_KEY                  # คะแนน IMDb / Rotten Tomatoes / Metacritic
//   AI_REVIEW_MODEL=claude-sonnet-5-5
//   AI_REVIEW_WEB_SEARCH=false    # ปิดการค้นเว็บ (ประหยัดขึ้น)
//   AI_REVIEW_MAX_SEARCHES=5      # จำนวนครั้งค้นเว็บสูงสุดต่อเรื่อง
// ============================================================

const [, , arg] = process.argv;
const opts = arg && Number.isNaN(Number(arg)) ? { slug: arg, limit: 1 } : { limit: Number(arg) || 10 };

generateReviews(opts)
  .catch((err) => {
    console.error('[ai-review] หยุดทำงานเพราะ error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
