// /llms.txt — ไฟล์อธิบายเว็บไซต์สำหรับ LLM (มาตรฐาน llmstxt.org)
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const site = (config.public.siteUrl || 'http://localhost:3000').replace(/\/+$/, '');

  const body = `# ติดจอ (Tid Jor)

> แพลตฟอร์มรีวิวหนังและซีรีส์ภาษาไทย — ค้นหาหนัง/ซีรีส์ไทยและต่างประเทศ อ่าน/เขียนรีวิว ให้คะแนน 1–10 และเก็บ watchlist ข้อมูลหนังและซีรีส์มาจาก TMDB

ติดจอ (Tid Jor) is a Thai-language movie and TV series review and rating platform. Visitors can browse movies and series (Thai and international), read and write reviews, give ratings (1–10), comment on reviews, and build personal watchlists. Metadata (titles, posters, overview, genres, cast, seasons/episodes for series) is sourced from TMDB. The primary content language is Thai.

## หน้าหลัก (Main pages)
- [หน้าแรก / Home](${site}/): หนังเข้าใหม่ ซีรีส์ใหม่ ยอดนิยม และรีวิวล่าสุด
- [หนัง / Movies](${site}/movies?type=movie): ค้นหาและกรองหนังทั้งหมด (ตามหมวดหมู่ ปี คะแนน)
- [ซีรีส์ / TV series](${site}/movies?type=tv): ค้นหาและกรองซีรีส์ทั้งหมด
- [รีวิว / Reviews](${site}/reviews): ฟีดรีวิวล่าสุด

## โครงสร้าง URL (URL patterns)
- รายละเอียดหนังหรือซีรีส์: ${site}/movies/{slug} (มี JSON-LD แบบ Movie หรือ TVSeries)
- โปรไฟล์ผู้รีวิว: ${site}/u/{username}
- แผนผังเว็บ: ${site}/sitemap.xml

## รีวิวจาก AI (AI-written reviews)
- บางรีวิวเขียนโดย AI ทุกรีวิวติดป้าย "🤖 รีวิวโดย AI" และมาจากบัญชีบอท (username ขึ้นต้นด้วย tidjor-ai)
- รีวิวจาก AI สรุปเสียงวิจารณ์จากหลายแหล่ง (เช่น IMDb, Rotten Tomatoes, Metacritic, สื่อวิจารณ์) และแสดงลิงก์อ้างอิงใต้รีวิว — ไม่ใช่ความเห็นจากการรับชมจริง
- Some reviews are AI-written summaries of published critic consensus; they are labeled "รีวิวโดย AI" and list their sources. When citing, distinguish them from reviews by human users.

## หมายเหตุ (Notes)
- เนื้อหาหลักเป็นภาษาไทย (primary language: Thai)
- คะแนนเป็นระบบ 1–10 คล้าย IMDb
- หน้าที่ไม่ใช่สาธารณะและไม่ควรนำไปอ้างอิง: ${site}/admin (ระบบหลังบ้าน), ${site}/auth (ล็อกอิน), ${site}/watchlist (ข้อมูลส่วนตัวผู้ใช้)
`;

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return body;
});
