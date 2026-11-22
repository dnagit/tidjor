<script setup lang="ts">
defineProps<{
  review: {
    id: string;
    rating: number;
    title?: string;
    content: string;
    hasSpoiler: boolean;
    likeCount: number;
    createdAt: string;
    sources?: { name: string; url: string }[] | null;
    user: { username: string; displayName: string; avatarUrl?: string; isBot?: boolean };
  };
}>();
const showSpoiler = ref(false);
</script>

<template>
  <article class="card p-4">
    <header class="flex items-center gap-3 mb-3">
      <img v-if="review.user.avatarUrl" :src="review.user.avatarUrl" class="w-10 h-10 rounded-full" />
      <div v-else class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold">
        {{ review.user.displayName?.[0]?.toUpperCase() }}
      </div>
      <div class="flex-1">
        <NuxtLink :to="`/u/${review.user.username}`" class="font-semibold hover:text-brand-600">
          {{ review.user.displayName }}
        </NuxtLink>
        <AiBadge v-if="review.user.isBot" class="ml-2" />
        <p class="text-xs text-gray-500">
          {{ new Date(review.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
      </div>
      <div class="flex flex-col items-end gap-0.5">
        <span class="font-bold text-brand-700">★ {{ review.rating }}<span class="text-xs text-gray-500 font-normal">/10</span></span>
        <StarRating :model-value="review.rating" readonly size="sm" />
      </div>
    </header>

    <h4 v-if="review.title" class="font-bold mb-1">{{ review.title }}</h4>

    <div v-if="review.hasSpoiler && !showSpoiler" class="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
      ⚠️ รีวิวนี้มีเนื้อหาสปอยล์
      <button @click="showSpoiler = true" class="ml-2 underline text-brand-600">แสดงเนื้อหา</button>
    </div>
    <p v-else class="text-gray-700 whitespace-pre-line leading-relaxed">{{ review.content }}</p>

    <p v-if="review.sources?.length" class="mt-3 text-xs text-gray-500">
      อ้างอิงจาก:
      <template v-for="(s, i) in review.sources" :key="s.url">
        <a :href="s.url" target="_blank" rel="noopener nofollow" class="underline hover:text-brand-600">{{ s.name }}</a><span v-if="i < review.sources.length - 1">, </span>
      </template>
    </p>

    <footer class="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-gray-500">
      <button class="hover:text-brand-600">👍 ถูกใจ ({{ review.likeCount }})</button>
      <button class="hover:text-brand-600">💬 คอมเมนต์</button>
    </footer>
  </article>
</template>
