import prisma from '../config/prisma.js';

// คำนวณ averageRating + จำนวนรีวิวของหนัง/ซีรีส์ใหม่
// นับรีวิวจากบอท (AI) รวมด้วย — ตัวรีวิวเองยังขึ้นป้าย "รีวิวโดย AI"
export async function recomputeMovieStats(movieId) {
  const agg = await prisma.review.aggregate({
    where: { movieId, isPublished: true, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.movie.update({
    where: { id: movieId },
    data: {
      averageRating: agg._avg.rating || 0,
      ratingCount: agg._count._all,
      reviewCount: agg._count._all,
    },
  });
}
