<script setup lang="ts">
// แถวหนัง/ซีรีส์แบบปัดซ้าย-ขวา (มือถือปัด / เดสก์ท็อปมีปุ่มลูกศร)
const props = defineProps<{ title: string; icon?: string; to?: string; items: any[]; showDate?: boolean }>();
const scroller = ref<HTMLElement | null>(null);
const atStart = ref(true);
const atEnd = ref(false);
function update() {
  const el = scroller.value;
  if (!el) return;
  atStart.value = el.scrollLeft < 8;
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
}
function page(dir: number) {
  const el = scroller.value;
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
}
onMounted(update);
const thDay = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
</script>

<template>
  <section v-if="props.items?.length" class="max-w-7xl mx-auto px-4 py-6 md:py-8">
    <div class="flex items-center justify-between gap-3 mb-3 md:mb-4">
      <h2 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon v-if="icon" :name="icon" class="w-6 h-6 text-brand-500" />{{ title }}
      </h2>
      <div class="flex items-center gap-1 shrink-0">
        <NuxtLink v-if="to" :to="to" class="text-sm text-brand-600 font-medium hover:underline mr-1 md:mr-2">ดูทั้งหมด</NuxtLink>
        <button type="button" class="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30" :disabled="atStart" aria-label="ก่อนหน้า" @click="page(-1)">
          <Icon name="chevron" class="w-4 h-4 rotate-180" />
        </button>
        <button type="button" class="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30" :disabled="atEnd" aria-label="ถัดไป" @click="page(1)">
          <Icon name="chevron" class="w-4 h-4" />
        </button>
      </div>
    </div>
    <div ref="scroller" class="-mx-4 px-4 flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 scrollbar-none" @scroll.passive="update">
      <div v-for="m in items" :key="m.id" class="w-[38%] sm:w-[28%] md:w-[22%] lg:w-[15.5%] shrink-0 snap-start">
        <p v-if="showDate && m.releaseDate" class="text-xs font-semibold text-brand-600 mb-1">{{ thDay(m.releaseDate) }}</p>
        <MovieCard :movie="m" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
