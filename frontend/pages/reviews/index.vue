<script setup lang="ts">
const config = useRuntimeConfig();
const { data } = await useFetch<{ items: any[] }>('/api/reviews/feed', {
  baseURL: config.public.apiBase,
  query: { limit: 30 },
});
useSeoMeta({
  title: 'รีวิวล่าสุด',
  description: 'รีวิวหนังล่าสุดจากชาวติดจอ',
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">📝 รีวิวล่าสุด</h1>
    <div class="space-y-4">
      <article v-for="r in data?.items" :key="r.id" class="card p-4">
        <div class="flex gap-4">
          <NuxtLink :to="`/movies/${r.movie.slug}`" class="shrink-0">
            <img v-if="r.movie.posterUrl" :src="r.movie.posterUrl" class="w-20 h-28 object-cover rounded" />
          </NuxtLink>
          <div class="flex-1">
            <NuxtLink :to="`/movies/${r.movie.slug}`" class="font-bold hover:text-brand-600">
              {{ r.movie.title }}
            </NuxtLink>
            <div class="flex items-center gap-2 text-sm mt-1">
              <StarRating :model-value="r.rating" readonly size="sm" />
              <span class="text-gray-500">โดย {{ r.user.displayName }} · {{ new Date(r.createdAt).toLocaleDateString('th-TH') }}</span>
            </div>
            <p class="text-gray-700 mt-2 whitespace-pre-line line-clamp-4">{{ r.content }}</p>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
