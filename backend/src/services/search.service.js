import prisma from '../config/prisma.js';

// ============================================================
// ค้นหาหนัง/ซีรีส์แบบทนพิมพ์ผิด (index อยู่ในหน่วยความจำ ~10k เรื่อง ค้นได้ในไม่กี่ ms)
//   - ไม่สนตัวพิมพ์เล็ก/ใหญ่ เว้นวรรค เครื่องหมาย วรรณยุกต์ไทย (ซีรีส์ = ซีรี่ส์)
//   - เจอแบบบางส่วน (substring) / ขึ้นต้นด้วย / คล้ายกัน (bigram) → พิมพ์ผิด 1-2 ตัวยังเจอ
//   - ค้นทั้งชื่อหลัก ชื่อไทย ชื่ออังกฤษ ชื่อต้นฉบับ และ searchAliases (คำอ่านไทยของชื่ออังกฤษ)
// ============================================================

const REBUILD_MS = 10 * 60 * 1000;
const THAI_MARKS = /[็-๎]/g; // ็ ่ ้ ๊ ๋ ์ ํ ๎
const LATIN_MARKS = /[̀-ͯ]/g;

export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD').replace(LATIN_MARKS, '').normalize('NFC')
    .replace(THAI_MARKS, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

const bigrams = (s) => {
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
};

let index = [];
let builtAt = 0;
let building = null;

async function build() {
  const rows = await prisma.movie.findMany({
    where: { isPublished: true },
    select: {
      id: true, title: true, titleTh: true, titleEn: true, originalTitle: true, searchAliases: true,
      popularity: true, ratingCount: true, watchlistCount: true,
    },
  });
  index = rows.map((r) => {
    const names = [...new Set([r.title, r.titleTh, r.titleEn, r.originalTitle, ...(r.searchAliases || [])]
      .map(normalize).filter((n) => n.length > 0))];
    return {
      id: r.id,
      names: names.map((n) => ({ n, bg: bigrams(n) })),
      // คะแนนความนิยมเล็กน้อย ใช้ตัดสินตอนความใกล้เคียงพอ ๆ กัน
      boost: Math.log10(1 + (r.popularity || 0)) + Math.log10(1 + (r.ratingCount || 0) + (r.watchlistCount || 0)),
    };
  });
  builtAt = Date.now();
  return index;
}

async function getIndex() {
  if (!index.length || Date.now() - builtAt > REBUILD_MS) {
    building ||= build().finally(() => { building = null; });
    if (!index.length) await building; // ครั้งแรกต้องรอ ครั้งต่อไปใช้ของเดิมระหว่างสร้างใหม่
  }
  return index;
}

// ให้ index สร้างใหม่ในการค้นครั้งถัดไป (เช่น หลัง sync / เพิ่มชื่อเรียก)
export function invalidateSearchIndex() { builtAt = 0; }

function scoreName(q, qBigrams, { n, bg }) {
  if (n === q) return 100;
  if (n.startsWith(q)) return 92 - Math.min(10, (n.length - q.length) / 4);
  if (n.includes(q)) return 82 - Math.min(10, (n.length - q.length) / 6);
  if (q.length < 3 || !bg.length) return 0;
  // Dice coefficient ของ bigram — ทนพิมพ์ผิด/สลับตัว/ตกหล่น
  const pool = [...bg];
  let hit = 0;
  for (const b of qBigrams) {
    const i = pool.indexOf(b);
    if (i !== -1) { hit++; pool.splice(i, 1); }
  }
  const dice = (2 * hit) / (qBigrams.length + bg.length);
  // ชื่อยาวกว่าคำค้นมาก → เทียบกับส่วนต้นของชื่อด้วย (พิมพ์แค่คำแรกแบบผิด ๆ)
  let partial = 0;
  if (n.length > q.length + 2) {
    const head = bigrams(n.slice(0, q.length + 1));
    const p2 = [...head];
    let h2 = 0;
    for (const b of qBigrams) { const i = p2.indexOf(b); if (i !== -1) { h2++; p2.splice(i, 1); } }
    partial = (2 * h2) / (qBigrams.length + head.length);
  }
  const sim = Math.max(dice, partial * 0.95);
  return sim >= 0.62 ? 40 + sim * 40 : 0; // ต่ำกว่านี้มักเป็นคำคนละคำที่มีตัวอักษรคล้าย (เช่น parasite ≠ jurassic park)
}

// คืน [{ id, score }] เรียงจากใกล้เคียงที่สุด
export async function searchMovies(query, { limit = 500 } = {}) {
  const q = normalize(query);
  if (!q) return [];
  const qBigrams = bigrams(q);
  const idx = await getIndex();
  const results = [];
  for (const item of idx) {
    let best = 0;
    for (const name of item.names) {
      const s = scoreName(q, qBigrams, name);
      if (s > best) best = s;
      if (best === 100) break;
    }
    if (best > 0) results.push({ id: item.id, score: best + item.boost });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
