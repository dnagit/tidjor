// /sitemap.xml — หน้าหลัก + หน้าหนัง (/movies) และซีรีส์ (/series) ทุกเรื่อง (ดึง slug ทั้งหมดจาก /api/movies/sitemap ครั้งเดียว)
interface SitemapItem { slug: string; mediaType: 'movie' | 'tv'; updatedAt: string }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const site = (config.public.siteUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const api = (config.public.apiBase || 'http://localhost:4000').replace(/\/+$/, '');

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // หน้าหลัก (static)
  const urls: { loc: string; priority?: string; lastmod?: string }[] = [
    { loc: `${site}/`, priority: '1.0' },
    { loc: `${site}/movies?type=movie`, priority: '0.8' },
    { loc: `${site}/series`, priority: '0.8' },
    { loc: `${site}/reviews`, priority: '0.6' },
  ];

  try {
    const { items } = await $fetch<{ items: SitemapItem[] }>(`${api}/api/movies/sitemap`);
    for (const m of items) {
      urls.push({
        loc: `${site}/${m.mediaType === 'tv' ? 'series' : 'movies'}/${encodeURIComponent(m.slug)}`,
        priority: '0.7',
        lastmod: m.updatedAt?.slice(0, 10),
      });
    }
  } catch {
    // ถ้า API ล่ม → ส่ง sitemap เฉพาะหน้า static (ไม่ให้ทั้ง sitemap พัง) และไม่ให้ cache นาน
    setHeader(event, 'Cache-Control', 'public, max-age=300');
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${escape(u.loc)}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <priority>${u.priority || '0.5'}</priority>\n  </url>`).join('\n')}
</urlset>
`;

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  if (!getResponseHeader(event, 'Cache-Control')) setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return body;
});
