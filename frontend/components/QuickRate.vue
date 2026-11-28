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
  <div class="card p-4 mb-6">
    <div class="flex items-baseline justify-between gap-2 mb-1">
      <p class="font-semibold">{{ rating ? 'คะแนนของคุณ' : `ดู${movie.mediaType === 'tv' ? 'ซีรีส์' : 'หนัง'}เรื่องนี้แล้ว? ให้คะแนนเลย` }}</p>
      <span v-if="rating" class="text-brand-700 font-bold tabular-nums shrink-0">{{ rating }}/10</span>
    </div>
    <StarRating :model-value="rating" fluid :show-value="false" @update:model-value="rate" />
    <p v-if="saved" class="text-sm text-green-700 mt-2">
      ✓ บันทึก {{ rating }}/10 แล้ว ·
      <button type="button" class="underline text-brand-600" @click="emit('write')">เขียนรีวิวเพิ่ม</button>
    </p>
    <p v-else class="text-xs text-gray-500 mt-1">กดดาวครั้งเดียว ไม่ต้องเขียนข้อความ{{ saving ? ' · กำลังบันทึก...' : '' }}</p>
  </div>
</template>
