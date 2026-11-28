<script setup lang="ts">
// คอมเมนต์ใต้ข่าว — โหลดฝั่ง browser (ไม่ต้องรอตอน render หน้า)
const props = defineProps<{ newsId: string }>();
const auth = useAuthStore();
const api = useApi();
const route = useRoute();
const items = ref<any[]>([]);
const content = ref('');
const sending = ref(false);
const error = ref('');

async function load() {
  const r = await api.get<{ items: any[] }>(`/api/news/${props.newsId}/comments`).catch(() => null);
  items.value = r?.items || [];
}
onMounted(load);

async function send() {
  if (!content.value.trim()) return;
  sending.value = true;
  error.value = '';
  try {
    const c = await api.post(`/api/news/${props.newsId}/comments`, { content: content.value });
    items.value.push(c);
    content.value = '';
    track('comment', { content_type: 'news', item_id: props.newsId });
  } catch (e: any) {
    error.value = e?.statusCode === 429 ? 'ส่งถี่เกินไป รอสักครู่' : 'ส่งคอมเมนต์ไม่สำเร็จ';
  } finally { sending.value = false; }
}
async function remove(c: any) {
  if (!confirm('ลบคอมเมนต์นี้?')) return;
  await api.delete(`/api/news/comments/${c.id}`);
  items.value = items.value.filter((x) => x.id !== c.id);
}
const canDelete = (c: any) => auth.user && (c.user.id === auth.user.id || auth.isModerator);
</script>

<template>
  <section class="mt-10">
    <h2 class="text-xl font-bold mb-4">💬 ความคิดเห็น ({{ items.length }})</h2>

    <form v-if="auth.isAuthenticated" class="mb-6" @submit.prevent="send">
      <textarea v-model="content" rows="3" maxlength="2000" class="input mb-2" placeholder="คิดยังไงกับข่าวนี้? รอดูไหม..." />
      <div class="flex items-center gap-3">
        <button type="submit" class="btn-primary text-sm" :disabled="sending || !content.trim()">{{ sending ? 'กำลังส่ง...' : 'ส่งความคิดเห็น' }}</button>
        <span v-if="error" class="text-sm text-red-600">{{ error }}</span>
      </div>
    </form>
    <p v-else class="mb-6 text-sm text-gray-600">
      <NuxtLink :to="`/auth/login?next=${encodeURIComponent(route.fullPath)}`" class="text-brand-600 underline">เข้าสู่ระบบ</NuxtLink> เพื่อแสดงความคิดเห็น
    </p>

    <div class="space-y-4">
      <div v-for="c in items" :key="c.id" class="flex gap-3">
        <img v-if="c.user.avatarUrl" :src="c.user.avatarUrl" width="36" height="36" alt="" class="w-9 h-9 rounded-full shrink-0" />
        <div v-else class="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shrink-0">{{ c.user.displayName?.[0]?.toUpperCase() }}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm">
            <NuxtLink :to="`/u/${c.user.username}`" class="font-semibold hover:text-brand-600">{{ c.user.displayName }}</NuxtLink>
            <span class="text-gray-400 text-xs ml-2">{{ new Date(c.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</span>
            <button v-if="canDelete(c)" class="text-xs text-gray-400 hover:text-red-600 ml-2" @click="remove(c)">ลบ</button>
          </p>
          <p class="text-gray-700 whitespace-pre-line break-words">{{ c.content }}</p>
        </div>
      </div>
      <p v-if="!items.length" class="text-sm text-gray-500">ยังไม่มีความคิดเห็น เป็นคนแรกเลย!</p>
    </div>
  </section>
</template>
