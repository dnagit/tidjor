<script setup lang="ts">
// แถบเมนูล่างจอ (มือถือเท่านั้น) แบบแอป — ค้นหาเปิดเป็นหน้าเต็มจอ
const route = useRoute();
const auth = useAuthStore();
const searchOpen = useState('mobile-search', () => false);

const tabs = computed(() => [
  { to: '/', label: 'หน้าแรก', icon: 'home', active: route.path === '/' },
  { to: null, label: 'ค้นหา', icon: 'search', active: searchOpen.value },
  { to: '/upcoming', label: 'เข้าฉาย', icon: 'calendar', active: route.path.startsWith('/upcoming') },
  { to: '/watchlist', label: 'Watchlist', icon: 'bookmark', active: route.path.startsWith('/watchlist') },
  {
    to: auth.isAuthenticated ? `/u/${auth.user?.username}` : '/auth/login',
    label: auth.isAuthenticated ? 'ฉัน' : 'เข้าสู่ระบบ',
    icon: 'user',
    active: route.path.startsWith('/u/') || route.path.startsWith('/account') || route.path.startsWith('/auth'),
  },
]);
watch(() => route.fullPath, () => { searchOpen.value = false; });
// เปิดค้นหาแล้วล็อกการเลื่อนหน้าด้านหลัง
watch(searchOpen, (v) => { if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''; });
</script>

<template>
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 pb-[env(safe-area-inset-bottom)]" aria-label="เมนูหลัก">
    <ul class="grid grid-cols-5">
      <li v-for="t in tabs" :key="t.label">
        <component
          :is="t.to ? resolveComponent('NuxtLink') : 'button'"
          :to="t.to || undefined" :type="t.to ? undefined : 'button'"
          class="w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition"
          :class="t.active ? 'text-brand-600 font-semibold' : 'text-gray-500'"
          :aria-current="t.active ? 'page' : undefined"
          @click="!t.to && (searchOpen = !searchOpen)"
        >
          <Icon :name="t.icon" :filled="t.active && t.icon === 'bookmark'" class="w-6 h-6" />
          <span class="truncate max-w-full px-1">{{ t.label }}</span>
        </component>
      </li>
    </ul>
  </nav>

  <!-- ค้นหาเต็มจอ -->
  <div v-if="searchOpen" class="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
    <div class="flex items-center gap-2 p-3 border-b">
      <SearchBox class="flex-1" autofocus @done="searchOpen = false" />
      <button type="button" class="p-2 text-gray-500" aria-label="ปิด" @click="searchOpen = false"><Icon name="x" class="w-6 h-6" /></button>
    </div>
    <div class="p-4 text-sm text-gray-500 space-y-3">
      <p>พิมพ์ชื่อไทยหรืออังกฤษก็ได้ พิมพ์ผิดนิดหน่อยก็เจอ</p>
      <div class="flex flex-wrap gap-2">
        <NuxtLink v-for="l in [{ to: '/movies?type=movie', t: 'หนังทั้งหมด' }, { to: '/series', t: 'ซีรีส์ทั้งหมด' }, { to: '/lists', t: 'ลิสต์แนะนำ' }, { to: '/news', t: 'ข่าว' }, { to: '/reviews', t: 'รีวิวล่าสุด' }]"
          :key="l.to" :to="l.to" class="rounded-full border border-gray-200 px-3 py-1.5 text-gray-700">{{ l.t }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
