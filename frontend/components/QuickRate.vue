<script setup lang="ts">
// ให้คะแนนในคลิกเดียว (ไม่ต้องเขียนรีวิว) — กดดาวแล้วบันทึกทันที
const props = defineProps<{ movie: any; myRating?: number | null }>();
const emit = defineEmits<{ (e: 'rated', rating: number, stats?: any): void; (e: 'write'): void }>();
const auth = useAuthStore();
const api = useApi();
const route = useRoute();
const rating = ref(props.myRating || 0);
const saving = ref(false);
const saved = ref(false);
const showInvite = ref(false);
const name = computed(() => props.movie.titleTh || props.movie.title);
const inviteText = computed(() => `${name.value} เรื่องนี้ให้กี่ดาว? มาให้คะแนนกันหน่อย ⭐`);

// เปิดมาจากลิงก์ชวนให้คะแนน (#rate) → ไฮไลต์กล่องนี้สักครู่ให้รู้ว่าต้องกดตรงไหน
const highlight = ref(false);
onMounted(() => {
  if (location.hash !== '#rate') return;
  highlight.value = true;
  track('open_rate_invite', mediaParams(props.movie));
  // เลื่อนมากลางจอ (หัวเว็บแบบ sticky จะไม่บัง)
  setTimeout(() => document.getElementById('rate')?.scrollIntoView({ block: 'center' }), 150);
  setTimeout(() => (highlight.value = false), 4000);
});
watch(() => props.myRating, (v) => { if (v) rating.value = v; });

async function rate(n: number) {
  if (!auth.isAuthenticated) return navigateTo(`/auth/login?next=${encodeURIComponent(route.fullPath)}`);
  rating.value = n;
  saving.value = true;
  try {
    const r = await api.post<any>('/api/reviews', { movieId: props.movie.id, rating: n });
    saved.value = true;
    track('rate', { ...mediaParams(props.movie), rating: n });
    emit('rated', n, r?.movieStats);
  } finally { saving.value = false; }
}
</script>

<template>
  <div class="card p-4 mb-6 transition duration-500" :class="highlight && 'ring-4 ring-brand-300 bg-brand-50'">
    <div class="flex items-baseline justify-between gap-2 mb-1">
      <p class="font-semibold">{{ rating ? 'คะแนนของคุณ' : `ดู${movie.mediaType === 'tv' ? 'ซีรีส์' : 'หนัง'}เรื่องนี้แล้ว? ให้คะแนนเลย` }}</p>
      <span v-if="rating" class="text-brand-700 font-bold tabular-nums shrink-0">{{ rating }}/10</span>
    </div>
    <StarRating :model-value="rating" fluid :show-value="false" @update:model-value="rate" />
    <p v-if="saved" class="text-sm text-green-700 mt-2">
      ✓ บันทึก {{ rating }}/10 แล้ว ·
      <button type="button" class="underline text-brand-600" @click="emit('write')">เขียนรีวิวเพิ่ม</button>
    </p>
    <p v-else class="text-xs text-gray-500 mt-1">{{ highlight ? '👆 แตะดาวเพื่อให้คะแนนได้เลย' : 'กดดาวครั้งเดียว ไม่ต้องเขียนข้อความ' }}{{ saving ? ' · กำลังบันทึก...' : '' }}</p>

    <div class="mt-3 pt-3 border-t border-gray-100">
      <button v-if="!showInvite" type="button" class="text-sm text-brand-700 font-medium flex items-center gap-1.5" @click="showInvite = true">
        <Icon name="share" class="w-4 h-4" /> ชวนเพื่อนมาให้คะแนน
      </button>
      <div v-else>
        <p class="text-xs text-gray-500 mb-2">เพื่อนเปิดลิงก์แล้วจะเจอช่องให้ดาวทันที</p>
        <ShareButtons :title="`${name} - ติดจอ`" :path="mediaPath(movie)" hash="#rate" :text="inviteText" content-type="rate_invite" :item-id="movie.slug" />
      </div>
    </div>
  </div>
</template>
