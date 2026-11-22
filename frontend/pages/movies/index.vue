<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

const q = ref(route.query.q as string || '');
const genre = ref(route.query.genre as string || '');
const sort = ref(route.query.sort as string || 'popularity');
const lang = ref(route.query.lang as string || '');
// หน้านี้ใช้ทั้ง /movies และ /series (pages/series/index.vue) — ใต้ /series ล็อกเป็นซีรีส์
const isSeries = route.path.startsWith('/series');
const type = ref(isSeries ? 'tv' : (route.query.type as string || '')); // movie | tv | '' (ทั้งหมด)

// URL เดิม /movies?type=tv → 301 ไป /series (คงตัวกรองอื่นไว้)
if (!isSeries && route.query.type === 'tv') {
  await navigateTo({ path: '/series', query: { ...route.query, type: undefined } }, { redirectCode: 301 });
}
const page = ref(Number(route.query.page) || 1);

const query = computed(() => ({
  q: q.value || undefined,
  genre: genre.value || undefined,
  lang: lang.value || undefined,
  type: type.value || undefined,
  sort: sort.value,
  page: page.value,
  limit: 24,
}));

const { data, refresh } = await useFetch<{ items: any[]; total: number; totalPages: number }>('/api/movies', {
  baseURL: config.public.apiBase,
  query,
  watch: [query],
});

const { data: genres } = await useFetch<{ items: any[] }>('/api/genres', {
  baseURL: config.public.apiBase,
});

watch([q, genre, sort, page], () => {
  router.replace({ query: { ...query.value, type: isSeries ? undefined : query.value.type, limit: undefined } });
});

// เปลี่ยนประเภทจาก dropdown: ซีรีส์อยู่ที่ /series, หนัง/ทั้งหมดอยู่ที่ /movies
watch(type, (t) => {
  const filters = { ...query.value, type: undefined, page: undefined, limit: undefined };
  if (t === 'tv' && !isSeries) navigateTo({ path: '/series', query: filters });
  else if (t !== 'tv' && isSeries) navigateTo({ path: '/movies', query: { ...filters, type: t || undefined } });
  else router.replace({ query: { ...filters, type: t || undefined } });
});

// กดเมนู "หนัง" ตอนอยู่หน้านี้อยู่แล้ว → อัปเดตตัวกรองตาม URL
if (!isSeries) watch(() => route.query.type, (t) => { type.value = (t as string) || ''; page.value = 1; });

const heading = computed(() => (type.value === 'tv' ? 'ซีรีส์ทั้งหมด' : type.value === 'movie' ? 'หนังทั้งหมด' : 'หนังและซีรีส์ทั้งหมด'));

useSeoMeta({
  title: () => q.value ? `ค้นหา: ${q.value}` : heading.value,
  description: isSeries ? 'สำรวจซีรีส์จากทั่วโลก อ่านรีวิวและคะแนนจากคนไทย' : 'สำรวจหนังจากทั่วโลก คัดสรรโดยชุมชนคนไทย',
  ogTitle: () => q.value ? `ค้นหา: ${q.value} - ติดจอ` : `${heading.value} - ติดจอ`,
  ogDescription: 'สำรวจหนังจากทั่วโลก คัดสรรโดยชุมชนคนไทย',
  ogImage: '/logo.jpg',
  twitterCard: 'summary_large_image',
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">{{ heading }}</h1>

    <!-- Filters -->
    <div class="card p-4 mb-6 flex flex-wrap gap-3 items-center">
      <input v-model="q" type="search" placeholder="ค้นหา..." class="input max-w-xs" />
      <select v-model="type" class="input max-w-xs">
        <option value="">หนังและซีรีส์</option>
        <option value="movie">หนัง</option>
        <option value="tv">ซีรีส์</option>
      </select>
      <select v-model="genre" class="input max-w-xs">
        <option value="">ทุกหมวดหมู่</option>
        <option v-for="g in genres?.items" :key="g.id" :value="g.slug">{{ g.nameTh }}</option>
      </select>
      <select v-model="sort" class="input max-w-xs">
        <option value="popularity">ยอดนิยม</option>
        <option value="averageRating">คะแนนสูงสุด</option>
        <option value="releaseDate">ใหม่ล่าสุด</option>
        <option value="reviewCount">รีวิวเยอะที่สุด</option>
      </select>
    </div>

    <p class="text-sm text-gray-500 mb-4">พบ {{ data?.total || 0 }} เรื่อง</p>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <MovieCard v-for="m in data?.items" :key="m.id" :movie="m" />
    </div>

    <!-- Pagination -->
    <div v-if="data?.totalPages && data.totalPages > 1" class="flex justify-center gap-2 mt-8">
      <button
        class="btn-outline disabled:opacity-50"
        :disabled="page <= 1"
        @click="page--"
      >← ก่อนหน้า</button>
      <span class="self-center px-4">{{ page }} / {{ data.totalPages }}</span>
      <button
        class="btn-outline disabled:opacity-50"
        :disabled="page >= data.totalPages"
        @click="page++"
      >ถัดไป →</button>
    </div>
  </div>
</template>
