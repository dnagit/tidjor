<script setup lang="ts">
const config = useRuntimeConfig();

const { data: popular } = await useFetch<{ items: any[] }>('/api/movies', {
  baseURL: config.public.apiBase,
  query: { sort: 'popularity', order: 'desc', limit: 12 },
});

const { data: topRated } = await useFetch<{ items: any[] }>('/api/movies', {
  baseURL: config.public.apiBase,
  query: { sort: 'averageRating', order: 'desc', limit: 12 },
});

// หนังเข้าใหม่ — เรียงตามวันฉายล่าสุด เฉพาะที่ฉายแล้ว
const { data: newReleases } = await useFetch<{ items: any[] }>('/api/movies', {
  baseURL: config.public.apiBase,
  query: { sort: 'releaseDate', order: 'desc', released: 1, limit: 12 },
});

// หนังไทย — เรียงตามวันฉายล่าสุด
const { data: thaiMovies } = await useFetch<{ items: any[] }>('/api/movies', {
  baseURL: config.public.apiBase,
  query: { lang: 'th', sort: 'releaseDate', order: 'desc', limit: 12 },
});

const { data: feed } = await useFetch<{ items: any[] }>('/api/reviews/feed', {
  baseURL: config.public.apiBase,
  query: { limit: 6 },
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
      <img src="/banner.png" alt="ติดจอ" class="w-full h-auto" />
    </section>

    <!-- New Releases (แสดงเฉพาะเมื่อมีหนังที่ฉายแล้ว) -->
    <section v-if="newReleases?.items?.length" class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">🆕 หนังเข้าใหม่</h2>
        <NuxtLink to="/movies?sort=releaseDate" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MovieCard v-for="m in newReleases.items" :key="m.id" :movie="m" />
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
        <NuxtLink to="/movies?lang=th" class="text-brand-600 text-sm hover:underline">ดูทั้งหมด →</NuxtLink>
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
          <NuxtLink :to="`/movies/${r.movie.slug}`" class="shrink-0">
            <img v-if="r.movie.posterUrl" :src="r.movie.posterUrl" class="w-20 h-28 object-cover rounded" />
          </NuxtLink>
          <div class="flex-1 min-w-0">
            <NuxtLink :to="`/movies/${r.movie.slug}`" class="font-semibold hover:text-brand-600 block truncate">
              {{ r.movie.title }}
            </NuxtLink>
            <div class="flex items-center gap-2 text-sm mt-1">
              <StarRating :model-value="r.rating" readonly size="sm" />
              <span class="text-gray-500">โดย {{ r.user.displayName }}</span>
            </div>
            <p class="text-sm text-gray-700 mt-2 line-clamp-3">{{ r.content }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
