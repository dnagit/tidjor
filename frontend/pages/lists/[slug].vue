<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const { data: list, error } = await useFetch<any>(`/api/lists/slug/${route.params.slug}`, { baseURL: config.public.apiBase });
if (error.value && error.value.statusCode !== 404) throw createError({ statusCode: 503, statusMessage: 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง' });
if (!list.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบบทความ' });
const l = list.value;

const siteUrl = config.public.siteUrl.replace(/\/+$/, '');
const image = tmdbImg(l.coverUrl, 'w1280');
const year = (d?: string) => (d ? new Date(d).getFullYear() : '');
const paragraphs = l.intro.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean);

useSeoMeta({
  title: l.title,
  description: l.excerpt,
  ogTitle: l.title,
  ogDescription: l.excerpt,
  ogType: 'article',
  ogImage: image || `${siteUrl}/logo.jpg`,
  ogImageWidth: image ? 1280 : undefined,
  ogImageHeight: image ? 720 : undefined,
  twitterCard: 'summary_large_image',
  twitterImage: image || `${siteUrl}/logo.jpg`,
});
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: l.title,
      description: l.excerpt,
      numberOfItems: l.items.length,
      itemListElement: l.items.map((it: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}${mediaPath(it.movie)}`,
        name: it.movie.titleTh || it.movie.title,
      })),
    }),
  }],
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <nav class="text-sm text-gray-500 mb-4"><NuxtLink to="/lists" class="hover:text-brand-600">แนะนำหนังและซีรีส์</NuxtLink></nav>
    <h1 class="text-2xl md:text-3xl font-bold leading-snug mb-3">{{ l.title }}</h1>
    <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-6">
      <span>อัปเดต {{ new Date(l.updatedAt).toLocaleDateString('th-TH', { dateStyle: 'long' }) }}</span>
      <span v-if="l.isAi" class="inline-block text-xs bg-gray-100 rounded-full px-2 py-0.5" title="AI เรียบเรียงคำโปรยจากเรื่องย่อและข้อมูลของแต่ละเรื่อง">✨ AI ช่วยเรียบเรียง</span>
    </div>

    <p v-for="(p, i) in paragraphs" :key="i" class="text-gray-800 leading-relaxed mb-4">{{ p }}</p>

    <ol class="space-y-6 mt-8">
      <li v-for="(it, i) in l.items" :key="it.movie.id" class="card p-4 flex gap-4">
        <NuxtLink :to="mediaPath(it.movie)" class="shrink-0">
          <img v-if="it.movie.posterUrl" :src="tmdbImg(it.movie.posterUrl, 'w185')" width="96" height="144" loading="lazy" :alt="it.movie.titleTh || it.movie.title" class="w-24 h-36 object-cover rounded" />
        </NuxtLink>
        <div class="min-w-0">
          <h2 class="text-lg font-bold leading-snug">
            <span class="text-brand-600">{{ i + 1 }}.</span>
            <NuxtLink :to="mediaPath(it.movie)" class="hover:text-brand-600">{{ it.movie.titleTh || it.movie.title }}</NuxtLink>
            <span class="text-gray-400 font-normal text-base"> ({{ year(it.movie.releaseDate) }})</span>
          </h2>
          <p class="text-xs text-gray-500 mt-1">
            {{ it.movie.genres?.map((g: any) => g.nameTh).join(' · ') }}
            <template v-if="it.movie.ratingCount"> · ★ {{ it.movie.averageRating.toFixed(1) }}/10</template>
          </p>
          <p class="text-gray-700 mt-2 leading-relaxed">{{ it.blurb }}</p>
          <p v-if="it.movie.stream?.length" class="text-sm mt-2">📺 ดูได้ที่ <b>{{ it.movie.stream.join(', ') }}</b></p>
          <NuxtLink :to="mediaPath(it.movie)" class="text-sm text-brand-600 mt-2 inline-block">อ่านรีวิว →</NuxtLink>
        </div>
      </li>
    </ol>

    <ShareButtons class="mt-8" :title="l.title" :path="`/lists/${l.slug}`" content-type="list" :item-id="l.slug" />

    <section v-if="l.others?.length" class="mt-12">
      <h2 class="text-xl font-bold mb-4">ลิสต์อื่น ๆ</h2>
      <div class="grid sm:grid-cols-2 gap-3">
        <NuxtLink v-for="o in l.others" :key="o.id" :to="`/lists/${o.slug}`" class="card p-3 hover:shadow-md transition font-medium text-sm">{{ o.title }}</NuxtLink>
      </div>
    </section>
  </div>
</template>
