<script setup lang="ts">
// หนังเข้าโรง / ซีรีส์ออนใหม่ — จัดกลุ่มตามเดือน (สร้างจากข้อมูล TMDB อัตโนมัติ)
const config = useRuntimeConfig();
const DAY = 24 * 60 * 60 * 1000;
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
const now = Date.now();

const fetchRange = (type: string, from: number, to: number, order = 'asc') =>
  useFetch<{ items: any[] }>('/api/movies', {
    baseURL: config.public.apiBase,
    query: { type, from: ymd(from), to: ymd(to), sort: 'releaseDate', order, limit: 50 },
  });

const [{ data: upcomingMovies }, { data: nowMovies }, { data: series }] = await Promise.all([
  fetchRange('movie', now, now + 120 * DAY),
  fetchRange('movie', now - 21 * DAY, now - DAY, 'desc'),
  fetchRange('tv', now - 30 * DAY, now + 120 * DAY),
]);

const thMonth = (d: string) => new Date(d).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
const thDay = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

function byMonth(items: any[] = []) {
  const groups: { month: string; items: any[] }[] = [];
  for (const m of items) {
    const month = thMonth(m.releaseDate);
    const g = groups.at(-1);
    if (g?.month === month) g.items.push(m);
    else groups.push({ month, items: [m] });
  }
  return groups;
}
const movieGroups = computed(() => byMonth(upcomingMovies.value?.items));
const seriesGroups = computed(() => byMonth(series.value?.items));

const tab = ref<'movie' | 'tv'>('movie');
const monthNow = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

useSeoMeta({
  title: `หนังเข้าโรง ซีรีส์ออนใหม่ ${monthNow}`,
  description: `ปฏิทินหนังเข้าโรงและซีรีส์ออนใหม่ ${monthNow} และเดือนถัดไป ดูวันฉาย ดูได้ที่ไหน อ่านรีวิวก่อนดู อัปเดตทุกวัน`,
  ogTitle: `หนังเข้าโรง ซีรีส์ออนใหม่ ${monthNow} - ติดจอ`,
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-2">🗓️ หนังเข้าโรง ซีรีส์ออนใหม่</h1>
    <p class="text-gray-600 mb-6">ปฏิทินวันฉาย {{ monthNow }} และเดือนถัดไป อัปเดตทุกวัน · วันฉายอาจต่างกันในแต่ละประเทศ</p>

    <div class="flex gap-2 mb-8">
      <button class="btn-outline text-sm" :class="tab === 'movie' && 'bg-brand-50 border-brand-300'" @click="tab = 'movie'">🎬 หนัง</button>
      <button class="btn-outline text-sm" :class="tab === 'tv' && 'bg-brand-50 border-brand-300'" @click="tab = 'tv'">📺 ซีรีส์</button>
    </div>

    <!-- หนัง: ทั้งสองส่วนอยู่ใน HTML เสมอ (ซ่อนด้วย v-show) ให้ Google อ่านได้ครบ -->
    <div v-show="tab === 'movie'">
      <section v-for="g in movieGroups" :key="g.month" class="mb-10">
        <h2 class="text-2xl font-bold mb-4">หนังเข้าฉาย{{ g.month }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div v-for="m in g.items" :key="m.id">
            <p class="text-sm font-semibold text-brand-600 mb-1">{{ thDay(m.releaseDate) }}</p>
            <MovieCard :movie="m" />
          </div>
        </div>
      </section>
      <p v-if="!movieGroups.length" class="text-gray-500 mb-10">ยังไม่มีข้อมูลหนังที่กำลังจะเข้าฉาย</p>

      <section v-if="nowMovies?.items?.length" class="mb-10">
        <h2 class="text-2xl font-bold mb-4">เพิ่งเข้าฉาย</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div v-for="m in nowMovies.items" :key="m.id">
            <p class="text-sm text-gray-500 mb-1">{{ thDay(m.releaseDate) }}</p>
            <MovieCard :movie="m" />
          </div>
        </div>
      </section>
    </div>

    <div v-show="tab === 'tv'">
      <section v-for="g in seriesGroups" :key="g.month" class="mb-10">
        <h2 class="text-2xl font-bold mb-4">ซีรีส์ออนใหม่{{ g.month }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div v-for="m in g.items" :key="m.id">
            <p class="text-sm font-semibold text-brand-600 mb-1">{{ thDay(m.releaseDate) }}</p>
            <MovieCard :movie="m" />
          </div>
        </div>
      </section>
      <p v-if="!seriesGroups.length" class="text-gray-500">ยังไม่มีข้อมูลซีรีส์ใหม่</p>
    </div>

    <p class="text-sm text-gray-500 mt-4">
      อยากรู้ข่าวล่าสุดของเรื่องที่รอ? อ่าน <NuxtLink to="/news" class="text-brand-600 hover:underline">ข่าวหนังและซีรีส์</NuxtLink>
    </p>
  </div>
</template>
