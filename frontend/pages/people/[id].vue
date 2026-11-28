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

// บทแสดงจริง (ไม่รวมไปเป็นตัวเอง/สารคดี) — นับและแสดงเป็นค่าเริ่มต้น
const acting = p.credits.filter((c: any) => !c.isSelf);
const movies = computed(() => p.credits.filter((c: any) => c.mediaType === 'movie'));
const series = computed(() => p.credits.filter((c: any) => c.mediaType === 'tv'));
const actingMovies = acting.filter((c: any) => c.mediaType === 'movie').length;
const actingSeries = acting.filter((c: any) => c.mediaType === 'tv').length;

// ผลงานเด่น: โหวตเยอะที่สุดบน TMDB (คงที่กว่าความนิยมรายวัน)
const knownForList = [...acting].sort((a: any, b: any) => b.voteCount - a.voteCount).slice(0, 12);

const tab = ref<'movie' | 'tv'>(actingMovies || !actingSeries ? 'movie' : 'tv');
const sort = ref<'date' | 'popular'>('date');
const showSelf = ref(false);
const today = new Date().toISOString().slice(0, 10);
const list = computed(() => {
  const items = (tab.value === 'movie' ? movies.value : series.value).filter((c: any) => showSelf.value || !c.isSelf);
  return sort.value === 'popular' ? [...items].sort((a: any, b: any) => b.voteCount - a.voteCount) : items;
});
const hiddenSelf = computed(() => (tab.value === 'movie' ? movies.value : series.value).filter((c: any) => c.isSelf).length);
const isUpcoming = (c: any) => !c.date || c.date > today;
const showFullBio = ref(false);
const age = p.birthday ? Math.floor(((p.deathday ? new Date(p.deathday) : new Date()).getTime() - new Date(p.birthday).getTime()) / 31557600000) : null;
const DEPT: Record<string, string> = { Acting: 'นักแสดง', Directing: 'ผู้กำกับ', Writing: 'นักเขียนบท', Production: 'ผู้อำนวยการสร้าง' };

const year = (d?: string | null) => (d ? d.slice(0, 4) : '—');
const thaiDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

