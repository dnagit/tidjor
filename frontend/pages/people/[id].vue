<script setup lang="ts">
const NuxtLink = resolveComponent('NuxtLink');
const route = useRoute();
const config = useRuntimeConfig();

const personId = parseInt(String(route.params.id), 10);
const { data: person, error } = await useFetch<any>(`/api/people/${personId}`, {
  baseURL: config.public.apiBase,
});

// 404 เฉพาะเมื่อไม่มีนักแสดงคนนี้จริง — API ล่มให้ตอบ 503 (Google จะไม่ถอดหน้าออก)
if (error.value && error.value.statusCode !== 404) {
  throw createError({ statusCode: 503, statusMessage: 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง' });
}
if (!person.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบนักแสดง' });

const p = person.value;

// URL ไม่ตรงกับรูปแบบหลัก (เช่น /people/1245 หรือชื่อสะกดผิด) → 301 ไป URL หลัก
const path = personPath(p.id, p.name);
if (route.path !== path) await navigateTo(path, { redirectCode: 301 });

const movies = computed(() => p.credits.filter((c: any) => c.mediaType === 'movie'));
const series = computed(() => p.credits.filter((c: any) => c.mediaType === 'tv'));
const tab = ref<'movie' | 'tv'>(movies.value.length || !series.value.length ? 'movie' : 'tv');
const list = computed(() => (tab.value === 'movie' ? movies.value : series.value));
const showFullBio = ref(false);

const year = (d?: string | null) => (d ? d.slice(0, 4) : '—');
const thaiDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

// ===== SEO =====
const knownFor = p.credits.filter((c: any) => c.slug).slice(0, 3).map((c: any) => c.title);
const description = `${p.name} — ผลงานการแสดง ${movies.value.length} เรื่องและซีรีส์ ${series.value.length} เรื่อง`
  + (knownFor.length ? ` เช่น ${knownFor.join(', ')}` : '') + ' อ่านรีวิวและคะแนนบนติดจอ';

useSeoMeta({
  title: `${p.name} ผลงานหนังและซีรีส์`,
  description,
  ogTitle: `${p.name} - ติดจอ`,
  ogDescription: description,
  ogImage: p.profileUrl || '/logo.jpg',
  ogType: 'profile',
  twitterCard: 'summary',
});

const site = (config.public.siteUrl || '').replace(/\/+$/, '');
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: p.name,
      url: `${site}${path}`,
      image: p.profileUrl || undefined,
      description: p.biography ? p.biography.slice(0, 300) : undefined,
      birthDate: p.birthday || undefined,
      deathDate: p.deathday || undefined,
      birthPlace: p.placeOfBirth || undefined,
      alternateName: p.alsoKnownAs?.length ? p.alsoKnownAs.slice(0, 5) : undefined,
      sameAs: p.imdbId ? [`https://www.imdb.com/name/${p.imdbId}/`] : undefined,
    }),
  }],
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <header class="flex flex-col sm:flex-row gap-6 mb-10">
      <img
        v-if="p.profileUrl"
        :src="p.profileUrl"
        :alt="p.name"
        width="200"
        height="300"
        class="w-40 sm:w-52 aspect-[2/3] object-cover rounded-xl shadow mx-auto sm:mx-0 shrink-0"
      />
      <div v-else class="w-40 sm:w-52 aspect-[2/3] rounded-xl bg-gray-100 flex items-center justify-center text-5xl mx-auto sm:mx-0 shrink-0">🎭</div>

      <div class="flex-1 min-w-0">
        <h1 class="text-3xl md:text-4xl font-bold mb-3">{{ p.name }}</h1>
        <div class="text-sm text-gray-600 space-y-1 mb-4">
          <p v-if="p.birthday">🎂 เกิด {{ thaiDate(p.birthday) }}<template v-if="p.placeOfBirth"> · {{ p.placeOfBirth }}</template></p>
          <p v-if="p.deathday">🕊️ เสียชีวิต {{ thaiDate(p.deathday) }}</p>
          <p>🎬 หนัง {{ movies.length }} เรื่อง · 📺 ซีรีส์ {{ series.length }} เรื่อง</p>
        </div>
        <div v-if="p.biography">
          <h2 class="font-bold mb-1">ประวัติ</h2>
          <p class="text-gray-700 leading-relaxed whitespace-pre-line" :class="!showFullBio && 'line-clamp-5'">{{ p.biography }}</p>
          <button v-if="p.biography.length > 400" class="text-brand-600 text-sm mt-1 hover:underline" @click="showFullBio = !showFullBio">
            {{ showFullBio ? 'ย่อ' : 'อ่านต่อ' }}
          </button>
        </div>
      </div>
    </header>

    <section>
      <div class="flex items-center gap-2 mb-5">
        <h2 class="text-2xl font-bold mr-4">ผลงานการแสดง</h2>
        <button
          class="px-3 py-1.5 rounded-full text-sm border"
          :class="tab === 'movie' ? 'bg-brand-500 border-brand-500 text-white' : 'hover:bg-gray-50'"
          @click="tab = 'movie'"
        >หนัง ({{ movies.length }})</button>
        <button
          class="px-3 py-1.5 rounded-full text-sm border"
          :class="tab === 'tv' ? 'bg-brand-500 border-brand-500 text-white' : 'hover:bg-gray-50'"
          @click="tab = 'tv'"
        >ซีรีส์ ({{ series.length }})</button>
      </div>

      <p v-if="!list.length" class="text-gray-500">ไม่มีข้อมูล</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <component
          :is="c.slug ? NuxtLink : 'div'"
          v-for="c in list"
          :key="`${c.mediaType}-${c.tmdbId}`"
          :to="c.slug ? `/movies/${c.slug}` : undefined"
          class="card overflow-hidden"
          :class="c.slug ? 'hover:shadow-md transition group' : 'opacity-70'"
        >
          <div class="aspect-[2/3] bg-gray-100 overflow-hidden relative">
            <img v-if="c.posterUrl" :src="c.posterUrl" :alt="c.title" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition" />
            <div v-else class="w-full h-full flex items-center justify-center text-4xl">🎬</div>
            <span v-if="c.averageRating" class="absolute top-2 right-2 text-xs font-medium bg-ink/80 text-white rounded px-1.5 py-0.5">
              ⭐ {{ c.averageRating.toFixed(1) }}
            </span>
          </div>
          <div class="p-3">
            <h3 class="font-semibold text-sm line-clamp-2 leading-tight" :class="c.slug && 'group-hover:text-brand-600'">{{ c.title }}</h3>
            <p class="text-xs text-gray-500 mt-1">
              {{ year(c.date) }}<template v-if="c.character"> · {{ c.character }}</template>
            </p>
            <p v-if="c.episodeCount" class="text-xs text-gray-400">{{ c.episodeCount }} ตอน</p>
          </div>
        </component>
      </div>
      <p class="text-xs text-gray-400 mt-6">ข้อมูลผลงานจาก TMDB · เรื่องที่กดได้มีหน้ารีวิวบนติดจอ</p>
    </section>
  </div>
</template>
