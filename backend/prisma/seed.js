import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const GENRES = [
  { name: 'Action', nameTh: 'แอ็คชั่น', slug: 'action', tmdbId: 28 },
  { name: 'Adventure', nameTh: 'ผจญภัย', slug: 'adventure', tmdbId: 12 },
  { name: 'Animation', nameTh: 'แอนิเมชั่น', slug: 'animation', tmdbId: 16 },
  { name: 'Comedy', nameTh: 'ตลก', slug: 'comedy', tmdbId: 35 },
  { name: 'Crime', nameTh: 'อาชญากรรม', slug: 'crime', tmdbId: 80 },
  { name: 'Documentary', nameTh: 'สารคดี', slug: 'documentary', tmdbId: 99 },
  { name: 'Drama', nameTh: 'ดราม่า', slug: 'drama', tmdbId: 18 },
  { name: 'Family', nameTh: 'ครอบครัว', slug: 'family', tmdbId: 10751 },
  { name: 'Fantasy', nameTh: 'แฟนตาซี', slug: 'fantasy', tmdbId: 14 },
  { name: 'Horror', nameTh: 'สยองขวัญ', slug: 'horror', tmdbId: 27 },
  { name: 'Mystery', nameTh: 'ลึกลับ', slug: 'mystery', tmdbId: 9648 },
  { name: 'Romance', nameTh: 'โรแมนติก', slug: 'romance', tmdbId: 10749 },
  { name: 'Science Fiction', nameTh: 'ไซไฟ', slug: 'sci-fi', tmdbId: 878 },
  { name: 'Thriller', nameTh: 'ระทึกขวัญ', slug: 'thriller', tmdbId: 53 },
  { name: 'War', nameTh: 'สงคราม', slug: 'war', tmdbId: 10752 },
];

async function main() {
  console.log('🌱 Seeding genres...');
  for (const g of GENRES) {
    await prisma.genre.upsert({
      where: { slug: g.slug },
      update: g,
      create: g,
    });
  }

  console.log('🌱 Seeding admin user...');
  const passwordHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.upsert({
    where: { email: 'admin@tidjor.com' },
    update: {},
    create: {
      email: 'admin@tidjor.com',
      username: 'admin',
      displayName: 'Admin',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
      authProviders: { create: { provider: 'LOCAL', providerId: 'admin@tidjor.com' } },
    },
  });

  console.log('🌱 Seeding sample Thai movie...');
  const drama = await prisma.genre.findUnique({ where: { slug: 'drama' } });
  await prisma.movie.upsert({
    where: { slug: 'how-to-make-millions-before-grandma-dies-2024' },
    update: {},
    create: {
      slug: 'how-to-make-millions-before-grandma-dies-2024',
      source: 'MANUAL',
      title: 'หลานม่า',
      titleTh: 'หลานม่า',
      titleEn: 'How to Make Millions Before Grandma Dies',
      overview: 'หนุ่มนักเกมหวังร่ำรวยจากการดูแลคุณยายที่ป่วยเป็นมะเร็งระยะสุดท้าย เพื่อหวังได้รับมรดก',
      releaseDate: new Date('2024-04-04'),
      runtime: 125,
      originalLanguage: 'th',
      countries: ['TH'],
      director: 'พัฒน์ บุญนิธิพัฒน์',
      genres: { create: [{ genreId: drama.id }] },
      isPublished: true,
      averageRating: 9.2,
    },
  });

  console.log('✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
