// URL หน้ารายละเอียด: หนัง → /movies/{slug}, ซีรีส์ → /series/{slug}
export function mediaPath(m: { slug: string; mediaType?: string | null }) {
  return `${m.mediaType === 'tv' ? '/series' : '/movies'}/${m.slug}`;
}
