<script setup lang="ts">
// แจ้งเตือนในเว็บ — เรื่องใน Watchlist เข้าฉาย / มาลงสตรีมมิง (โหลดใหม่ทุกครั้งที่เปลี่ยนหน้า)
const api = useApi();
const route = useRoute();
const open = ref(false);
const items = ref<any[]>([]);
const unread = ref(0);

async function load() {
  const r = await api.get<{ items: any[]; unread: number }>('/api/notifications').catch(() => null);
  if (r) { items.value = r.items; unread.value = r.unread; }
}
onMounted(load);
watch(() => route.path, () => { open.value = false; load(); });

async function toggle() {
  open.value = !open.value;
  if (open.value && unread.value) {
    unread.value = 0;
    await api.post('/api/notifications/read').catch(() => {});
  }
}
const ago = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
</script>

<template>
  <div class="relative">
    <button type="button" class="relative p-2 rounded-lg hover:bg-gray-100" aria-label="แจ้งเตือน" @click="toggle">
      <span class="text-xl leading-none">🔔</span>
      <span v-if="unread" class="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
        {{ unread > 9 ? '9+' : unread }}
      </span>
    </button>
    <div v-if="open" class="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
      <p class="px-4 py-3 font-semibold border-b">แจ้งเตือน</p>
      <div class="max-h-96 overflow-y-auto">
        <NuxtLink v-for="n in items" :key="n.id" :to="n.url || '/watchlist'" class="flex gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-0" :class="!n.isRead && 'bg-brand-50/50'">
          <img v-if="n.imageUrl" :src="tmdbImg(n.imageUrl, 'w92')" width="40" height="60" alt="" class="w-10 h-14 object-cover rounded shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-medium leading-snug">{{ n.title }}</p>
            <p v-if="n.body" class="text-xs text-gray-500 mt-0.5">{{ n.body }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ ago(n.createdAt) }}</p>
          </div>
        </NuxtLink>
        <p v-if="!items.length" class="px-4 py-6 text-sm text-gray-500 text-center">
          ยังไม่มีแจ้งเตือน<br />
          <span class="text-xs">เพิ่มเรื่องที่รอดูใน Watchlist แล้วเราจะบอกเมื่อเข้าฉายหรือมาลงสตรีมมิง</span>
        </p>
      </div>
    </div>
  </div>
</template>
