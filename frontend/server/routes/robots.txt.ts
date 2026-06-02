// /robots.txt — สร้างแบบ dynamic เพื่อชี้ไปยัง sitemap ตาม siteUrl ที่ตั้งไว้
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const site = (config.public.siteUrl || 'http://localhost:3000').replace(/\/+$/, '');

  const body = `# robots.txt — ติดจอ (Tid Jor)
User-agent: *
Allow: /

# หน้าที่ไม่ต้องการให้ index (ระบบหลังบ้าน / ส่วนตัว / ล็อกอิน)
Disallow: /admin
Disallow: /auth
Disallow: /watchlist

Sitemap: ${site}/sitemap.xml
`;

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return body;
});
