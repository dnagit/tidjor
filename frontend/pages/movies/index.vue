<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

const q = ref(route.query.q as string || '');
const genre = ref(route.query.genre as string || '');
const sort = ref(route.query.sort as string || 'popularity');
const page = ref(Number(route.query.page) || 1);

const query = computed(() => ({
  q: q.value || undefined,
  genre: genre.value || undefined,
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
  router.replace({ query: { ...query.value } });
});

useSeoMeta({
  title: () => q.value ? `ค้นหา: ${q.value}` : 'หนังทั้งหมด',
  description: 'สำรวจหนังจากทั่วโลก คัดสรรโดยชุมชนคนไทย',
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">หนังทั้งหมด</h1>

    <!-- Filters -->
    <div class="card p-4 mb-6 flex flex-wrap gap-3 items-center">
      <input v-model="q" type="search" placeholder="ค้นหา..." class="input max-w-xs" />
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
