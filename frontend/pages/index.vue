<script setup lang="ts">
const config = useRuntimeConfig();

const api = (query: Record<string, any>, path = '/api/movies') =>
  useFetch<{ items: any[] }>(path, { baseURL: config.public.apiBase, query });

// ดึงทุกแถวพร้อมกัน (เดิม await ทีละตัว 6 รอบ → หน้าแรกตอบช้า)
const [
  { data: popular },
  { data: topRated },
  { data: newReleases },
  { data: newSeries },
  { data: thaiMovies },
  { data: feed },
  { data: news },
] = await Promise.all([
  api({ sort: 'popularity', order: 'desc', limit: 12 }),
  api({ sort: 'averageRating', order: 'desc', limit: 12 }),
  // หนังเข้าใหม่ — เรียงตามวันฉายล่าสุด เฉพาะที่ฉายแล้ว
  api({ type: 'movie', sort: 'releaseDate', order: 'desc', released: 1, limit: 12 }),
  // ซีรีส์ใหม่ — เรียงตามวันเริ่มออกอากาศล่าสุด เฉพาะที่ออกอากาศแล้ว
  api({ type: 'tv', sort: 'releaseDate', order: 'desc', released: 1, limit: 12 }),
  // หนังไทย — เรียงตามวันฉายล่าสุด
  api({ type: 'movie', lang: 'th', sort: 'releaseDate', order: 'desc', limit: 12 }),
  api({ limit: 6 }, '/api/reviews/feed'),
  api({ limit: 3 }, '/api/news'),
]);

// โหลดรูป banner (LCP) ทันทีตั้งแต่อ่าน <head> ไม่ต้องรอ parse ถึง <img>
useHead({
  link: [{
    rel: 'preload',
    as: 'image',
    href: '/banner.webp',
    imagesrcset: '/banner-960.webp 960w, /banner-1280.webp 1280w, /banner.webp 1942w',
    imagesizes: '100vw',
    fetchpriority: 'high',
  }],
});

useSeoMeta({
  title: 'ติดจอ - รีวิวหนังโดยคนไทย เพื่อคนไทย',
  description: 'แพลตฟอร์มรีวิวหนังภาษาไทย ค้นพบหนังใหม่ ดูคะแนน อ่านรีวิวจากคนไทย และแบ่งปันความคิดเห็นของคุณ',
  ogTitle: 'ติดจอ - รีวิวหนังโดยคนไทย',
  ogDescription: 'ค้นพบหนังใหม่ อ่านรีวิวจากคนไทย ให้คะแนน และแชร์ความคิดเห็น',
  ogImage: '/logo.jpg',
  twitterCard: 'summary_large_image',
});

// useSchemaOrg([
//   defineWebSite({ name: 'ติดจอ', inLanguage: 'th-TH' }),
// ]);
</script>

<template>
  <div>
    <!-- Hero -->
    <section>
      <!-- รูปแรกที่เห็น (LCP): WebP + ขนาดตามจอ + โหลดก่อน + จองพื้นที่กันหน้ากระโดด -->
      <img
        src="/banner.webp"
        srcset="/banner-960.webp 960w, /banner-1280.webp 1280w, /banner.webp 1942w"
        sizes="100vw"
        width="1942"
        height="809"
        alt="ติดจอ — รีวิวหนังและซีรีส์โดยคนไทย"
        fetchpriority="high"
        class="w-full h-auto"
      />
    </section>

    <!-- New Releases (แสดงเฉพาะเมื่อมีหนังที่ฉายแล้ว) -->
    <section v-if="newReleases?.items?.length" class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">🆕 หนังเข้าใหม่</h2>
        <NuxtLink to="/movies?type=movie&sort=releaseDate" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MovieCard v-for="m in newReleases.items" :key="m.id" :movie="m" />
      </div>
    </section>

    <!-- ซีรีส์ใหม่ (แสดงเฉพาะเมื่อมีซีรีส์ที่ออกอากาศแล้ว) -->
    <section v-if="newSeries?.items?.length" class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">📺 ซีรีส์ใหม่</h2>
        <NuxtLink to="/series?sort=releaseDate" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MovieCard v-for="m in newSeries.items" :key="m.id" :movie="m" />
      </div>
    </section>

    <!-- ข่าวล่าสุด -->
    <section v-if="news?.items?.length" class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">📰 ข่าวหนังและซีรีส์</h2>
        <NuxtLink to="/news" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NewsCard v-for="n in news.items" :key="n.id" :news="n" />
      </div>
    </section>

    <!-- Popular -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">🔥 ยอดนิยมตอนนี้</h2>
        <NuxtLink to="/movies?sort=popularity" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MovieCard v-for="m in popular?.items" :key="m.id" :movie="m" />
      </div>
    </section>

    <!-- หนังไทย (แสดงเฉพาะเมื่อมีหนังไทย) -->
    <section v-if="thaiMovies?.items?.length" class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">🇹🇭 หนังไทย</h2>
        <NuxtLink to="/movies?type=movie&lang=th" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MovieCard v-for="m in thaiMovies.items" :key="m.id" :movie="m" />
      </div>
    </section>

    <!-- Top Rated -->
    <section class="max-w-7xl mx-auto px-4 py-12 bg-white rounded-xl2 my-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">⭐ คะแนนสูงสุด</h2>
        <NuxtLink to="/movies?sort=averageRating" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MovieCard v-for="m in topRated?.items" :key="m.id" :movie="m" />
      </div>
    </section>

    <!-- Recent reviews -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <h2 class="text-2xl font-bold mb-6">📝 รีวิวล่าสุด</h2>
      <div class="grid md:grid-cols-2 gap-4">
        <div v-for="r in feed?.items" :key="r.id" class="card p-4 flex gap-4">
          <NuxtLink :to="mediaPath(r.movie)" class="shrink-0">
            <img v-if="r.movie.posterUrl" :src="tmdbImg(r.movie.posterUrl, 'w185')" width="80" height="112" loading="lazy" alt="" class="w-20 h-28 object-cover rounded" />
          </NuxtLink>
          <div class="flex-1 min-w-0">
            <NuxtLink :to="mediaPath(r.movie)" class="font-semibold hover:text-brand-600 block truncate">
              {{ r.movie.title }}
            </NuxtLink>
            <div class="flex items-center gap-2 text-sm mt-1">
              <StarRating :model-value="r.rating" readonly size="sm" />
              <span class="text-gray-500">โดย {{ r.user.displayName }}</span>
              <AiBadge v-if="r.user.isBot" />
            </div>
            <p class="text-sm text-gray-700 mt-2 line-clamp-3">{{ r.content }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
