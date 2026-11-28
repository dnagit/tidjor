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
    <header class="flex items-start gap-3 mb-3">
      <img v-if="review.user.avatarUrl" :src="review.user.avatarUrl" alt="" class="w-10 h-10 rounded-full shrink-0 object-cover" />
      <div v-else class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">
        {{ review.user.displayName?.[0]?.toUpperCase() }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NuxtLink :to="`/u/${review.user.username}`" class="font-semibold hover:text-brand-600 truncate">
            {{ review.user.displayName }}
          </NuxtLink>
          <AiBadge v-if="review.user.isBot" />
        </div>
        <p class="text-xs text-gray-500">
          {{ new Date(review.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
      </div>
      <div class="flex flex-col items-end gap-0.5 shrink-0">
        <span class="font-bold text-brand-700 whitespace-nowrap">★ {{ review.rating }}<span class="text-xs text-gray-500 font-normal">/10</span></span>
        <!-- ดาว 10 ดวงแสดงเฉพาะจอกว้าง (มือถือแคบเกิน) -->
        <StarRating :model-value="review.rating" readonly size="sm" class="hidden sm:inline-flex" />
      </div>
    </header>

    <h4 v-if="review.title" class="font-bold mb-1 break-words">{{ review.title }}</h4>

    <div v-if="review.hasSpoiler && !showSpoiler" class="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
      ⚠️ รีวิวนี้มีเนื้อหาสปอยล์
      <button @click="showSpoiler = true" class="ml-2 underline text-brand-600">แสดงเนื้อหา</button>
    </div>
    <p v-else class="text-gray-700 whitespace-pre-line leading-relaxed break-words">{{ review.content }}</p>

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
