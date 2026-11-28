<script setup lang="ts">
const config = useRuntimeConfig();

const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
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
  { data: lists },
  { data: upcoming },
  { data: koreanSeries },
] = await Promise.all([
  // ยอดนิยมตอนนี้ — เฉพาะเรื่องใน 2 ปีล่าสุด (กันเรื่องเก่าที่ข้อมูลความนิยมค้างขึ้นมา)
  api({ sort: 'popularity', order: 'desc', from: ymd(Date.now() - 730 * 864e5), to: ymd(Date.now()), limit: 16 }),
  api({ sort: 'averageRating', order: 'desc', limit: 16 }),
  // หนังเข้าใหม่ — เรียงตามวันฉายล่าสุด เฉพาะที่ฉายแล้ว
  api({ type: 'movie', sort: 'releaseDate', order: 'desc', released: 1, limit: 16 }),
  // ซีรีส์ใหม่ — เรียงตามวันเริ่มออกอากาศล่าสุด เฉพาะที่ออกอากาศแล้ว
  api({ type: 'tv', sort: 'releaseDate', order: 'desc', released: 1, limit: 16 }),
  // หนังไทย — เรียงตามวันฉายล่าสุด
  api({ type: 'movie', lang: 'th', sort: 'releaseDate', order: 'desc', limit: 16 }),
  api({ limit: 6 }, '/api/reviews/feed'),
  api({ limit: 3 }, '/api/news'),
  api({}, '/api/lists'),
  // เข้าฉายเร็ว ๆ นี้ — 90 วันข้างหน้า ใกล้สุดก่อน
  api({ type: 'movie', from: ymd(Date.now()), to: ymd(Date.now() + 90 * 864e5), sort: 'releaseDate', order: 'asc', limit: 16 }),
  api({ type: 'tv', lang: 'ko', sort: 'popularity', order: 'desc', limit: 16 }),
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

const QUICK = [
  { to: '/upcoming', label: 'เข้าฉายเร็ว ๆ นี้', icon: 'calendar' },
  { to: '/movies?type=movie&sort=releaseDate', label: 'หนังใหม่', icon: 'film' },
  { to: '/series', label: 'ซีรีส์', icon: 'tv' },
  { to: '/series?lang=ko', label: 'ซีรีส์เกาหลี', icon: 'tv' },
  { to: '/series?lang=th', label: 'ซีรีส์ไทย', icon: 'tv' },
  { to: '/movies?lang=ja&genre=animation', label: 'อนิเมะ', icon: 'film' },
  { to: '/lists', label: 'ลิสต์แนะนำ', icon: 'layers' },
  { to: '/news', label: 'ข่าว', icon: 'news' },
];

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

    <!-- ทางลัด (ปัดได้บนมือถือ) -->
    <nav class="max-w-7xl mx-auto px-4 pt-5" aria-label="ทางลัด">
      <div class="-mx-4 px-4 flex gap-2 overflow-x-auto scrollbar-none">
        <NuxtLink v-for="l in QUICK" :key="l.to" :to="l.to"
          class="shrink-0 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 transition">
          <Icon :name="l.icon" class="w-4 h-4 text-brand-500" />{{ l.label }}
        </NuxtLink>
      </div>
    </nav>

    <MediaRow title="เข้าฉายเร็ว ๆ นี้" icon="calendar" to="/upcoming" :items="upcoming?.items || []" show-date />
    <MediaRow title="หนังเข้าใหม่" icon="film" to="/movies?type=movie&sort=releaseDate" :items="newReleases?.items || []" />
    <MediaRow title="ซีรีส์ใหม่" icon="tv" to="/series?sort=releaseDate" :items="newSeries?.items || []" />
    <MediaRow title="ยอดนิยมตอนนี้" icon="star" to="/movies?sort=popularity" :items="popular?.items || []" />

    <!-- ข่าวล่าสุด -->
    <section v-if="news?.items?.length" class="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <h2 class="text-xl md:text-2xl font-bold flex items-center gap-2"><Icon name="news" class="w-6 h-6 text-brand-500" />ข่าวหนังและซีรีส์</h2>
        <NuxtLink to="/news" class="text-sm text-brand-600 font-medium hover:underline">ดูทั้งหมด</NuxtLink>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <NewsCard v-for="n in news.items" :key="n.id" :news="n" />
      </div>
    </section>

    <MediaRow title="ซีรีส์เกาหลี" icon="tv" to="/series?lang=ko" :items="koreanSeries?.items || []" />
    <MediaRow title="หนังไทย" icon="film" to="/movies?type=movie&lang=th" :items="thaiMovies?.items || []" />

    <!-- ลิสต์แนะนำ (การ์ดมีภาพ ปัดได้) -->
    <section v-if="lists?.items?.length" class="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <h2 class="text-xl md:text-2xl font-bold flex items-center gap-2"><Icon name="layers" class="w-6 h-6 text-brand-500" />ลิสต์แนะนำ</h2>
        <NuxtLink to="/lists" class="text-sm text-brand-600 font-medium hover:underline">ดูทั้งหมด</NuxtLink>
      </div>
      <div class="-mx-4 px-4 flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 scrollbar-none">
        <NuxtLink v-for="l in lists.items.slice(0, 10)" :key="l.id" :to="`/lists/${l.slug}`"
          class="relative w-[72%] sm:w-[45%] lg:w-[31%] shrink-0 snap-start aspect-[16/9] rounded-xl2 overflow-hidden bg-ink group">
          <img v-if="l.coverUrl" :src="tmdbImg(l.coverUrl, 'w780')" width="780" height="439" loading="lazy" alt=""
            class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 group-hover:scale-105 transition duration-300" />
          <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <p class="absolute bottom-0 inset-x-0 p-3 md:p-4 text-white font-bold leading-snug line-clamp-2">{{ l.title }}</p>
        </NuxtLink>
      </div>
    </section>

    <MediaRow title="คะแนนสูงสุด" icon="star" to="/movies?sort=averageRating" :items="topRated?.items || []" />

    <!-- รีวิวล่าสุด -->
    <section class="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <h2 class="text-xl md:text-2xl font-bold flex items-center gap-2"><Icon name="pen" class="w-6 h-6 text-brand-500" />รีวิวล่าสุด</h2>
        <NuxtLink to="/reviews" class="text-sm text-brand-600 font-medium hover:underline">ดูทั้งหมด</NuxtLink>
      </div>
      <div class="grid md:grid-cols-2 gap-3 md:gap-4">
        <div v-for="r in feed?.items" :key="r.id" class="card p-3 md:p-4 flex gap-3 md:gap-4">
          <NuxtLink :to="mediaPath(r.movie)" class="shrink-0">
            <img v-if="r.movie.posterUrl" :src="tmdbImg(r.movie.posterUrl, 'w185')" width="64" height="96" loading="lazy" alt="" class="w-16 h-24 object-cover rounded-lg" />
          </NuxtLink>
          <div class="flex-1 min-w-0">
            <NuxtLink :to="mediaPath(r.movie)" class="font-semibold hover:text-brand-600 block truncate">
              {{ r.movie.title }}
            </NuxtLink>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm mt-1">
              <span class="inline-flex items-center gap-0.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700 whitespace-nowrap">★ {{ r.rating }}<span class="font-normal text-gray-500">/10</span></span>
              <span class="text-gray-500 truncate">โดย {{ r.user.displayName }}</span>
              <AiBadge v-if="r.user.isBot" />
            </div>
            <p class="text-sm text-gray-700 mt-2 line-clamp-3">{{ r.content }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
