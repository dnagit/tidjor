<script setup lang="ts">
defineProps<{ news: any; compact?: boolean }>();
</script>

<template>
  <NuxtLink :to="`/news/${news.slug}`" class="card overflow-hidden flex flex-col hover:shadow-md transition group">
    <div class="aspect-video bg-gray-100 overflow-hidden">
      <img
        v-if="news.coverUrl"
        :src="tmdbImg(news.coverUrl, 'w780')"
        :srcset="tmdbSrcset(news.coverUrl, [300, 780])"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        width="780" height="439" loading="lazy" alt=""
        class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
      />
    </div>
    <div class="p-4 flex-1 flex flex-col">
      <p class="text-xs text-gray-500 mb-1">{{ new Date(news.publishedAt).toLocaleDateString('th-TH', { dateStyle: 'long' }) }}</p>
      <h3 class="font-bold leading-snug group-hover:text-brand-600" :class="compact ? 'line-clamp-2' : 'line-clamp-3'">{{ news.title }}</h3>
      <p v-if="!compact" class="text-sm text-gray-600 mt-2 line-clamp-2">{{ news.excerpt }}</p>
    </div>
  </NuxtLink>
</template>
