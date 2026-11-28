<script setup lang="ts">
const config = useRuntimeConfig();
const { data } = await useFetch<{ items: any[] }>('/api/lists', { baseURL: config.public.apiBase });
useSeoMeta({
  title: 'แนะนำหนังและซีรีส์น่าดู รวมทุกแนว',
  description: 'รวมลิสต์หนังและซีรีส์น่าดู หนังผีไทย ซีรีส์เกาหลี อนิเมะ หนังแอ็กชัน หนังรัก พร้อมเรื่องย่อและดูได้ที่ไหน อัปเดตทุกสัปดาห์',
  ogTitle: 'แนะนำหนังและซีรีส์น่าดู - ติดจอ',
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-2">🏆 แนะนำหนังและซีรีส์น่าดู</h1>
    <p class="text-gray-600 mb-6">รวมลิสต์ตามแนว อัปเดตทุกสัปดาห์ พร้อมบอกว่าดูได้ที่ไหน</p>
    <div v-if="data?.items?.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink v-for="l in data.items" :key="l.id" :to="`/lists/${l.slug}`" class="card overflow-hidden flex flex-col hover:shadow-md transition group">
        <div class="aspect-video bg-gray-100 overflow-hidden">
          <img v-if="l.coverUrl" :src="tmdbImg(l.coverUrl, 'w780')" width="780" height="439" loading="lazy" alt="" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        </div>
        <div class="p-4">
          <h2 class="font-bold leading-snug group-hover:text-brand-600 line-clamp-2">{{ l.title }}</h2>
          <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ l.excerpt }}</p>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="text-gray-500">กำลังเตรียมลิสต์แนะนำ</p>
  </div>
</template>
