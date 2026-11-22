import prisma from '../config/prisma.js';
import { getCredits, getPerson } from './tmdb.service.js';

// รูปจาก TMDB ขนาดพอดีกับที่แสดง (ไม่ใช้ original ที่ไฟล์ใหญ่มาก)
const img = (path, size) => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null);

// cache ข้อมูลนักแสดงในหน่วยความจำ 12 ชม. — ไม่ต้องยิง TMDB ทุกครั้งที่มีคนเปิดหน้า
const CACHE_MS = 12 * 60 * 60 * 1000;
const cache = new Map();

// ข้อมูล cast เก่าเก็บแค่ชื่อ/บทบาท/รูป ไม่มี person id
// → เติม id จาก TMDB ครั้งแรกที่มีคนเปิดหน้าเรื่องนั้น แล้วบันทึกไว้
export async function fillCastIds(movie) {
  const cast = Array.isArray(movie.cast) ? movie.cast : [];
  if (!movie.tmdbId || !cast.length || cast.every((c) => c.id)) return movie.cast;
  try {
    const credits = await getCredits(movie.tmdbId, movie.mediaType);
    const byName = new Map(credits.map((c) => [c.name, c.id]));
    const filled = cast.map((c, i) => ({ ...c, id: c.id || byName.get(c.name) || credits[i]?.id || null }));
    await prisma.movie.update({ where: { id: movie.id }, data: { cast: filled } });
    return filled;
  } catch {
    return movie.cast; // TMDB ล่ม → แสดงแบบเดิม (กดชื่อไม่ได้) ไม่ให้หน้าเสีย
  }
}

export async function getPersonProfile(personId) {
  const hit = cache.get(personId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const p = await getPerson(personId);
  // ประวัติภาษาไทยมักว่าง → ใช้ภาษาอังกฤษแทน
  const biography = p.biography || (await getPerson(personId, 'en-US')).biography || '';

  // ผลงานการแสดง: หนัง + ซีรีส์ ไม่เอารายการทอล์กโชว์/ข่าวที่ไปเป็นแขกรับเชิญ
  const seen = new Set();
  const credits = (p.combined_credits?.cast || [])
    .filter((c) => !(c.media_type === 'tv' && [10763, 10767].some((g) => c.genre_ids?.includes(g))))
    .filter((c) => {
      const key = `${c.media_type}-${c.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c) => ({
      tmdbId: c.id,
      mediaType: c.media_type,
      title: c.title || c.name,
      character: c.character || null,
      date: c.release_date || c.first_air_date || null,
      posterUrl: img(c.poster_path, 'w342'),
      episodeCount: c.episode_count || null,
      popularity: c.popularity || 0,
    }))
    .sort((a, b) => (b.date || '0').localeCompare(a.date || '0'));

  // เรื่องที่มีในติดจอ → ลิงก์ไปหน้ารีวิวของเรา
  const ours = await prisma.movie.findMany({
    where: {
      isPublished: true,
      OR: [
        { mediaType: 'movie', tmdbId: { in: credits.filter((c) => c.mediaType === 'movie').map((c) => c.tmdbId) } },
        { mediaType: 'tv', tmdbId: { in: credits.filter((c) => c.mediaType === 'tv').map((c) => c.tmdbId) } },
      ],
    },
    select: { tmdbId: true, mediaType: true, slug: true, titleTh: true, title: true, averageRating: true, ratingCount: true },
  });
  const ourMap = new Map(ours.map((m) => [`${m.mediaType}-${m.tmdbId}`, m]));
  for (const c of credits) {
    const m = ourMap.get(`${c.mediaType}-${c.tmdbId}`);
    if (m) Object.assign(c, { slug: m.slug, title: m.titleTh || m.title, averageRating: m.ratingCount ? m.averageRating : null });
  }

  const data = {
    id: p.id,
    name: p.name,
    alsoKnownAs: p.also_known_as || [],
    biography,
    birthday: p.birthday,
    deathday: p.deathday,
    placeOfBirth: p.place_of_birth,
    department: p.known_for_department,
    profileUrl: img(p.profile_path, 'h632'),
    imdbId: p.imdb_id || null,
    credits,
  };
  cache.set(personId, { at: Date.now(), data });
  return data;
}
