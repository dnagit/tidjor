<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();

const { data: article, error } = await useFetch<any>(`/api/news/slug/${route.params.slug}`, {
  baseURL: config.public.apiBase,
});
if (error.value && error.value.statusCode !== 404) {
  throw createError({ statusCode: 503, statusMessage: 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง' });
}
if (!article.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบข่าว' });
const a = article.value;

// เนื้อข่าว: ย่อหน้าคั่นด้วยบรรทัดว่าง, "## " = หัวข้อย่อย (render เป็นข้อความล้วน ไม่ใช้ v-html)
const blocks = computed(() => a.content.split(/\n{2,}/).map((b: string) => b.trim()).filter(Boolean)
  .map((b: string) => (b.startsWith('## ') ? { h: b.slice(3) } : { p: b })));

const published = new Date(a.publishedAt);
const siteUrl = config.public.siteUrl.replace(/\/+$/, '');
const pageUrl = `${siteUrl}/news/${a.slug}`;
const image = tmdbImg(a.coverUrl, 'w1280');

useSeoMeta({
  title: a.title,
  description: a.excerpt,
  ogTitle: a.title,
  ogDescription: a.excerpt,
  ogType: 'article',
  // ใส่ขนาดรูปด้วย — ไม่งั้น Facebook/LINE มักไม่แสดงรูปตอนแชร์ครั้งแรก
  ogImage: image || `${siteUrl}/logo.jpg`,
  ogImageSecureUrl: image || undefined,
  ogImageWidth: image ? 1280 : undefined,
  ogImageHeight: image ? 720 : undefined,
  ogImageAlt: a.title,
  ogImageType: 'image/jpeg',
  twitterCard: 'summary_large_image',
  twitterImage: image || `${siteUrl}/logo.jpg`,
  articlePublishedTime: a.publishedAt,
  articleModifiedTime: a.updatedAt,
});
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: a.title,
      description: a.excerpt,
      image: image ? [image] : undefined,
      datePublished: a.publishedAt,
      dateModified: a.updatedAt,
      mainEntityOfPage: pageUrl,
      author: { '@type': 'Organization', name: 'ติดจอ', url: siteUrl },
      publisher: { '@type': 'Organization', name: 'ติดจอ', logo: { '@type': 'ImageObject', url: `${siteUrl}/icon-512.png` } },
    }),
  }],
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <nav class="text-sm text-gray-500 mb-4">
      <NuxtLink to="/news" class="hover:text-brand-600">ข่าว</NuxtLink>
      <span v-if="a.movie"> › <NuxtLink :to="mediaPath(a.movie)" class="hover:text-brand-600">{{ a.movie.title }}</NuxtLink></span>
    </nav>

    <article>
      <h1 class="text-2xl md:text-3xl font-bold leading-snug mb-3">{{ a.title }}</h1>
      <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-6">
        <time :datetime="a.publishedAt">{{ published.toLocaleDateString('th-TH', { dateStyle: 'long' }) }}</time>
        <span>· กองบรรณาธิการติดจอ</span>
        <span
          v-if="a.isAi"
          class="inline-block text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"
          title="ข่าวนี้ AI เรียบเรียงจากแหล่งข่าวที่อ้างอิงด้านล่าง ไม่ได้เขียนโดยนักข่าว"
        >✨ AI เรียบเรียงจากแหล่งข่าว</span>
      </div>

      <img
        v-if="a.coverUrl"
        :src="tmdbImg(a.coverUrl, 'w1280')"
        :srcset="tmdbSrcset(a.coverUrl, [780, 1280])"
        sizes="(min-width: 768px) 768px, 100vw"
        width="1280" height="720" fetchpriority="high" :alt="a.movie?.title || ''"
        class="w-full rounded-xl mb-6 aspect-video object-cover bg-gray-100"
      />

      <div class="text-gray-800 leading-relaxed text-[1.05rem]">
        <template v-for="(b, i) in blocks" :key="i">
          <h2 v-if="b.h" class="text-xl font-bold mt-8 mb-3">{{ b.h }}</h2>
          <p v-else class="mb-4 whitespace-pre-line">{{ b.p }}</p>
        </template>
      </div>

      <NuxtLink v-if="a.movie" :to="mediaPath(a.movie)" class="card p-4 mt-8 flex gap-4 items-center hover:shadow-md transition">
        <img v-if="a.movie.posterUrl" :src="tmdbImg(a.movie.posterUrl, 'w185')" width="64" height="96" loading="lazy" alt="" class="w-16 h-24 object-cover rounded" />
        <div>
          <p class="text-xs text-gray-500">{{ a.movie.mediaType === 'tv' ? 'ซีรีส์' : 'หนัง' }}ในข่าวนี้</p>
          <p class="font-bold">{{ a.movie.title }}</p>
          <p class="text-sm text-brand-600 mt-1">ดูรายละเอียด อ่านรีวิว และเพิ่มใน Watchlist →</p>
        </div>
      </NuxtLink>

      <section v-if="a.sources?.length" class="mt-8 text-sm">
        <h2 class="font-semibold text-gray-700 mb-2">แหล่งอ้างอิง</h2>
        <ul class="space-y-1">
          <li v-for="s in a.sources" :key="s.url">
            <a :href="s.url" target="_blank" rel="noopener nofollow" class="text-gray-500 hover:text-brand-600 break-words">{{ s.name }}</a>
          </li>
        </ul>
      </section>
    </article>

    <section v-if="a.related?.length" class="mt-12">
      <h2 class="text-xl font-bold mb-4">ข่าวล่าสุด</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <NewsCard v-for="n in a.related" :key="n.id" :news="n" compact />
      </div>
    </section>
  </div>
</template>
