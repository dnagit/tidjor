<script setup lang="ts">
// canonical ทุกหน้า: ตัด query ที่ไม่เปลี่ยนเนื้อหา (sort, q ฯลฯ) ออก
// เก็บไว้เฉพาะตัวกรองที่ทำให้เป็นหน้าคนละหน้า (หนัง/ซีรีส์, หมวด, ภาษา, หน้าที่ 2+)
const route = useRoute();
const config = useRuntimeConfig();
const site = (config.public.siteUrl || '').replace(/\/+$/, '');
const CANONICAL_PARAMS = ['type', 'genre', 'lang', 'page'];

const canonical = computed(() => {
  const params = new URLSearchParams();
  for (const key of CANONICAL_PARAMS) {
    const v = route.query[key];
    if (typeof v === 'string' && v && !(key === 'page' && v === '1')) params.set(key, v);
  }
  const qs = params.toString();
  return `${site}${route.path}${qs ? `?${qs}` : ''}`;
});

useHead({ link: [{ rel: 'canonical', href: canonical }] });
useSeoMeta({ ogUrl: canonical, ogSiteName: 'ติดจอ', ogLocale: 'th_TH' });
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
