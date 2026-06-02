<script setup lang="ts">
const auth = useAuthStore();
const search = ref('');
const router = useRouter();
const route = useRoute();
const mobileOpen = ref(false);

function submitSearch() {
  if (search.value.trim()) {
    router.push({ path: '/movies', query: { q: search.value.trim() } });
    mobileOpen.value = false;
  }
}

async function doLogout() {
  mobileOpen.value = false;
  await auth.logout();
}

// ปิดเมนูมือถืออัตโนมัติเมื่อเปลี่ยนหน้า
watch(() => route.fullPath, () => { mobileOpen.value = false; });
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 shrink-0" @click="mobileOpen = false">
        <span class="text-2xl">🎬</span>
        <span class="font-display text-2xl font-bold text-brand-600">ติดจอ</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-1 ml-4">
        <NuxtLink to="/movies" class="btn-ghost text-sm">หนังทั้งหมด</NuxtLink>
        <NuxtLink to="/movies?sort=popularity" class="btn-ghost text-sm">ยอดนิยม</NuxtLink>
        <NuxtLink to="/reviews" class="btn-ghost text-sm">รีวิวล่าสุด</NuxtLink>
      </nav>

      <!-- Desktop search -->
      <form @submit.prevent="submitSearch" class="hidden md:block flex-1 max-w-md ml-auto">
        <input v-model="search" type="search" placeholder="ค้นหาหนัง..." class="input" />
      </form>

      <!-- Desktop auth -->
      <div class="hidden md:flex items-center gap-2">
        <template v-if="auth.isAuthenticated">
          <NuxtLink v-if="auth.isModerator" to="/admin" class="btn-outline text-sm">Admin</NuxtLink>
          <NuxtLink to="/watchlist" class="btn-ghost text-sm">⭐ Watchlist</NuxtLink>
          <NuxtLink :to="`/u/${auth.user?.username}`" class="flex items-center gap-2">
            <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" class="w-8 h-8 rounded-full" />
            <div v-else class="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">
              {{ auth.user?.displayName?.[0]?.toUpperCase() }}
            </div>
          </NuxtLink>
          <button @click="auth.logout()" class="btn-ghost text-sm">ออก</button>
        </template>
        <template v-else>
          <NuxtLink to="/auth/login" class="btn-ghost text-sm">เข้าสู่ระบบ</NuxtLink>
          <NuxtLink to="/auth/register" class="btn-primary text-sm">สมัคร</NuxtLink>
        </template>
      </div>

      <!-- Mobile: hamburger -->
      <button
        class="md:hidden ml-auto -mr-2 p-2 text-gray-700 rounded-lg hover:bg-gray-100"
        :aria-expanded="mobileOpen"
        aria-label="เมนู"
        @click="mobileOpen = !mobileOpen"
      >
        <svg v-if="!mobileOpen" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Mobile panel -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="mobileOpen" class="md:hidden border-t border-gray-200 bg-white shadow-lg">
        <div class="px-4 py-4 space-y-4">
          <!-- Search -->
          <form @submit.prevent="submitSearch">
            <input v-model="search" type="search" placeholder="ค้นหาหนัง..." class="input w-full" />
          </form>

          <!-- Nav links (ปุ่มใหญ่ กดง่าย) -->
          <nav class="flex flex-col">
            <NuxtLink to="/movies" class="py-3.5 border-b border-gray-100 text-gray-800 font-medium" @click="mobileOpen = false">
              🎬 หนังทั้งหมด
            </NuxtLink>
            <NuxtLink to="/movies?sort=popularity" class="py-3.5 border-b border-gray-100 text-gray-800 font-medium" @click="mobileOpen = false">
              🔥 ยอดนิยม
            </NuxtLink>
            <NuxtLink to="/reviews" class="py-3.5 border-b border-gray-100 text-gray-800 font-medium" @click="mobileOpen = false">
              ✍️ รีวิวล่าสุด
            </NuxtLink>
          </nav>

          <!-- Auth -->
          <div>
            <template v-if="auth.isAuthenticated">
              <NuxtLink :to="`/u/${auth.user?.username}`" class="flex items-center gap-3 py-2" @click="mobileOpen = false">
                <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" class="w-10 h-10 rounded-full" />
                <div v-else class="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold">
                  {{ auth.user?.displayName?.[0]?.toUpperCase() }}
                </div>
                <div class="leading-tight">
                  <p class="font-semibold text-gray-800">{{ auth.user?.displayName }}</p>
                  <p class="text-xs text-gray-500">ดูโปรไฟล์</p>
                </div>
              </NuxtLink>
              <NuxtLink to="/watchlist" class="block py-3.5 border-t border-gray-100 text-gray-800" @click="mobileOpen = false">
                ⭐ Watchlist
              </NuxtLink>
              <NuxtLink v-if="auth.isModerator" to="/admin" class="block py-3.5 border-t border-gray-100 text-gray-800" @click="mobileOpen = false">
                ⚙️ ระบบหลังบ้าน (Admin)
              </NuxtLink>
              <button @click="doLogout" class="block w-full text-left py-3.5 border-t border-gray-100 text-red-600">
                ออกจากระบบ
              </button>
            </template>
            <template v-else>
              <div class="grid grid-cols-2 gap-2">
                <NuxtLink to="/auth/login" class="btn-outline justify-center py-3" @click="mobileOpen = false">เข้าสู่ระบบ</NuxtLink>
                <NuxtLink to="/auth/register" class="btn-primary justify-center py-3" @click="mobileOpen = false">สมัคร</NuxtLink>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>
