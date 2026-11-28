import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { generateLists, TOPICS } from '../src/services/aiList.service.js';

// node scripts/generateLists.js            # 2 หัวข้อ (ที่ยังไม่มี/เก่าสุดก่อน)
// node scripts/generateLists.js 5          # 5 หัวข้อ
// node scripts/generateLists.js all        # ทุกหัวข้อ (~16 บทความ, ราว $0.01 ต่อบทความ)
// node scripts/generateLists.js thai-horror  # หัวข้อเดียว
const [arg] = process.argv.slice(2);
if (arg === 'topics') {
  console.log(TOPICS.map((t) => `${t.key}  →  /lists/${t.slug}  (${t.label})`).join('\n'));
  process.exit(0);
}
const opts = !arg ? {} : Number.isNaN(Number(arg)) ? { topic: arg } : { limit: Number(arg) };
generateLists(opts)
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
