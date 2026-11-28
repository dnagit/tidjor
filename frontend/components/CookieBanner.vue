<script setup lang="ts">
const { consent, ready, set } = useConsent();
</script>

<template>
  <div
    v-if="ready && consent === null"
    role="dialog" aria-label="การใช้คุกกี้"
    class="fixed bottom-16 md:bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
  >
    <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center gap-3">
      <p class="text-sm text-gray-700 flex-1">
        เว็บไซต์นี้ใช้คุกกี้ที่จำเป็นเพื่อให้ระบบทำงาน และขออนุญาตใช้คุกกี้วิเคราะห์ (Google Analytics) เพื่อดูว่าผู้ใช้ใช้งานเว็บอย่างไรและนำไปปรับปรุง
        <NuxtLink to="/privacy" class="text-brand-600 underline">อ่านนโยบายความเป็นส่วนตัว</NuxtLink>
      </p>
      <div class="flex gap-2 shrink-0">
        <button class="btn-outline text-sm flex-1 md:flex-none" @click="set('necessary')">เฉพาะที่จำเป็น</button>
        <button class="btn-primary text-sm flex-1 md:flex-none" @click="set('all')">ยอมรับทั้งหมด</button>
      </div>
    </div>
  </div>
</template>