// ===== SEO =====
const knownFor = knownForList.slice(0, 3).map((c: any) => c.title);
const description = `${p.name} — ผลงานการแสดง หนัง ${actingMovies} เรื่องและซีรีส์ ${actingSeries} เรื่อง`
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
  <div>
    <!-- ===== HERO (พื้นมืด แบบเดียวกับหน้าหนัง) ===== -->
    <section class="relative bg-ink text-white overflow-hidden">
      <img v-if="p.backdropUrl" :src="p.backdropUrl" alt="" class="absolute inset-0 w-full h-full object-cover opacity-20" />
      <div class="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/50" />
      <div class="relative max-w-6xl mx-auto px-4 py-6 md:py-10 flex gap-4 md:gap-8">
        <img
          v-if="p.profileUrl" :src="p.profileUrl" :alt="p.name" fetchpriority="high" width="200" height="300"
          class="w-28 sm:w-40 md:w-56 aspect-[2/3] object-cover self-start shrink-0 rounded-xl shadow-2xl ring-1 ring-white/10"
        />
        <div v-else class="w-28 sm:w-40 md:w-56 aspect-[2/3] rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Icon name="user" class="w-12 h-12 text-white/50" /></div>

        <div class="min-w-0 flex-1 md:pt-2">
          <p v-if="p.department" class="text-xs md:text-sm text-brand-300 font-medium mb-1">{{ DEPT[p.department] || p.department }}</p>
          <h1 class="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">{{ p.name }}</h1>
          <div class="text-sm text-white/70 space-y-1 mt-3">
            <p v-if="p.birthday" class="flex items-start gap-1.5">
              <Icon name="calendar" class="w-4 h-4 mt-0.5" />
              <span>เกิด {{ thaiDate(p.birthday) }}<template v-if="age && !p.deathday"> (อายุ {{ age }} ปี)</template><template v-if="p.placeOfBirth"><span class="hidden sm:inline"> · {{ p.placeOfBirth }}</span></template></span>
            </p>
            <p v-if="p.deathday" class="flex items-center gap-1.5"><Icon name="clock" class="w-4 h-4" />เสียชีวิต {{ thaiDate(p.deathday) }}<template v-if="age"> (อายุ {{ age }} ปี)</template></p>
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            <span class="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm"><Icon name="film" class="w-4 h-4 text-brand-400" />หนัง <b>{{ actingMovies }}</b></span>
            <span class="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm"><Icon name="tv" class="w-4 h-4 text-brand-400" />ซีรีส์ <b>{{ actingSeries }}</b></span>
          </div>
          <!-- ประวัติ (จอกว้างอยู่ในส่วนหัว) -->
          <div v-if="p.biography" class="hidden md:block mt-5 max-w-3xl">
            <p class="text-white/80 leading-relaxed whitespace-pre-line" :class="!showFullBio && 'line-clamp-4'">{{ p.biography }}</p>
            <button v-if="p.biography.length > 300" class="text-brand-300 text-sm mt-1 hover:underline" @click="showFullBio = !showFullBio">{{ showFullBio ? 'ย่อ' : 'อ่านต่อ' }}</button>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <!-- ประวัติ (มือถือ) -->
      <section v-if="p.biography" class="md:hidden">
        <h2 class="text-lg font-bold mb-2">ประวัติ</h2>
        <p class="text-gray-700 leading-relaxed whitespace-pre-line" :class="!showFullBio && 'line-clamp-4'">{{ p.biography }}</p>
        <button v-if="p.biography.length > 200" class="text-brand-600 text-sm mt-1" @click="showFullBio = !showFullBio">{{ showFullBio ? 'ย่อ' : 'อ่านต่อ' }}</button>
      </section>

      <!-- ผลงานเด่น (ปัดได้) -->
      <section v-if="knownForList.length">
        <h2 class="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2"><Icon name="star" class="w-6 h-6 text-brand-500" />ผลงานเด่น</h2>
        <div class="-mx-4 px-4 flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 scrollbar-none">
          <component
            :is="c.slug ? NuxtLink : 'div'" v-for="c in knownForList" :key="`k-${c.mediaType}-${c.tmdbId}`"
            :to="c.slug ? mediaPath(c) : undefined"
            class="w-[34%] sm:w-[24%] md:w-[18%] lg:w-[15%] shrink-0 snap-start group"
          >
            <div class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 shadow-sm">
              <img v-if="c.posterUrl" :src="tmdbImg(c.posterUrl, 'w342')" :alt="c.title" loading="lazy" width="342" height="513" class="w-full h-full object-cover group-hover:scale-105 transition" />
            </div>
            <p class="text-sm font-semibold mt-2 leading-tight line-clamp-2" :class="c.slug && 'group-hover:text-brand-600'">{{ c.title }}</p>
            <p class="text-xs text-gray-500 line-clamp-1">{{ c.character || year(c.date) }}</p>
          </component>
        </div>
      </section>

      <!-- ผลงานทั้งหมด -->
      <section>
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-xl md:text-2xl font-bold">ผลงานทั้งหมด</h2>
          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-lg bg-gray-100 p-1">
              <button v-for="t in [{ v: 'movie', label: 'หนัง', n: actingMovies }, { v: 'tv', label: 'ซีรีส์', n: actingSeries }]" :key="t.v"
                type="button" class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition"
                :class="tab === t.v ? 'bg-white shadow text-brand-700' : 'text-gray-600'" @click="tab = t.v as any">
                {{ t.label }} <span class="text-gray-400">{{ t.n }}</span>
              </button>
            </div>
            <select v-model="sort" class="input py-1.5 text-sm w-auto" aria-label="เรียงตาม">
              <option value="date">ล่าสุด</option>
              <option value="popular">ดังที่สุด</option>
            </select>
          </div>
        </div>

        <p v-if="!list.length" class="text-gray-500">ไม่มีข้อมูล</p>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
          <component
            :is="c.slug ? NuxtLink : 'div'" v-for="c in list" :key="`${c.mediaType}-${c.tmdbId}`"
            :to="c.slug ? mediaPath(c) : undefined"
            class="group min-w-0" :class="!c.slug && 'opacity-75'"
          >
            <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 relative">
              <img v-if="c.posterUrl" :src="tmdbImg(c.posterUrl, 'w185')" :srcset="tmdbSrcset(c.posterUrl, [185, 342])" sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw" :alt="c.title" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition" />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-300"><Icon :name="c.mediaType === 'tv' ? 'tv' : 'film'" class="w-8 h-8" /></div>
              <span v-if="isUpcoming(c)" class="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-brand-500 text-ink rounded px-1.5 py-0.5">ยังไม่ฉาย</span>
              <span v-else-if="c.averageRating" class="absolute top-1.5 right-1.5 text-[10px] font-semibold bg-ink/80 text-white rounded px-1.5 py-0.5">★ {{ c.averageRating.toFixed(1) }}</span>
            </div>
            <p class="text-xs md:text-sm font-semibold mt-1.5 leading-tight line-clamp-2" :class="c.slug && 'group-hover:text-brand-600'">{{ c.title }}</p>
            <p class="text-[11px] md:text-xs text-gray-500 line-clamp-1">{{ year(c.date) }}<template v-if="c.character"> · {{ c.character }}</template></p>
            <p v-if="c.episodeCount" class="text-[11px] text-gray-400">{{ c.episodeCount }} ตอน</p>
          </component>
        </div>

        <button v-if="hiddenSelf || showSelf" type="button" class="mt-5 text-sm text-brand-600 font-medium" @click="showSelf = !showSelf">
          {{ showSelf ? 'ซ่อนรายการที่ไปปรากฏตัว/สารคดี' : `แสดงรายการที่ไปปรากฏตัว/สารคดีด้วย (${hiddenSelf})` }}
        </button>
        <p class="text-xs text-gray-400 mt-4">ข้อมูลผลงานจาก TMDB · เรื่องที่กดได้มีหน้ารีวิวบนติดจอ</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
