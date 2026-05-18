<script setup lang="ts">
const auth = useAuthStore();
const search = ref('');
const router = useRouter();

function submitSearch() {
  if (search.value.trim()) {
    router.push({ path: '/movies', query: { q: search.value.trim() } });
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
      <NuxtLink to="/" class="flex items-center gap-2">
        <span class="text-2xl">🎬</span>
        <span class="font-display text-2xl font-bold text-brand-600">ติดจอ</span>
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-1 ml-4">
        <NuxtLink to="/movies" class="btn-ghost text-sm">หนังทั้งหมด</NuxtLink>
        <NuxtLink to="/movies?sort=popularity" class="btn-ghost text-sm">ยอดนิยม</NuxtLink>
        <NuxtLink to="/reviews" class="btn-ghost text-sm">รีวิวล่าสุด</NuxtLink>
      </nav>

      <form @submit.prevent="submitSearch" class="flex-1 max-w-md ml-auto">
        <input
          v-model="search"
          type="search"
          placeholder="ค้นหาหนัง..."
          class="input"
        />
      </form>

      <div class="flex items-center gap-2">
        <template v-if="auth.isAuthenticated">
          <NuxtLink v-if="auth.isModerator" to="/admin" class="btn-outline text-sm">Admin</NuxtLink>
          <NuxtLink to="/watchlist" class="btn-ghost text-sm hidden sm:inline-flex">⭐ Watchlist</NuxtLink>
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
    </div>
  </header>
</template>
