<script setup lang="ts">
const { reset } = useConsent();
</script>

<template>
  <footer class="bg-white border-t border-gray-200 py-8 mt-12">
    <div class="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
      <p class="font-display text-lg font-bold text-brand-600 mb-2">🎬 ติดจอ</p>
      <p>แพลตฟอร์มรีวิวหนังโดยคนไทย เพื่อคนไทย</p>
      <nav class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        <NuxtLink to="/upcoming" class="hover:text-brand-600">เข้าฉายเร็ว ๆ นี้</NuxtLink>
        <NuxtLink to="/news" class="hover:text-brand-600">ข่าว</NuxtLink>
        <NuxtLink to="/lists" class="hover:text-brand-600">แนะนำหนังและซีรีส์</NuxtLink>
        <NuxtLink to="/privacy" class="hover:text-brand-600">นโยบายความเป็นส่วนตัว</NuxtLink>
        <button type="button" class="hover:text-brand-600" @click="reset()">ตั้งค่าคุกกี้</button>
      </nav>
      <p class="mt-3 text-xs">ข้อมูลหนังและภาพจาก TMDB · ข้อมูลดูได้ที่ไหนจาก JustWatch</p>
      <p class="mt-2">© {{ new Date().getFullYear() }} Tid Jor. All rights reserved.</p>
    </div>
  </footer>
</template>
