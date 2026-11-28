<script setup lang="ts">
// ดูได้ที่ไหนในไทย — ข้อมูล JustWatch ผ่าน TMDB (ต้องให้เครดิต JustWatch ตามเงื่อนไข TMDB)
const props = defineProps<{ providers: any; title: string; isTv?: boolean }>();
const groups = computed(() => [
  { key: 'stream', label: 'สตรีมมิง (สมาชิก)' },
  { key: 'free', label: 'ดูฟรี' },
  { key: 'rent', label: 'เช่า' },
  { key: 'buy', label: 'ซื้อ' },
].filter((g) => props.providers?.[g.key]?.length));
</script>

<template>
  <section v-if="groups.length" class="card p-4 mb-6">
    <h2 class="font-bold mb-3">📺 {{ title }} ดูได้ที่ไหน</h2>
    <div class="space-y-3">
      <div v-for="g in groups" :key="g.key" class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-gray-500 w-32 shrink-0">{{ g.label }}</span>
        <a
          v-for="p in providers[g.key]" :key="p.name"
          :href="providers.link || undefined" target="_blank" rel="noopener nofollow"
          class="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg pr-3 text-sm"
          @click="track('click_watch_provider', { provider: p.name, type: g.key })"
        >
          <img v-if="p.logo" :src="p.logo" width="32" height="32" loading="lazy" alt="" class="w-8 h-8 rounded-lg" />
          <span>{{ p.name }}</span>
        </a>
      </div>
    </div>
    <p class="text-xs text-gray-400 mt-3">ข้อมูลในประเทศไทยจาก JustWatch · อาจเปลี่ยนแปลงได้ ควรตรวจสอบกับแพลตฟอร์มอีกครั้ง</p>
  </section>
</template>
