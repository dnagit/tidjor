<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

// หน้านี้ใช้ทั้ง /movies และ /series (pages/series/index.vue) — ใต้ /series ล็อกเป็นซีรีส์
const isSeries = route.path.startsWith('/series');

// URL เดิม /movies?type=tv → 301 ไป /series (คงตัวกรองอื่นไว้)
if (!isSeries && route.query.type === 'tv') {
  await navigateTo({ path: '/series', query: { ...route.query, type: undefined } }, { redirectCode: 301 });
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const q = ref(str(route.query.q));
const qInput = ref(q.value); // ช่องพิมพ์ — ค้นจริงเมื่อหยุดพิมพ์ 350ms
const genre = ref(str(route.query.genre));
const lang = ref(str(route.query.lang));
const year = ref(str(route.query.year));
const sort = ref(str(route.query.sort)); // '' = ค่าเริ่มต้น (มีคำค้น → ใกล้เคียงที่สุด, ไม่มี → ยอดนิยม)
const type = ref(isSeries ? 'tv' : str(route.query.type)); // movie | tv | '' (ทั้งหมด)
const page = ref(Number(route.query.page) || 1);

const applySearch = useDebounceFn((v: string) => { q.value = v.trim(); }, 350);
watch(qInput, (v) => applySearch(v));

const query = computed(() => ({
  q: q.value || undefined,
  genre: genre.value || undefined,
  lang: lang.value || undefined,
  year: year.value || undefined,
  type: type.value || undefined,
  sort: sort.value || undefined,
  page: page.value,
  limit: 24,
}));

const { data, pending } = await useFetch<{ items: any[]; total: number; totalPages: number }>('/api/movies', {
  baseURL: config.public.apiBase,
  query,
  watch: [query],
});

const { data: genres } = await useFetch<{ items: any[] }>('/api/genres', { baseURL: config.public.apiBase });
// ซ่อนหมวดที่ไม่ค่อยมีคนใช้กรอง / ซ้ำกับหมวดอื่น
const HIDDEN_GENRES = ['new-release', 'news', 'talk', 'soap', 'reality', 'kids', 'war-politics', 'sci-fi-fantasy', 'action-adventure'];
const genreList = computed(() => (genres.value?.items || []).filter((g) => !HIDDEN_GENRES.includes(g.slug)));

const LANGS = [
  { v: '', label: 'ทุกภาษา' },
  { v: 'th', label: '🇹🇭 ไทย' },
  { v: 'ko', label: '🇰🇷 เกาหลี' },
  { v: 'ja', label: '🇯🇵 ญี่ปุ่น' },
  { v: 'zh', label: '🇨🇳 จีน' },
  { v: 'en', label: '🇺🇸 อังกฤษ' },
  { v: 'hi', label: '🇮🇳 อินเดีย' },
];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 2 - 1980 }, (_, i) => String(thisYear + 1 - i));

