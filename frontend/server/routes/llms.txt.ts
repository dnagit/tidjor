// /llms.txt — ไฟล์อธิบายเว็บไซต์สำหรับ LLM (มาตรฐาน llmstxt.org)
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const site = (config.public.siteUrl || 'http://localhost:3000').replace(/\/+$/, '');

  const body = `# ติดจอ (Tid Jor)

> แพลตฟอร์มรีวิวหนังภาษาไทย — ค้นหาหนังไทยและต่างประเทศ อ่าน/เขียนรีวิว ให้คะแนน 1–10 และเก็บ watchlist ข้อมูลหนังมาจาก TMDB

ติดจอ (Tid Jor) is a Thai-language movie review and rating platform. Visitors can browse movies (Thai and international), read and write reviews, give ratings (1–10), comment on reviews, and build personal watchlists. Movie metadata (titles, posters, overview, genres, cast) is sourced from TMDB. The primary content language is Thai.

## หน้าหลัก (Main pages)
- [หน้าแรก / Home](${site}/): หนังยอดนิยมและรีวิวล่าสุด
- [รายการหนัง / Movies](${site}/movies): ค้นหาและกรองหนังทั้งหมด (ตามหมวดหมู่ ปี คะแนน)
- [รีวิว / Reviews](${site}/reviews): ฟีดรีวิวจากผู้ใช้

## โครงสร้าง URL (URL patterns)
- รายละเอียดหนัง: ${site}/movies/{slug}
- โปรไฟล์ผู้ใช้: ${site}/u/{username}
- แผนผังเว็บ: ${site}/sitemap.xml

## หมายเหตุ (Notes)
- เนื้อหาหลักเป็นภาษาไทย (primary language: Thai)
- คะแนนหนังเป็นระบบ 1–10 คล้าย IMDb
- หน้าที่ไม่ใช่สาธารณะและไม่ควรนำไปอ้างอิง: ${site}/admin (ระบบหลังบ้าน), ${site}/auth (ล็อกอิน), ${site}/watchlist (ข้อมูลส่วนตัวผู้ใช้)
`;

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return body;
});
