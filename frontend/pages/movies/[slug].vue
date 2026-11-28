<script setup lang="ts">
const NuxtLink = resolveComponent('NuxtLink');
const route = useRoute();
const config = useRuntimeConfig();
const auth = useAuthStore();
const api = useApi();

const { data: movie, error } = await useFetch<any>(`/api/movies/slug/${route.params.slug}`, {
  baseURL: config.public.apiBase,
});

// 404 เฉพาะเมื่อ API บอกว่าไม่มีจริง — ถ้า API ล่ม/โดน rate limit ให้ตอบ 503
// (ตอบ 404 ผิด ๆ จะทำให้ Google ถอดหน้านั้นออกจาก index)
if (error.value && error.value.statusCode !== 404) {
  throw createError({ statusCode: 503, statusMessage: 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง' });
}
if (!movie.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบหนัง' });

const m = movie.value;

// URL หลัก: หนัง /movies/{slug}, ซีรีส์ /series/{slug}
// เข้ามาด้วย slug เก่า หรือ prefix ผิดประเภท (เช่น ซีรีส์ผ่าน /movies/) → 301 ไป URL หลัก
const canonicalPath = mediaPath(m);
if (route.path !== canonicalPath) {
  await navigateTo(canonicalPath, { redirectCode: 301 });
}
const isTv = m.mediaType === 'tv';

const { data: news } = await useFetch<{ items: any[] }>('/api/news', {
  baseURL: config.public.apiBase,
  query: { movieId: m.id, limit: 3 },
});

// ===== SEO =====
const siteUrl = config.public.siteUrl;
// "ดูได้ที่ Netflix, Disney+" นำหน้าคำอธิบาย — คนค้น "เรื่อง X ดูได้ที่ไหน" เยอะ
const streamNames = [...new Set([...(m.watchProviders?.stream || []), ...(m.watchProviders?.free || [])].map((p: any) => p.name))];
const shareImage = tmdbImg(m.backdropUrl, 'w1280') || tmdbImg(m.posterUrl, 'w780') || `${siteUrl.replace(/\/+$/, '')}/logo.jpg`;
const watchText = streamNames.length ? `ดูได้ที่ ${streamNames.slice(0, 3).join(', ')} · ` : '';
useSeoMeta({
  title: `${m.titleTh || m.title} (${m.releaseDate ? new Date(m.releaseDate).getFullYear() : ''})`,
  description: `${watchText}${m.overview || `รีวิวและให้คะแนน${isTv ? 'ซีรีส์' : 'หนัง'} ${m.title}`}`.slice(0, 300),
  ogTitle: `${m.titleTh || m.title} - ติดจอ`,
  ogDescription: m.overview,
  ogImage: shareImage,
  ogImageWidth: m.backdropUrl ? 1280 : m.posterUrl ? 780 : undefined,
  ogImageHeight: m.backdropUrl ? 720 : m.posterUrl ? 1170 : undefined,
  ogImageAlt: m.titleTh || m.title,
  twitterCard: 'summary_large_image',
  twitterImage: shareImage,
});

// ===== Structured data (JSON-LD) — Movie / TVSeries =====
// AggregateRating + Review ใช้เฉพาะคะแนน/รีวิวจากผู้ใช้จริง (ตามแนวทาง review snippet ของ Google)
const pageUrl = `${siteUrl.replace(/\/+$/, '')}${canonicalPath}`;
const humanReviews = (m.reviews || []).filter((r: any) => !r.user?.isBot).slice(0, 5);
const people = (names?: string | null) =>
  names ? names.split(',').map((n) => ({ '@type': 'Person', name: n.trim() })) : undefined;
const schema: Record<string, any> = {
  '@context': 'https://schema.org',
  '@type': isTv ? 'TVSeries' : 'Movie',
  name: m.titleTh || m.title,
  alternateName: m.titleEn && m.titleEn !== (m.titleTh || m.title) ? m.titleEn : undefined,
  url: pageUrl,
  image: tmdbImg(m.posterUrl, 'w500'),
  description: m.overview || undefined,
  genre: m.genres?.map((g: any) => g.nameTh),
  inLanguage: m.originalLanguage || undefined,
  countryOfOrigin: m.countries?.length ? m.countries.map((c: string) => ({ '@type': 'Country', name: c })) : undefined,
  actor: Array.isArray(m.cast) ? m.cast.slice(0, 5).map((c: any) => ({ '@type': 'Person', name: c.name })) : undefined,
  ...(isTv
    ? {
        startDate: m.releaseDate?.slice(0, 10),
        creator: people(m.director),
        numberOfSeasons: m.numberOfSeasons || undefined,
        numberOfEpisodes: m.numberOfEpisodes || undefined,
      }
    : {
        datePublished: m.releaseDate?.slice(0, 10),
        director: people(m.director),
        duration: m.runtime ? `PT${m.runtime}M` : undefined,
      }),
  aggregateRating: m.userRating?.count > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: Number(m.userRating.average.toFixed(1)),
    ratingCount: m.userRating.count,
    bestRating: 10,
    worstRating: 1,
  } : undefined,
  review: humanReviews.length ? humanReviews.map((r: any) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.user.displayName },
    datePublished: r.createdAt?.slice(0, 10),
    name: r.title || undefined,
    reviewBody: r.hasSpoiler ? undefined : r.content,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 10, worstRating: 1 },
  })) : undefined,
};
useHead({
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(schema) }],
});

