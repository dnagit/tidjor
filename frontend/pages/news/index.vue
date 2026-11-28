<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

const page = ref(Number(route.query.page) || 1);
const { data } = await useFetch<{ items: any[]; total: number; totalPages: number }>('/api/news', {
  baseURL: config.public.apiBase,
  query: computed(() => ({ page: page.value, limit: 12 })),
});
watch(page, (p) => {
  router.replace({ query: { page: p > 1 ? p : undefined } });
  if (import.meta.client) window.scrollTo({ top: 0 });
});

useSeoMeta({
  title: page.value > 1 ? `ข่าวหนังและซีรีส์ หน้า ${page.value}` : 'ข่าวหนังและซีรีส์ที่กำลังจะเข้าฉาย',
  description: 'อัปเดตข่าวหนังและซีรีส์ที่กำลังจะเข้าฉายและออนในไทย วันฉาย ตัวอย่างล่าสุด นักแสดง และดูได้ที่ไหน',
  ogTitle: 'ข่าวหนังและซีรีส์ - ติดจอ',
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-2">📰 ข่าวหนังและซีรีส์</h1>
    <p class="text-gray-600 mb-6">ข่าวหนังและซีรีส์ที่กำลังจะเข้าฉาย/ออน อัปเดตทุกวัน</p>

    <div v-if="data?.items?.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <NewsCard v-for="n in data.items" :key="n.id" :news="n" />
    </div>
    <p v-else class="text-gray-500">ยังไม่มีข่าว</p>

    <div v-if="(data?.totalPages || 0) > 1" class="flex justify-center items-center gap-3 mt-8">
      <button class="btn-outline text-sm" :disabled="page <= 1" @click="page--">← ก่อนหน้า</button>
      <span class="text-sm text-gray-600">หน้า {{ page }} / {{ data?.totalPages }}</span>
      <button class="btn-outline text-sm" :disabled="page >= (data?.totalPages || 1)" @click="page++">ถัดไป →</button>
    </div>
  </div>
</template>
