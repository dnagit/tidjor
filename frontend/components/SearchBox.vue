<script setup lang="ts">
// ช่องค้นหาแบบพิมพ์ไปแนะนำไป — ทนพิมพ์ผิด พิมพ์ไทยหาชื่ออังกฤษได้ (ค้นจาก /api/movies/suggest)
// ↑↓ เลือก · Enter เปิดเรื่องที่เลือก / ค้นหาทั้งหมด · Esc ปิด
const props = withDefaults(defineProps<{ placeholder?: string; autofocus?: boolean }>(), {
  placeholder: 'ค้นหาหนัง ซีรีส์ (ไทย/อังกฤษ)',
});
const emit = defineEmits<{ (e: 'done'): void }>();
const config = useRuntimeConfig();
const router = useRouter();
const q = ref('');
const items = ref<any[]>([]);
const open = ref(false);
const active = ref(-1);
const loading = ref(false);
let seq = 0;

const fetchSuggest = useDebounceFn(async (term: string) => {
  const my = ++seq;
  if (!term.trim()) { items.value = []; loading.value = false; return; }
  try {
    const r = await $fetch<{ items: any[] }>('/api/movies/suggest', { baseURL: config.public.apiBase, query: { q: term } });
    if (my === seq) { items.value = r.items; active.value = -1; }
  } catch { /* ignore */ } finally { if (my === seq) loading.value = false; }
}, 200);
watch(q, (v) => { loading.value = !!v.trim(); open.value = true; fetchSuggest(v); });

function go(m: any) {
  track('search', { search_term: q.value.trim(), search_from: 'suggest', item_id: m.slug });
  open.value = false; q.value = ''; items.value = [];
  emit('done');
  router.push(mediaPath(m));
}
function submit() {
  if (active.value >= 0 && items.value[active.value]) return go(items.value[active.value]);
  const term = q.value.trim();
  if (!term) return;
  track('search', { search_term: term, search_from: 'header' });
  open.value = false;
  emit('done');
  router.push({ path: '/movies', query: { q: term } });
}
function move(d: number) {
  if (!items.value.length) return;
  open.value = true;
  active.value = (active.value + d + items.value.length) % items.value.length;
}
const year = (d?: string) => (d ? new Date(d).getFullYear() : '');
const close = () => setTimeout(() => (open.value = false), 150); // ให้คลิกรายการทันก่อนปิด
</script>

<template>
  <form class="relative" role="search" @submit.prevent="submit">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
    <input
      v-model="q" type="search" :placeholder="props.placeholder" :autofocus="autofocus"
      class="input w-full pl-9" autocomplete="off" aria-label="ค้นหา"
      @focus="open = true" @blur="close" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.esc="open = false"
    />
    <div v-if="open && q.trim()" class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
      <button
        v-for="(m, i) in items" :key="m.id" type="button"
        class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
        :class="i === active && 'bg-brand-50'"
        @mousedown.prevent="go(m)"
      >
        <img v-if="m.posterUrl" :src="tmdbImg(m.posterUrl, 'w92')" width="32" height="48" alt="" class="w-8 h-12 object-cover rounded shrink-0" />
        <div v-else class="w-8 h-12 rounded bg-gray-100 shrink-0" />
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">{{ m.titleTh || m.title }}</p>
          <p class="text-xs text-gray-500 truncate">
            {{ m.mediaType === 'tv' ? 'ซีรีส์' : 'หนัง' }}<template v-if="year(m.releaseDate)"> · {{ year(m.releaseDate) }}</template>
            <template v-if="m.titleEn && m.titleEn !== (m.titleTh || m.title)"> · {{ m.titleEn }}</template>
          </p>
        </div>
      </button>
      <p v-if="!items.length && !loading" class="px-3 py-3 text-sm text-gray-500">ไม่เจอเรื่องที่ตรง ลองพิมพ์ชื่ออื่นหรือภาษาอื่น</p>
      <button type="button" class="w-full px-3 py-2.5 text-left text-sm text-brand-700 font-medium border-t hover:bg-gray-50" @mousedown.prevent="submit">
        ดูผลค้นหาทั้งหมดของ “{{ q.trim() }}” →
      </button>
    </div>
  </form>
</template>