// ===== Review form =====
const showForm = ref(false);
const form = ref({ rating: 8, title: '', content: '', hasSpoiler: false });

// คะแนน/รีวิวที่เคยให้ไว้ (โหลดฝั่ง browser หลังรู้ว่า login แล้ว)
const myRating = ref<number | null>(null);
// ข้อมูลจาก useFetch เป็น shallow → แยกตัวเลขคะแนนเป็น reactive ให้อัปเดตบนหน้าได้หลังกดดาว
const liveStats = reactive({ averageRating: m.averageRating, ratingCount: m.ratingCount, reviewCount: m.reviewCount });
const inWatchlist = ref(false);
async function loadMine() {
  const r = await api.get<{ review: any; inWatchlist: boolean }>(`/api/reviews/mine/${m.id}`).catch(() => null);
  inWatchlist.value = !!r?.inWatchlist;
  if (!r?.review) return;
  myRating.value = r.review.rating;
  form.value = { rating: r.review.rating, title: r.review.title || '', content: r.review.content || '', hasSpoiler: r.review.hasSpoiler };
}
onMounted(() => watch(() => auth.isAuthenticated, (ok) => ok && loadMine(), { immediate: true }));
function onRated(n: number, stats?: any) {
  myRating.value = n;
  form.value.rating = n;
  if (stats) Object.assign(liveStats, stats); // อัปเดตคะแนนเฉลี่ย/จำนวนโหวตบนหน้าทันที
}
function openForm() {
  showForm.value = true;
  track('open_review_form', mediaParams(m));
  nextTick(() => scrollTo('review-form'));
}

async function submitReview() {
  if (!auth.isAuthenticated) {
    return navigateTo(`/auth/login?next=${route.fullPath}`);
  }
  try {
    await api.post('/api/reviews', { movieId: m.id, ...form.value });
    track('submit_review', { ...mediaParams(m), rating: form.value.rating, has_spoiler: form.value.hasSpoiler });
    showForm.value = false;
    await refreshNuxtData();
    location.reload();
  } catch (e: any) {
    alert('เกิดข้อผิดพลาด: ' + (e?.data?.error || e.message));
  }
}

// กดครั้งแรก = เพิ่ม, กดอีกที = เอาออก (ปุ่มบอกสถานะ ไม่ต้องมี alert)
const watchBusy = ref(false);
async function toggleWatchlist() {
  if (!auth.isAuthenticated) return navigateTo(`/auth/login?next=${encodeURIComponent(route.fullPath)}`);
  watchBusy.value = true;
  try {
    if (inWatchlist.value) {
      await api.delete(`/api/watchlist/${m.id}`);
      inWatchlist.value = false;
    } else {
      await api.post('/api/watchlist', { movieId: m.id });
      inWatchlist.value = true;
      track('add_to_watchlist', mediaParams(m));
    }
  } finally { watchBusy.value = false; }
}

// ===== ตัวอย่าง (trailer) — เปิดดูในหน้า ไม่ต้องออกไป YouTube =====
const trailerId = computed(() => m.trailerUrl?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1] || null);
const showTrailer = ref(false);
function openTrailer() {
  track('view_trailer', mediaParams(m));
  if (trailerId.value) showTrailer.value = true;
  else window.open(m.trailerUrl, '_blank', 'noopener');
}

