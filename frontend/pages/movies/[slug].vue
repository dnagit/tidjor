<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const auth = useAuthStore();
const api = useApi();

const { data: movie, error } = await useFetch<any>(`/api/movies/slug/${route.params.slug}`, {
  baseURL: config.public.apiBase,
});

if (!movie.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบหนัง' });

const m = movie.value;

// ===== SEO =====
const siteUrl = config.public.siteUrl;
useSeoMeta({
  title: `${m.titleTh || m.title} (${m.releaseDate ? new Date(m.releaseDate).getFullYear() : ''})`,
  description: m.overview || `รีวิวและให้คะแนนหนัง ${m.title}`,
  ogTitle: `${m.titleTh || m.title} - ติดจอ`,
  ogDescription: m.overview,
  ogImage: m.backdropUrl || m.posterUrl,
  twitterCard: 'summary_large_image',
});

// useSchemaOrg([
//   defineMovie({
//     name: m.titleTh || m.title,
//     description: m.overview,
//     image: m.posterUrl,
//     dateCreated: m.releaseDate,
//     director: m.director ? { '@type': 'Person', name: m.director } : undefined,
//     aggregateRating: m.ratingCount > 0 ? {
//       '@type': 'AggregateRating',
//       ratingValue: m.averageRating,
//       ratingCount: m.ratingCount,
//       bestRating: 10,
//       worstRating: 1,
//     } : undefined,
//   }),
// ]);

// ===== Review form =====
const showForm = ref(false);
const form = ref({ rating: 8, title: '', content: '', hasSpoiler: false });

async function submitReview() {
  if (!auth.isAuthenticated) {
    return navigateTo(`/auth/login?next=${route.fullPath}`);
  }
  try {
    await api.post('/api/reviews', { movieId: m.id, ...form.value });
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
  alert('เพิ่มเข้า watchlist แล้ว ⭐');
}
</script>

<template>
  <article>
    <!-- Hero / Backdrop -->
    <div class="relative h-80 bg-gray-900">
      <img v-if="m.backdropUrl" :src="m.backdropUrl" class="w-full h-full object-cover opacity-40" />
      <div class="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
    </div>

    <div class="max-w-6xl mx-auto px-4 -mt-48 relative">
      <div class="flex flex-col md:flex-row gap-8">
        <img
          v-if="m.posterUrl"
          :src="m.posterUrl"
          :alt="m.titleTh || m.title"
          class="w-48 md:w-64 rounded-xl2 shadow-xl"
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
                <span class="text-3xl font-bold">{{ m.averageRating?.toFixed(1) || '-' }}</span>
                <span class="text-gray-500">/10</span>
              </div>
              <p class="text-sm text-gray-500">{{ m.ratingCount }} โหวต</p>
            </div>
            <div class="text-sm text-gray-600">
              <p v-if="m.releaseDate">📅 {{ new Date(m.releaseDate).toLocaleDateString('th-TH') }}</p>
              <p v-if="m.runtime">⏱️ {{ m.runtime }} นาที</p>
              <p v-if="m.director">🎬 {{ m.director }}</p>
            </div>
          </div>

          <p v-if="m.tagline" class="italic text-gray-600 mb-3">"{{ m.tagline }}"</p>
          <p class="leading-relaxed text-gray-700 mb-6">{{ m.overview }}</p>

          <div class="flex gap-3">
            <button class="btn-primary" @click="showForm = !showForm">✍️ เขียนรีวิว</button>
            <button class="btn-outline" @click="toggleWatchlist">⭐ เพิ่มใน Watchlist</button>
            <a v-if="m.trailerUrl" :href="m.trailerUrl" target="_blank" class="btn-ghost">▶️ ดูตัวอย่าง</a>
          </div>
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

      <!-- Reviews -->
      <section class="mt-10">
        <h2 class="text-2xl font-bold mb-4">รีวิว ({{ m.reviewCount }})</h2>
        <div v-if="m.reviews?.length" class="space-y-4">
          <ReviewCard v-for="r in m.reviews" :key="r.id" :review="r" />
        </div>
        <p v-else class="text-gray-500">ยังไม่มีรีวิว เป็นคนแรกที่รีวิวหนังเรื่องนี้!</p>
      </section>

      <!-- Cast -->
      <section v-if="m.cast?.length" class="mt-10 pb-12">
        <h2 class="text-2xl font-bold mb-4">นักแสดง</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div v-for="c in m.cast?.slice(0, 10)" :key="c.name" class="text-center">
            <img v-if="c.photoUrl" :src="c.photoUrl" class="w-full aspect-square object-cover rounded-full mb-2" />
            <p class="font-medium text-sm">{{ c.name }}</p>
            <p class="text-xs text-gray-500">{{ c.role }}</p>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>
