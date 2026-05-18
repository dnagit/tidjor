<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
const api = useApi();
const { data, refresh } = await useAsyncData('watchlist', () => api.get<{ items: any[] }>('/api/watchlist'));

async function remove(movieId: string) {
  await api.delete(`/api/watchlist/${movieId}`);
  await refresh();
}

useSeoMeta({ title: 'Watchlist', robots: 'noindex' });
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">⭐ Watchlist ของฉัน</h1>
    <div v-if="data?.items.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div v-for="w in data.items" :key="w.id" class="relative">
        <MovieCard :movie="w.movie" />
        <button
          @click="remove(w.movie.id)"
          class="absolute top-2 right-2 bg-white/90 rounded-full w-7 h-7 text-sm hover:bg-red-500 hover:text-white"
          title="ลบ"
        >✕</button>
      </div>
    </div>
    <p v-else class="text-gray-500">ยังไม่มีหนังใน watchlist</p>
  </div>
</template>