// ===== ข้อมูลแสดงผล =====
const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : null;
const releaseText = m.releaseDate ? new Date(m.releaseDate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : null;
const LANG_TH: Record<string, string> = { th: 'ไทย', en: 'อังกฤษ', ko: 'เกาหลี', ja: 'ญี่ปุ่น', zh: 'จีน', cn: 'จีน (กวางตุ้ง)', hi: 'ฮินดี', fr: 'ฝรั่งเศส', es: 'สเปน', it: 'อิตาลี', de: 'เยอรมัน', ru: 'รัสเซีย', id: 'อินโดนีเซีย', tl: 'ตากาล็อก', vi: 'เวียดนาม' };
const facts = [
  { label: isTv ? 'เริ่มออกอากาศ' : 'วันฉาย', value: releaseText },
  { label: isTv ? 'ผู้สร้าง' : 'ผู้กำกับ', value: m.director },
  { label: isTv ? 'ช่อง/แพลตฟอร์ม' : 'สตูดิโอ', value: m.studio },
  { label: 'จำนวน', value: isTv && m.numberOfSeasons ? `${m.numberOfSeasons} ซีซั่น${m.numberOfEpisodes ? ` · ${m.numberOfEpisodes} ตอน` : ''}` : null },
  { label: 'ความยาว', value: m.runtime ? `${m.runtime} นาที${isTv ? '/ตอน' : ''}` : null },
  { label: 'ภาษา', value: m.originalLanguage ? (LANG_TH[m.originalLanguage] || m.originalLanguage.toUpperCase()) : null },
].filter((f) => f.value);
const showFullOverview = ref(false);
function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
</script>

<template>
  <article>
    <!-- ===== HERO (พื้นมืดแบบโรงหนัง) ===== -->
    <section class="relative bg-ink text-white overflow-hidden">
      <img
        v-if="m.backdropUrl"
        :src="tmdbImg(m.backdropUrl, 'w1280')"
        :srcset="tmdbSrcset(m.backdropUrl, [780, 1280])"
        sizes="100vw"
        alt=""
        fetchpriority="high"
        class="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <!-- ไล่เฉดให้ตัวหนังสืออ่านง่ายทุกภาพ -->
      <div class="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
      <div class="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />

      <div class="relative max-w-6xl mx-auto px-4 py-6 md:py-12 flex gap-4 md:gap-10">
        <img
          v-if="m.posterUrl"
          :src="tmdbImg(m.posterUrl, 'w342')"
          :srcset="tmdbSrcset(m.posterUrl, [185, 342, 500])"
          sizes="(min-width: 768px) 288px, 112px"
          width="342" height="513"
          :alt="m.titleTh || m.title"
          fetchpriority="high"
          class="w-28 sm:w-40 md:w-72 aspect-[2/3] object-cover self-start shrink-0 rounded-xl shadow-2xl ring-1 ring-white/10"
        />

        <div class="min-w-0 flex-1 md:pt-4">
          <p class="text-xs md:text-sm text-brand-300 font-medium tracking-wide mb-1 flex items-center gap-1.5">
            <Icon :name="isTv ? 'tv' : 'film'" class="w-4 h-4" />
            {{ isTv ? 'ซีรีส์' : 'ภาพยนตร์' }}<template v-if="year"> · {{ year }}</template>
          </p>
          <h1 class="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">{{ m.titleTh || m.title }}</h1>
          <p v-if="m.titleEn && m.titleEn !== (m.titleTh || m.title)" class="text-white/60 text-sm md:text-lg mt-1">{{ m.titleEn }}</p>

          <!-- คะแนน + ข้อมูลสั้น -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 md:mt-5">
            <button type="button" class="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 transition" @click="scrollTo('rate')">
              <Icon name="star" filled class="w-5 h-5 md:w-6 md:h-6 text-brand-400" />
              <span class="text-xl md:text-2xl font-bold">{{ liveStats.ratingCount ? liveStats.averageRating.toFixed(1) : '–' }}</span>
              <span class="text-xs text-white/60 leading-tight text-left">/10<br />{{ liveStats.ratingCount }} โหวต</span>
            </button>
            <span v-if="myRating" class="text-sm text-brand-300">คุณให้ {{ myRating }}/10</span>
            <span v-if="m.runtime" class="hidden sm:flex items-center gap-1 text-sm text-white/70"><Icon name="clock" class="w-4 h-4" />{{ m.runtime }} นาที{{ isTv ? '/ตอน' : '' }}</span>
            <span v-if="isTv && m.numberOfSeasons" class="hidden sm:flex items-center gap-1 text-sm text-white/70"><Icon name="layers" class="w-4 h-4" />{{ m.numberOfSeasons }} ซีซั่น</span>
          </div>

          <div class="flex flex-wrap gap-1.5 mt-3">
            <span v-for="g in m.genres" :key="g.id" class="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80">{{ g.nameTh }}</span>
          </div>

          <!-- เรื่องย่อ (เดสก์ท็อปอยู่ในส่วนหัว) -->
          <p v-if="m.tagline" class="hidden md:block italic text-white/60 mt-5">"{{ m.tagline }}"</p>
          <p v-if="m.overview" class="hidden md:block text-white/85 leading-relaxed mt-2 max-w-3xl">{{ m.overview }}</p>

          <!-- ปุ่มหลัก -->
          <div class="hidden md:flex flex-wrap gap-3 mt-6">
            <button v-if="m.trailerUrl" type="button" class="btn bg-brand-500 hover:bg-brand-600 text-ink font-semibold px-5" @click="openTrailer">
              <Icon name="play" filled class="w-4 h-4" /> ดูตัวอย่าง
            </button>
            <button type="button" class="btn border border-white/30 hover:bg-white/10" :disabled="watchBusy" @click="toggleWatchlist">
              <Icon :name="inWatchlist ? 'check' : 'bookmark'" class="w-4 h-4" /> {{ inWatchlist ? 'อยู่ใน Watchlist' : 'เพิ่มใน Watchlist' }}
            </button>
            <button type="button" class="btn border border-white/30 hover:bg-white/10" @click="showForm ? (showForm = false) : openForm()">
              <Icon name="pen" class="w-4 h-4" /> {{ form.content ? 'แก้ไขรีวิว' : 'เขียนรีวิว' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ปุ่มหลัก (มือถือ: เต็มความกว้าง กดง่าย) -->
      <div class="relative md:hidden px-4 pb-5 grid gap-2" :class="m.trailerUrl ? 'grid-cols-3' : 'grid-cols-2'">
        <button v-if="m.trailerUrl" type="button" class="btn bg-brand-500 text-ink font-semibold text-sm px-2 py-2.5" @click="openTrailer">
          <Icon name="play" filled class="w-4 h-4" /> ตัวอย่าง
        </button>
        <button type="button" class="btn border border-white/30 text-sm px-2 py-2.5" :disabled="watchBusy" @click="toggleWatchlist">
          <Icon :name="inWatchlist ? 'check' : 'bookmark'" class="w-4 h-4" /> {{ inWatchlist ? 'เพิ่มแล้ว' : 'Watchlist' }}
        </button>
        <button type="button" class="btn border border-white/30 text-sm px-2 py-2.5" @click="showForm ? (showForm = false) : openForm()">
          <Icon name="pen" class="w-4 h-4" /> รีวิว
        </button>
      </div>
    </section>

    <!-- ===== เนื้อหา ===== -->
    <div class="max-w-6xl mx-auto px-4 py-6 md:py-10 grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-10">
      <div class="min-w-0 space-y-8">
        <!-- เรื่องย่อ (มือถือ) -->
        <section v-if="m.overview" class="md:hidden">
          <h2 class="text-lg font-bold mb-2">เรื่องย่อ</h2>
          <p class="text-gray-700 leading-relaxed" :class="!showFullOverview && 'line-clamp-4'">{{ m.overview }}</p>
          <button v-if="m.overview.length > 180" type="button" class="text-sm text-brand-600 mt-1" @click="showFullOverview = !showFullOverview">
            {{ showFullOverview ? 'ย่อ' : 'อ่านต่อ' }}
          </button>
        </section>

        <div class="lg:hidden"><WatchProviders :providers="m.watchProviders" :title="m.titleTh || m.title" :is-tv="isTv" /></div>

        <div id="rate" class="scroll-mt-28"><QuickRate :movie="m" :my-rating="myRating" @rated="onRated" @write="openForm" /></div>

        <!-- ฟอร์มรีวิว -->
        <section v-if="showForm" id="review-form" class="card p-5 md:p-6">
          <h2 class="text-xl font-bold mb-4">รีวิวของคุณ</h2>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">ให้คะแนน</label>
            <StarRating v-model="form.rating" fluid />
          </div>
          <input v-model="form.title" type="text" placeholder="หัวข้อรีวิว (ไม่ใส่ก็ได้)" class="input mb-3" />
          <textarea v-model="form.content" rows="5" placeholder="เขียนความคิดเห็นของคุณ..." class="input mb-3"></textarea>
          <label class="flex items-center gap-2 mb-4 text-sm">
            <input v-model="form.hasSpoiler" type="checkbox" />
            มีเนื้อหาสปอยล์
          </label>
          <div class="flex gap-2">
            <button @click="submitReview" class="btn-primary">ส่งรีวิว</button>
            <button @click="showForm = false" class="btn-outline">ยกเลิก</button>
          </div>
        </section>

        <!-- รีวิว -->
        <section>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl md:text-2xl font-bold">รีวิว <span class="text-gray-400 font-normal">({{ liveStats.reviewCount }})</span></h2>
            <button v-if="!showForm" type="button" class="text-sm text-brand-600 font-medium flex items-center gap-1" @click="openForm">
              <Icon name="pen" class="w-4 h-4" /> เขียนรีวิว
            </button>
          </div>
          <div v-if="m.reviews?.length" class="space-y-4">
            <ReviewCard v-for="r in m.reviews" :key="r.id" :review="r" />
          </div>
          <div v-else class="card p-6 text-center text-gray-500">
            ยังไม่มีรีวิว เป็นคนแรกที่รีวิว{{ isTv ? 'ซีรีส์' : 'หนัง' }}เรื่องนี้!
            <button type="button" class="btn-primary text-sm mt-3 mx-auto" @click="openForm">เขียนรีวิวแรก</button>
          </div>
        </section>

        <!-- นักแสดง (เลื่อนซ้าย-ขวา) -->
        <section v-if="m.cast?.length">
          <h2 class="text-xl md:text-2xl font-bold mb-4">นักแสดง</h2>
          <div class="-mx-4 px-4 flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-none">
            <component
              :is="c.id ? NuxtLink : 'div'"
              v-for="c in m.cast?.slice(0, 15)"
              :key="c.name"
              :to="c.id ? personPath(c.id, c.name) : undefined"
              class="w-24 md:w-28 shrink-0 snap-start text-center group"
            >
              <img
                v-if="c.photoUrl"
                :src="tmdbImg(c.photoUrl, 'w185')"
                :alt="c.name" loading="lazy" width="112" height="112"
                class="w-24 h-24 md:w-28 md:h-28 object-cover rounded-full mb-2 group-hover:ring-4 ring-brand-300 transition"
              />
              <div v-else class="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gray-100 mb-2 flex items-center justify-center text-gray-400"><Icon name="user" class="w-8 h-8" /></div>
              <p class="font-medium text-sm leading-tight line-clamp-2" :class="c.id && 'group-hover:text-brand-600'">{{ c.name }}</p>
              <p class="text-xs text-gray-500 line-clamp-1">{{ c.role }}</p>
            </component>
          </div>
        </section>

        <!-- ข่าวของเรื่องนี้ -->
        <section v-if="news?.items?.length">
          <h2 class="text-xl md:text-2xl font-bold mb-4">ข่าว{{ isTv ? 'ซีรีส์' : 'หนัง' }}เรื่องนี้</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <NewsCard v-for="n in news.items" :key="n.id" :news="n" compact />
          </div>
        </section>
      </div>

      <!-- ===== แถบข้าง ===== -->
      <aside class="space-y-6">
        <div class="hidden lg:block"><WatchProviders :providers="m.watchProviders" :title="m.titleTh || m.title" :is-tv="isTv" /></div>

        <section v-if="facts.length" class="card p-5">
          <h2 class="font-bold mb-3">ข้อมูล{{ isTv ? 'ซีรีส์' : 'หนัง' }}</h2>
          <dl class="space-y-2.5 text-sm">
            <div v-for="f in facts" :key="f.label" class="flex gap-3">
              <dt class="text-gray-500 w-28 shrink-0">{{ f.label }}</dt>
              <dd class="text-gray-800">{{ f.value }}</dd>
            </div>
          </dl>
        </section>

        <section class="card p-5">
          <h2 class="font-bold mb-3">ชวนเพื่อนมาดู</h2>
          <ShareButtons :title="`${m.titleTh || m.title} - ติดจอ`" :path="canonicalPath" content-type="movie" :item-id="m.slug" />
        </section>
      </aside>
    </div>

    <!-- ===== ตัวอย่าง (popup) ===== -->
    <Teleport to="body">
      <div v-if="showTrailer && trailerId" class="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" @click.self="showTrailer = false">
        <div class="w-full max-w-4xl">
          <div class="flex justify-end mb-2">
            <button type="button" class="text-white/80 hover:text-white p-2" aria-label="ปิด" @click="showTrailer = false"><Icon name="x" class="w-7 h-7" /></button>
          </div>
          <div class="aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              :src="`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1&rel=0`"
              title="ตัวอย่าง" class="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen
            />
          </div>
        </div>
      </div>
    </Teleport>
  </article>
</template>

<style scoped>
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
