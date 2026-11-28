<script setup lang="ts">
defineProps<{
  movie: {
    slug: string;
    title: string;
    titleTh?: string;
    posterUrl?: string;
    averageRating?: number;
    releaseDate?: string;
    mediaType?: 'movie' | 'tv';
    numberOfSeasons?: number;
    genres?: { nameTh: string; slug: string }[];
  };
}>();
</script>

<template>
  <NuxtLink :to="mediaPath(movie)" class="card block h-full overflow-hidden hover:shadow-md transition group">
    <div class="aspect-[2/3] bg-gray-100 overflow-hidden relative">
      <span v-if="movie.mediaType === 'tv'" class="absolute top-2 left-2 z-10 text-xs font-medium bg-ink/80 text-white rounded px-1.5 py-0.5">
        ซีรีส์{{ movie.numberOfSeasons ? ` · ${movie.numberOfSeasons} ซีซั่น` : '' }}
      </span>
      <img
        v-if="movie.posterUrl"
        :src="tmdbImg(movie.posterUrl, 'w342')"
        :srcset="tmdbSrcset(movie.posterUrl, [185, 342, 500])"
        sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
        width="342"
        height="513"
        :alt="movie.titleTh || movie.title"
        class="w-full h-full object-cover group-hover:scale-105 transition"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-4xl">🎬</div>
    </div>
    <div class="p-3">
      <h3 class="font-semibold line-clamp-2 leading-tight">
        {{ movie.titleTh || movie.title }}
      </h3>
      <div class="flex items-center justify-between mt-2 text-sm">
        <span v-if="movie.averageRating" class="flex items-center gap-1 text-brand-700 font-medium">
          ⭐ {{ movie.averageRating.toFixed(1) }}
        </span>
        <span v-if="movie.releaseDate" class="text-gray-500 text-xs">
          {{ new Date(movie.releaseDate).getFullYear() }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
