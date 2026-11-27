// ส่ง event เข้า Google Analytics 4 — ถ้าไม่ได้ตั้ง GA (หรืออยู่ฝั่ง server) จะไม่ทำอะไร
export function track(name: string, params: Record<string, unknown> = {}) {
  if (import.meta.client && typeof window.gtag === 'function') window.gtag('event', name, params);
}

// ข้อมูลหนัง/ซีรีส์ที่แนบไปกับ event (ดูใน GA ได้ว่าเรื่องไหนคนกดเยอะ)
export function mediaParams(m: { slug?: string; title?: string; mediaType?: string }) {
  return { item_id: m.slug, item_name: m.title, media_type: m.mediaType === 'tv' ? 'series' : 'movie' };
}
