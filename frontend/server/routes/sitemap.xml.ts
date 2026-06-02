// /sitemap.xml — รวมหน้าหลัก + หน้าหนังทุกเรื่อง (ดึง slug จาก API แบบวนทุกหน้า)
interface MovieItem { slug: string }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const site = (config.public.siteUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const api = (config.public.apiBase || 'http://localhost:4000').replace(/\/+$/, '');

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // หน้าหลัก (static)
  const urls: { loc: string; priority?: string }[] = [
    { loc: `${site}/`, priority: '1.0' },
    { loc: `${site}/movies`, priority: '0.8' },
    { loc: `${site}/reviews`, priority: '0.6' },
  ];

  // หน้าหนังทั้งหมด (เฉพาะที่ published — list API คืนเฉพาะ isPublished อยู่แล้ว)
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const data = await $fetch<{ items: MovieItem[]; totalPages: number }>(`${api}/api/movies`, {
        query: { page, limit: 50 },
      });
      for (const m of data.items || []) {
        if (m.slug) urls.push({ loc: `${site}/movies/${encodeURIComponent(m.slug)}`, priority: '0.7' });
      }
      totalPages = data.totalPages || 1;
      page++;
    } while (page <= totalPages && page <= 200); // กันวนมากเกินไป (สูงสุด ~10,000 เรื่อง)
  } catch {
    // ถ้า API ล่ม → ส่ง sitemap เฉพาะหน้า static (ไม่ให้ทั้ง sitemap พัง)
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${escape(u.loc)}</loc>\n    <priority>${u.priority || '0.5'}</priority>\n  </url>`).join('\n')}
</urlset>
`;

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return body;
});
