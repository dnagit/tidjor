<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();

const filter = ref<'all' | 'hidden'>('all');
const { data, refresh } = await useAsyncData('admin-reviews',
  () => api.get<any>('/api/admin/reviews', { hidden: filter.value === 'hidden' ? 1 : undefined }),
  { watch: [filter] }
);

async function toggleHide(r: any) {
  await api.patch(`/api/admin/reviews/${r.id}/hide`, { hidden: !r.isHidden });
  await refresh();
}

useSeoMeta({ title: 'จัดการรีวิว', robots: 'noindex' });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">✍️ จัดการรีวิว</h1>

    <div class="flex gap-2 mb-4">
      <button @click="filter = 'all'" class="btn-outline text-sm" :class="filter === 'all' && 'bg-brand-50 border-brand-300'">ทั้งหมด</button>
      <button @click="filter = 'hidden'" class="btn-outline text-sm" :class="filter === 'hidden' && 'bg-brand-50 border-brand-300'">ที่ซ่อนไว้</button>
    </div>

    <div class="space-y-3">
      <article v-for="r in data?.items" :key="r.id" class="card p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="text-sm">
            <span class="font-medium">{{ r.user.displayName }}</span>
            รีวิว <NuxtLink :to="`/movies/${r.movie.slug}`" class="text-brand-600">{{ r.movie.title }}</NuxtLink>
            · ⭐ {{ r.rating }}/10
            · <span class="text-gray-500">{{ new Date(r.createdAt).toLocaleDateString('th-TH') }}</span>
          </div>
          <button @click="toggleHide(r)" class="text-sm" :class="r.isHidden ? 'text-green-600' : 'text-red-600'">
            {{ r.isHidden ? 'แสดง' : 'ซ่อน' }}
          </button>
        </div>
        <p class="text-gray-700 text-sm whitespace-pre-line line-clamp-5">{{ r.content }}</p>
        <span v-if="r.isHidden" class="chip bg-red-50 text-red-700 mt-2">ซ่อนอยู่</span>
      </article>
    </div>
  </div>
</template>
