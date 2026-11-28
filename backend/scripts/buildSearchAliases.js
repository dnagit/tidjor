import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { buildSearchAliases } from '../src/services/searchAliases.service.js';

// ชื่อเรียกอื่นสำหรับค้นหา (ชื่ออังกฤษ/ไทยทางการจาก TMDB + คำอ่านไทยของชื่ออังกฤษโดย AI)
//   node scripts/buildSearchAliases.js          # ทั้งหมดที่ยังไม่มี (ครั้งแรก ~1-2 ชม. สำหรับ ~12,000 เรื่อง, AI ราว $0.2)
//   node scripts/buildSearchAliases.js 200      # 200 เรื่อง
const limit = Number(process.argv[2]) || 100000;
buildSearchAliases({ limit })
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
