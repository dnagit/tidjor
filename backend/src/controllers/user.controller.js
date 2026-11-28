import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { recomputeMovieStats } from '../services/movieStats.service.js';

export async function publicProfile(req, res, next) {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bio: true, isBot: true,
        createdAt: true,
        _count: { select: { reviews: true, comments: true, watchlist: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'not_found' });

    const reviews = await prisma.review.findMany({
      where: { userId: user.id, isPublished: true, isHidden: false, content: { not: '' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        movie: { select: { id: true, slug: true, title: true, titleTh: true, posterUrl: true, mediaType: true } },
      },
    });

    res.json({ user, reviews });
  } catch (err) { next(err); }
}

export async function updateMe(req, res, next) {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, bio, avatarUrl },
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}

// ลบบัญชีตัวเอง (PDPA) — ยืนยันด้วยชื่อผู้ใช้ และรหัสผ่านถ้าบัญชีมีรหัสผ่าน
// ลบ: บัญชี, รีวิว, คะแนน, คอมเมนต์, ถูกใจ, Watchlist, แจ้งเตือน, การเชื่อม Google/Facebook/LINE (cascade)
// แล้วคำนวณสถิติที่เกี่ยวข้องใหม่ (คะแนนหนัง, จำนวนถูกใจ/คอมเมนต์ของรีวิวคนอื่น)
export async function deleteMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'not_found' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'admin_cannot_delete' });

    const { username, password } = req.body || {};
    if ((username || '').trim() !== user.username) return res.status(400).json({ error: 'username_mismatch' });
    if (user.passwordHash) {
      const ok = password && await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(400).json({ error: 'invalid_password' });
    }

    const [reviews, likes, comments, watchlist] = await Promise.all([
      prisma.review.findMany({ where: { userId: user.id }, select: { movieId: true } }),
      prisma.reviewLike.findMany({ where: { userId: user.id }, select: { reviewId: true } }),
      prisma.comment.findMany({ where: { userId: user.id }, select: { reviewId: true } }),
      prisma.watchlist.findMany({ where: { userId: user.id }, select: { movieId: true } }),
    ]);

    await prisma.user.delete({ where: { id: user.id } });

    // รีวิวของคนอื่นที่ผู้ใช้นี้เคยกดถูกใจ/คอมเมนต์ (รีวิวของตัวเองถูกลบไปแล้ว)
    const touched = [...new Set([...likes, ...comments].map((x) => x.reviewId))];
    const existing = await prisma.review.findMany({ where: { id: { in: touched } }, select: { id: true } });
    for (const { id } of existing) {
      const [likeCount, commentCount] = await Promise.all([
        prisma.reviewLike.count({ where: { reviewId: id } }),
        prisma.comment.count({ where: { reviewId: id } }),
      ]);
      await prisma.review.update({ where: { id }, data: { likeCount, commentCount } });
    }
    for (const movieId of new Set(reviews.map((r) => r.movieId))) await recomputeMovieStats(movieId);
    for (const { movieId } of watchlist) {
      const watchlistCount = await prisma.watchlist.count({ where: { movieId } });
      await prisma.movie.update({ where: { id: movieId }, data: { watchlistCount } }).catch(() => {});
    }

    res.clearCookie('tj_refresh', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    console.log(`[account] ลบบัญชี ${user.username} (${user.id}) ตามคำขอของผู้ใช้`);
    res.json({ ok: true });
  } catch (err) { next(err); }
}