// เปลี่ยนตัวกรอง → กลับไปหน้า 1 และเขียนลง URL (แชร์ลิงก์/กดย้อนกลับได้)
watch([q, genre, lang, year, sort], () => { page.value = 1; });
watch(query, (v) => {
  router.replace({ query: { ...v, type: isSeries ? undefined : v.type, limit: undefined, page: v.page > 1 ? v.page : undefined } });
});
watch(page, () => { if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' }); });

// เปลี่ยนประเภท: ซีรีส์อยู่ที่ /series, หนัง/ทั้งหมดอยู่ที่ /movies
function setType(t: string) {
  const filters = { ...query.value, type: undefined, page: undefined, limit: undefined };
  if (t === 'tv' && !isSeries) return navigateTo({ path: '/series', query: filters });
  if (t !== 'tv' && isSeries) return navigateTo({ path: '/movies', query: { ...filters, type: t || undefined } });
  type.value = t;
  page.value = 1;
}
// กดเมนู "หนัง" ตอนอยู่หน้านี้อยู่แล้ว → อัปเดตตัวกรองตาม URL
if (!isSeries) watch(() => route.query.type, (t) => { type.value = str(t); page.value = 1; });

const activeCount = computed(() => [q.value, genre.value, lang.value, year.value].filter(Boolean).length);
function clearAll() {
  qInput.value = ''; q.value = ''; genre.value = ''; lang.value = ''; year.value = ''; sort.value = '';
}

// พิมพ์ค้นหาในหน้านี้ → นับเมื่อหยุดพิมพ์ 1.5 วินาที (ไม่นับทุกตัวอักษร)
const trackSearch = useDebounceFn((term: string) => {
  if (term.trim()) track('search', { search_term: term.trim(), search_from: isSeries ? 'series_page' : 'movies_page' });
}, 1500);
watch(q, (v) => trackSearch(v));

const heading = computed(() => (type.value === 'tv' ? 'ซีรีส์ทั้งหมด' : type.value === 'movie' ? 'หนังทั้งหมด' : 'หนังและซีรีส์ทั้งหมด'));
const genreName = computed(() => genreList.value.find((g) => g.slug === genre.value)?.nameTh);

useSeoMeta({
  title: () => (q.value ? `ค้นหา: ${q.value}` : genreName.value ? `${type.value === 'tv' ? 'ซีรีส์' : 'หนัง'}${genreName.value}` : heading.value),
  description: isSeries ? 'สำรวจซีรีส์จากทั่วโลก อ่านรีวิวและคะแนนจากคนไทย' : 'สำรวจหนังจากทั่วโลก คัดสรรโดยชุมชนคนไทย',
  ogTitle: () => (q.value ? `ค้นหา: ${q.value} - ติดจอ` : `${heading.value} - ติดจอ`),
  ogDescription: 'สำรวจหนังจากทั่วโลก คัดสรรโดยชุมชนคนไทย',
  ogImage: '/logo.jpg',
  twitterCard: 'summary_large_image',
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 md:py-8">
    <h1 class="text-2xl md:text-3xl font-bold mb-4">{{ heading }}</h1>

    <!-- ===== ตัวกรอง ===== -->
    <div class="card p-3 md:p-4 mb-5 space-y-3">
      <!-- ค้นหา -->
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
        <input
          v-model="qInput" type="search" class="input w-full pl-9 pr-9 py-2.5 text-base"
          :placeholder="`ค้นหา${isSeries ? 'ซีรีส์' : 'หนัง ซีรีส์'} พิมพ์ไทยหรืออังกฤษก็ได้ พิมพ์ผิดก็เจอ`"
          autocomplete="off" aria-label="ค้นหา"
        />
        <button v-if="qInput" type="button" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100" aria-label="ล้างคำค้น" @click="qInput = ''; q = ''">✕</button>
      </div>

      <!-- ประเภท + เรียง + ปี -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="ประเภท">
          <button
            v-for="t in [{ v: '', label: 'ทั้งหมด' }, { v: 'movie', label: '🎬 หนัง' }, { v: 'tv', label: '📺 ซีรีส์' }]" :key="t.v"
            type="button" role="tab" :aria-selected="type === t.v"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition"
            :class="type === t.v ? 'bg-white shadow text-brand-700' : 'text-gray-600 hover:text-gray-900'"
            @click="setType(t.v)"
          >{{ t.label }}</button>
        </div>
        <div class="flex gap-2 ml-auto w-full sm:w-auto">
          <select v-model="sort" class="input py-1.5 text-sm flex-1 sm:flex-none sm:w-44" aria-label="เรียงตาม">
            <option value="">{{ q ? 'ใกล้เคียงที่สุด' : 'ยอดนิยม' }}</option>
            <option v-if="q" value="popularity">ยอดนิยม</option>
            <option value="averageRating">คะแนนสูงสุด</option>
            <option value="releaseDate">ใหม่ล่าสุด</option>
            <option value="reviewCount">รีวิวเยอะที่สุด</option>
          </select>
          <select v-model="year" class="input py-1.5 text-sm flex-1 sm:flex-none sm:w-32" aria-label="ปี">
            <option value="">ทุกปี</option>
            <option v-for="y in YEARS" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <!-- หมวด (เลื่อนซ้าย-ขวาได้บนมือถือ) -->
      <div class="-mx-3 md:mx-0 px-3 md:px-0 flex gap-2 overflow-x-auto md:flex-wrap pb-1 scrollbar-none" aria-label="หมวดหมู่">
        <button type="button" class="chip-filter" :class="!genre && 'chip-filter-on'" @click="genre = ''">ทุกหมวด</button>
        <button v-for="g in genreList" :key="g.id" type="button" class="chip-filter" :class="genre === g.slug && 'chip-filter-on'" @click="genre = genre === g.slug ? '' : g.slug">
          {{ g.nameTh }}
        </button>
      </div>

      <!-- ภาษา -->
      <div class="-mx-3 md:mx-0 px-3 md:px-0 flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="ภาษา">
        <button v-for="l in LANGS" :key="l.v" type="button" class="chip-filter" :class="lang === l.v && 'chip-filter-on'" @click="lang = l.v">
          {{ l.label }}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between mb-4 text-sm">
      <p class="text-gray-500">
        <template v-if="pending">กำลังค้นหา...</template>
        <template v-else>พบ {{ (data?.total || 0).toLocaleString('th-TH') }} เรื่อง<template v-if="q"> สำหรับ “{{ q }}”</template></template>
      </p>
      <button v-if="activeCount" type="button" class="text-brand-600 hover:underline" @click="clearAll">ล้างตัวกรอง ({{ activeCount }})</button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4" :class="pending && 'opacity-60 transition'">
      <MovieCard v-for="m in data?.items" :key="m.id" :movie="m" />
    </div>

    <div v-if="!pending && !data?.items?.length" class="text-center py-12 text-gray-500">
      <p class="text-4xl mb-2">🔎</p>
      <p>ไม่เจอเรื่องที่ตรงกับตัวกรอง</p>
      <button v-if="activeCount" type="button" class="btn-outline text-sm mt-3" @click="clearAll">ล้างตัวกรองทั้งหมด</button>
    </div>

    <!-- Pagination -->
    <div v-if="data?.totalPages && data.totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
      <button class="btn-outline disabled:opacity-50" :disabled="page <= 1" @click="page--">← ก่อนหน้า</button>
      <span class="px-3 text-sm text-gray-600">{{ page }} / {{ data.totalPages }}</span>
      <button class="btn-outline disabled:opacity-50" :disabled="page >= data.totalPages" @click="page++">ถัดไป →</button>
    </div>
  </div>
</template>

<style scoped>
.chip-filter {
  @apply shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-brand-300;
}
.chip-filter-on {
  @apply border-brand-500 bg-brand-500 text-white hover:border-brand-500;
}
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
