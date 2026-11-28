<script setup lang="ts">
// ไอคอนชุดเดียวกันทั้งเว็บ (เส้น 2px สไตล์ Lucide) — ใช้แทนอีโมจิ
// <Icon name="star" class="w-5 h-5" />  · filled = เติมสี (เช่น ดาว/bookmark ที่เลือกแล้ว)
const props = defineProps<{ name: string; filled?: boolean }>();
const PATHS: Record<string, string[]> = {
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  check: ['M20 6L9 17l-5-5'],
  play: ['M6 4l14 8-14 8z'],
  share: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  pen: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  home: ['M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  tv: ['M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z', 'M17 2l-5 5-5-5'],
  film: ['M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M7 3v18', 'M17 3v18', 'M3 8h4', 'M3 16h4', 'M17 8h4', 'M17 16h4'],
  layers: ['M12 2l10 5-10 5L2 7z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20', 'M12 2a15 15 0 0 0 0 20'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  chevron: ['M9 18l6-6-6-6'],
  news: ['M4 4h13a1 1 0 0 1 1 1v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z', 'M18 8h2a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2', 'M8 8h6', 'M8 12h6', 'M8 16h4'],
};
const paths = computed(() => PATHS[props.name] || []);
</script>

<template>
  <svg viewBox="0 0 24 24" :fill="filled ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="inline-block shrink-0">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
