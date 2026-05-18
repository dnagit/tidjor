<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();

const { data, error } = await useFetch<any>(`/api/users/profile/${route.params.username}`, {
  baseURL: config.public.apiBase,
});

if (!data.value) throw createError({ statusCode: 404 });

const u = data.value.user;
useSeoMeta({
  title: `${u.displayName} (@${u.username})`,
  description: u.bio || `รีวิวหนังโดย ${u.displayName} บนติดจอ`,
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <header class="card p-6 flex items-center gap-6 mb-6">
      <img v-if="u.avatarUrl" :src="u.avatarUrl" class="w-24 h-24 rounded-full" />
      <div v-else class="w-24 h-24 rounded-full bg-brand-500 text-white flex items-center justify-center text-3xl font-bold">
        {{ u.displayName?.[0]?.toUpperCase() }}
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold">{{ u.displayName }}</h1>
        <p class="text-gray-500">@{{ u.username }}</p>
        <p v-if="u.bio" class="mt-2">{{ u.bio }}</p>
        <div class="flex gap-4 mt-3 text-sm">
          <span><b>{{ u._count.reviews }}</b> รีวิว</span>
          <span><b>{{ u._count.comments }}</b> คอมเมนต์</span>
          <span><b>{{ u._count.watchlist }}</b> Watchlist</span>
        </div>
      </div>
    </header>

    <h2 class="text-xl font-bold mb-4">รีวิวของ {{ u.displayName }}</h2>
    <div class="space-y-4">
      <div v-for="r in data.reviews" :key="r.id" class="card p-4 flex gap-4">
        <NuxtLink :to="`/movies/${r.movie.slug}`" class="shrink-0">
          <img v-if="r.movie.posterUrl" :src="r.movie.posterUrl" class="w-20 h-28 object-cover rounded" />
        </NuxtLink>
        <div class="flex-1">
          <NuxtLink :to="`/movies/${r.movie.slug}`" class="font-semibold hover:text-brand-600">
            {{ r.movie.titleTh || r.movie.title }}
          </NuxtLink>
          <StarRating :model-value="r.rating" readonly size="sm" />
          <p class="text-sm text-gray-700 mt-1 line-clamp-3">{{ r.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
