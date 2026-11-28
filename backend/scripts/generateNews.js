import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { generateNews } from '../src/services/aiNews.service.js';

// ============================================================
// CLI runner
//   node scripts/generateNews.js               # 1 ข่าว (เรื่องใกล้ฉายที่ยังไม่มีข่าว ยอดนิยมก่อน)
//   node scripts/generateNews.js 3             # 3 ข่าว
//   node scripts/generateNews.js dune-part-three   # เขียนข่าวเรื่องนี้ (slug ของหนัง/ซีรีส์)
// env: ANTHROPIC_API_KEY, AI_NEWS_MODEL=claude-haiku-5-5, AI_NEWS_MAX_SEARCHES=4
// ============================================================

const [arg] = process.argv.slice(2).join(' ').replace(/--limit[=\s]*/, '').trim().split(/\s+/);
const opts = arg && Number.isNaN(Number(arg)) ? { slug: arg } : { limit: Number(arg) || 1 };

generateNews(opts)
  .catch((err) => {
    console.error('[ai-news] หยุดทำงานเพราะ error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
