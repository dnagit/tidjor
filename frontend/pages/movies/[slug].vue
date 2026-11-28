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
async function loadMine() {
  const r = await api.get<{ review: any }>(`/api/reviews/mine/${m.id}`).catch(() => null);
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
function openForm() { showForm.value = true; track('open_review_form', mediaParams(m)); }

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

async function toggleWatchlist() {
  if (!auth.isAuthenticated) return navigateTo('/auth/login');
  await api.post('/api/watchlist', { movieId: m.id });
  track('add_to_watchlist', mediaParams(m));
  alert('เพิ่มเข้า watchlist แล้ว ⭐');
}
</script>

<template>
  <article>
    <!-- Hero / Backdrop -->
    <div class="relative h-80 bg-gray-900">
      <!-- ภาพพื้นหลังแสดงจาง (opacity 40) → มือถือได้ w300/w780 แทน w1280 แม้จอความละเอียดสูง -->
      <img
        v-if="m.backdropUrl"
        :src="tmdbImg(m.backdropUrl, 'w1280')"
        :srcset="tmdbSrcset(m.backdropUrl, [300, 780, 1280])"
        sizes="(min-width: 1024px) 100vw, 33vw"
        alt=""
        fetchpriority="high"
        class="w-full h-full object-cover opacity-40"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
    </div>

    <div class="max-w-6xl mx-auto px-4 -mt-48 relative">
      <div class="flex flex-col md:flex-row gap-8">
        <img
          v-if="m.posterUrl"
          :src="tmdbImg(m.posterUrl, 'w342')"
          :srcset="tmdbSrcset(m.posterUrl, [342, 500])"
          sizes="(min-width: 768px) 256px, 192px"
          width="342"
          height="513"
          :alt="m.titleTh || m.title"
          fetchpriority="high"
          class="w-48 md:w-64 h-auto aspect-[2/3] object-cover self-start shrink-0 rounded-xl2 shadow-xl"
        />
        <div class="flex-1 pt-4 md:pt-32">
          <h1 class="text-3xl md:text-4xl font-bold mb-2">{{ m.titleTh || m.title }}</h1>
          <p v-if="m.titleEn && m.titleEn !== m.titleTh" class="text-gray-600 mb-2">{{ m.titleEn }}</p>

          <div class="flex flex-wrap gap-2 mb-4">
            <span v-for="g in m.genres" :key="g.id" class="chip">{{ g.nameTh }}</span>
          </div>

          <div class="flex items-center gap-6 mb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-3xl text-brand-500">⭐</span>
                <span class="text-3xl font-bold">{{ liveStats.ratingCount ? liveStats.averageRating.toFixed(1) : '-' }}</span>
                <span class="text-gray-500">/10</span>
              </div>
              <p class="text-sm text-gray-500">{{ liveStats.ratingCount }} โหวต</p>
            </div>
            <div class="text-sm text-gray-600">
              <p v-if="isTv" class="font-medium">📺 ซีรีส์<template v-if="m.studio"> · {{ m.studio }}</template></p>
              <p v-if="m.releaseDate">📅 {{ isTv ? 'เริ่มออกอากาศ ' : '' }}{{ new Date(m.releaseDate).toLocaleDateString('th-TH') }}</p>
              <p v-if="isTv && m.numberOfSeasons">🗂️ {{ m.numberOfSeasons }} ซีซั่น<template v-if="m.numberOfEpisodes"> · {{ m.numberOfEpisodes }} ตอน</template></p>
              <p v-if="m.runtime">⏱️ {{ m.runtime }} นาที{{ isTv ? '/ตอน' : '' }}</p>
              <p v-if="m.director">🎬 {{ isTv ? 'ผู้สร้าง: ' : '' }}{{ m.director }}</p>
            </div>
          </div>

          <QuickRate :movie="m" :my-rating="myRating" @rated="onRated" @write="openForm" />

          <p v-if="m.tagline" class="italic text-gray-600 mb-3">"{{ m.tagline }}"</p>
          <p class="leading-relaxed text-gray-700 mb-6">{{ m.overview }}</p>

          <WatchProviders :providers="m.watchProviders" :title="m.titleTh || m.title" :is-tv="isTv" />

          <div class="flex gap-3">
            <button class="btn-primary" @click="showForm ? (showForm = false) : openForm()">✍️ {{ form.content ? 'แก้ไขรีวิว' : 'เขียนรีวิว' }}</button>
            <button class="btn-outline" @click="toggleWatchlist">⭐ เพิ่มใน Watchlist</button>
            <a v-if="m.trailerUrl" :href="m.trailerUrl" target="_blank" rel="noopener" class="btn-ghost" @click="track('view_trailer', mediaParams(m))">▶️ ดูตัวอย่าง</a>
          </div>
          <ShareButtons class="mt-4" :title="`${m.titleTh || m.title} - ติดจอ`" :path="canonicalPath" content-type="movie" :item-id="m.slug" />
        </div>
      </div>

      <!-- Review form -->
      <section v-if="showForm" class="card p-6 mt-8">
        <h2 class="text-xl font-bold mb-4">รีวิวของคุณ</h2>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">ให้คะแนน</label>
          <StarRating v-model="form.rating" size="lg" />
        </div>
        <input v-model="form.title" type="text" placeholder="หัวข้อรีวิว (optional)" class="input mb-3" />
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

      <!-- ข่าวของเรื่องนี้ -->
      <section v-if="news?.items?.length" class="mt-10">
        <h2 class="text-2xl font-bold mb-4">ข่าว{{ isTv ? 'ซีรีส์' : 'หนัง' }}เรื่องนี้</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NewsCard v-for="n in news.items" :key="n.id" :news="n" compact />
        </div>
      </section>

      <!-- Reviews -->
      <section class="mt-10">
        <h2 class="text-2xl font-bold mb-4">รีวิว ({{ liveStats.reviewCount }})</h2>
        <div v-if="m.reviews?.length" class="space-y-4">
          <ReviewCard v-for="r in m.reviews" :key="r.id" :review="r" />
        </div>
        <p v-else class="text-gray-500">ยังไม่มีรีวิว เป็นคนแรกที่รีวิวหนังเรื่องนี้!</p>
      </section>

      <!-- Cast -->
      <section v-if="m.cast?.length" class="mt-10 pb-12">
        <h2 class="text-2xl font-bold mb-4">นักแสดง</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <component
            :is="c.id ? NuxtLink : 'div'"
            v-for="c in m.cast?.slice(0, 10)"
            :key="c.name"
            :to="c.id ? personPath(c.id, c.name) : undefined"
            class="text-center group"
          >
            <img
              v-if="c.photoUrl"
              :src="tmdbImg(c.photoUrl, 'w185')"
              :alt="c.name"
              loading="lazy"
              class="w-full aspect-square object-cover rounded-full mb-2 group-hover:ring-4 ring-brand-300 transition"
            />
            <p class="font-medium text-sm" :class="c.id && 'group-hover:text-brand-600'">{{ c.name }}</p>
            <p class="text-xs text-gray-500">{{ c.role }}</p>
          </component>
        </div>
      </section>
    </div>
  </article>
</template>
