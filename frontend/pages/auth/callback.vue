<script setup lang="ts">
// OAuth callback handler — receives ?token=... from backend redirect
const route = useRoute();
const auth = useAuthStore();

const token = route.query.token as string;
if (token && process.client) {
  auth.accessToken = token;
  localStorage.setItem('tj_token', token);
  await auth.fetchMe();
  await navigateTo('/');
}

useSeoMeta({ title: 'กำลังเข้าสู่ระบบ...', robots: 'noindex' });
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <p class="text-gray-500">กำลังเข้าสู่ระบบ...</p>
  </div>
</template>
