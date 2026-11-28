<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
const api = useApi();
const { data, refresh } = await useAsyncData('watchlist', () => api.get<{ items: any[] }>('/api/watchlist'));

const tab = ref<'want' | 'watched'>('want');
const items = computed(() => (data.value?.items || []).filter((w) => (tab.value === 'watched') === (w.status === 'WATCHED')));
const counts = computed(() => {
  const all = data.value?.items || [];
  const watched = all.filter((w) => w.status === 'WATCHED').length;
  return { want: all.length - watched, watched };
});

// กด "ดูแล้ว" → ย้ายไปแท็บดูแล้ว แล้วถามคะแนนทันที
const asking = ref<string | null>(null);
async function markWatched(w: any) {
  await api.patch(`/api/watchlist/${w.movie.id}`, { status: 'WATCHED' });
  w.status = 'WATCHED';
  track('mark_watched', mediaParams(w.movie));
  if (!w.myRating) asking.value = w.movie.id;
}
async function rate(w: any, n: number) {
  await api.post('/api/reviews', { movieId: w.movie.id, rating: n });
  w.myRating = n;
  asking.value = null;
  track('rate', { ...mediaParams(w.movie), rating: n, from: 'watchlist' });
}
async function unwatch(w: any) {
  await api.patch(`/api/watchlist/${w.movie.id}`, { status: 'WANT_TO_WATCH' });
  w.status = 'WANT_TO_WATCH';
}
async function remove(movieId: string) {
  await api.delete(`/api/watchlist/${movieId}`);
  await refresh();
}

useSeoMeta({ title: 'Watchlist', robots: 'noindex' });
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-2">⭐ Watchlist ของฉัน</h1>
    <p class="text-sm text-gray-500 mb-6">เรื่องที่รออยู่จะมีแจ้งเตือน 🔔 เมื่อเข้าฉาย หรือมาลงสตรีมมิงในไทย</p>

    <div class="flex gap-2 mb-6">
      <button class="btn-outline text-sm" :class="tab === 'want' && 'bg-brand-50 border-brand-300'" @click="tab = 'want'">อยากดู ({{ counts.want }})</button>
      <button class="btn-outline text-sm" :class="tab === 'watched' && 'bg-brand-50 border-brand-300'" @click="tab = 'watched'">ดูแล้ว ({{ counts.watched }})</button>
    </div>

    <div v-if="items.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div v-for="w in items" :key="w.id" class="relative flex flex-col">
        <MovieCard :movie="w.movie" />
        <button
          @click="remove(w.movie.id)"
          class="absolute top-2 right-2 bg-white/90 rounded-full w-7 h-7 text-sm hover:bg-red-500 hover:text-white"
          title="ลบออกจาก Watchlist"
        >✕</button>

        <div class="mt-2 text-sm">
          <button v-if="w.status !== 'WATCHED'" class="btn-outline text-sm w-full" @click="markWatched(w)">✓ ดูแล้ว</button>
          <template v-else>
            <div v-if="asking === w.movie.id || !w.myRating" class="bg-brand-50 rounded-lg p-2">
              <p class="text-xs font-medium mb-1">ให้กี่ดาว?</p>
              <StarRating :model-value="w.myRating || 0" size="sm" @update:model-value="(n: number) => rate(w, n)" />
            </div>
            <p v-else class="text-gray-600">คะแนนของคุณ <b class="text-brand-700">★ {{ w.myRating }}</b>/10</p>
            <button class="text-xs text-gray-400 hover:text-gray-600 mt-1" @click="unwatch(w)">ย้ายกลับไปอยากดู</button>
          </template>
        </div>
      </div>
    </div>
    <p v-else class="text-gray-500">{{ tab === 'watched' ? 'ยังไม่มีเรื่องที่ดูแล้ว' : 'ยังไม่มีหนังใน watchlist' }}</p>
  </div>
</template>
