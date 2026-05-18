<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();
const { data } = await useAsyncData('admin-dashboard', () => api.get<any>('/api/admin/dashboard'));

useSeoMeta({ title: 'Dashboard', robots: 'noindex' });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">📊 Dashboard</h1>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card p-4">
        <p class="text-sm text-gray-500">ผู้ใช้</p>
        <p class="text-3xl font-bold text-brand-600">{{ data?.stats.users || 0 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">หนัง</p>
        <p class="text-3xl font-bold text-brand-600">{{ data?.stats.movies || 0 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">รีวิว</p>
        <p class="text-3xl font-bold text-brand-600">{{ data?.stats.reviews || 0 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">คอมเมนต์</p>
        <p class="text-3xl font-bold text-brand-600">{{ data?.stats.comments || 0 }}</p>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <section class="card p-4">
        <h2 class="font-bold mb-3">🔥 หนังยอดนิยม</h2>
        <ul class="space-y-2">
          <li v-for="m in data?.topMovies" :key="m.id" class="flex justify-between text-sm">
            <NuxtLink :to="`/movies/${m.slug}`" class="hover:text-brand-600">{{ m.title }}</NuxtLink>
            <span class="text-gray-500">⭐ {{ m.averageRating?.toFixed(1) }} · {{ m.reviewCount }} รีวิว</span>
          </li>
        </ul>
      </section>

      <section class="card p-4">
        <h2 class="font-bold mb-3">📝 รีวิวล่าสุด</h2>
        <ul class="space-y-2">
          <li v-for="r in data?.recentReviews" :key="r.id" class="text-sm">
            <span class="font-medium">{{ r.user.displayName }}</span>
            รีวิว <NuxtLink :to="`/movies/${r.movie.slug}`" class="text-brand-600">{{ r.movie.title }}</NuxtLink>
            ({{ r.rating }}/10)
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
