// รูปจาก TMDB ใน DB เก็บเป็นขนาด original (โปสเตอร์ ~300 KB, ภาพพื้นหลัง ~1.8 MB)
// → เปลี่ยนเป็นขนาดที่พอดีกับที่แสดงจริง ช่วยให้หน้าโหลดเร็ว (LCP) โดยเฉพาะบนมือถือ
// ขนาดที่ TMDB มี: w92 w154 w185 w342 w500 w780 w1280 original (h632 สำหรับรูปคน)
const TMDB_SIZE = /(image\.tmdb\.org\/t\/p\/)[a-z0-9]+\//;

export function tmdbImg(url: string | null | undefined, size: string) {
  if (!url) return undefined;
  return TMDB_SIZE.test(url) ? url.replace(TMDB_SIZE, `$1${size}/`) : url;
}

// srcset ให้ browser เลือกขนาดตามความกว้างจอ/ความละเอียด เช่น tmdbSrcset(url, [185, 342, 500])
export function tmdbSrcset(url: string | null | undefined, widths: number[]) {
  if (!url || !TMDB_SIZE.test(url)) return undefined;
  return widths.map((w) => `${tmdbImg(url, `w${w}`)} ${w}w`).join(', ');
}
