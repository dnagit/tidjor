<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();
const auth = useAuthStore();
const { data, refresh } = await useAsyncData('admin-lists', () => api.get<{ items: any[] }>('/api/lists/admin/all'));
const message = ref('');
const generating = ref(false);

async function togglePublish(l: any) {
  await api.patch(`/api/lists/${l.id}`, { isPublished: !l.isPublished });
  await refresh();
}
async function remove(l: any) {
  if (!confirm(`ลบลิสต์ "${l.title}" ถาวร?`)) return;
  await api.delete(`/api/lists/${l.id}`);
  await refresh();
}
// AI สร้าง/อัปเดต 1 หัวข้อ (หัวข้อที่ยังไม่มี/เก่าสุดก่อน) ~20 วินาที, < $0.01
async function generate() {
  generating.value = true;
  message.value = 'AI กำลังเขียนลิสต์ ใช้เวลาประมาณ 20-40 วินาที...';
  const before = JSON.stringify(data.value?.items?.map((i) => i.updatedAt));
  try {
    await api.post('/api/lists/admin/generate');
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      await refresh();
      if (JSON.stringify(data.value?.items?.map((x) => x.updatedAt)) !== before) { message.value = 'เสร็จแล้ว ✓'; return; }
    }
    message.value = 'ยังไม่เห็นลิสต์ใหม่ ดู log ที่ server (pm2 logs)';
  } catch (e: any) {
    message.value = `เกิดข้อผิดพลาด: ${e?.data?.error || e.message}`;
  } finally { generating.value = false; }
}
useSeoMeta({ title: 'จัดการลิสต์แนะนำ', robots: 'noindex' });
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold">🏆 ลิสต์แนะนำ</h1>
      <button v-if="auth.isAdmin" class="btn-primary text-sm" :disabled="generating" @click="generate">
        {{ generating ? 'กำลังเขียน...' : '✨ ให้ AI สร้าง/อัปเดต 1 ลิสต์' }}
      </button>
    </div>
    <p v-if="message" class="mb-4 text-sm bg-brand-50 rounded-lg px-3 py-2">{{ message }}</p>
    <div class="space-y-3">
      <article v-for="l in data?.items" :key="l.id" class="card p-4 flex justify-between gap-4">
        <div class="min-w-0">
          <NuxtLink :to="`/lists/${l.slug}`" target="_blank" class="font-bold hover:text-brand-600">{{ l.title }}</NuxtLink>
          <p class="text-sm text-gray-500 mt-1">
            {{ l.topic }} · อัปเดต {{ new Date(l.updatedAt).toLocaleDateString('th-TH') }}
            <span v-if="!l.isPublished" class="chip bg-red-50 text-red-700 ml-1">ไม่เผยแพร่</span>
          </p>
        </div>
        <div class="flex flex-col gap-1 text-sm shrink-0 text-right">
          <button :class="l.isPublished ? 'text-gray-600' : 'text-green-600'" @click="togglePublish(l)">{{ l.isPublished ? 'ซ่อน' : 'เผยแพร่' }}</button>
          <button class="text-red-600" @click="remove(l)">ลบ</button>
        </div>
      </article>
      <p v-if="!data?.items?.length" class="text-gray-500">ยังไม่มีลิสต์</p>
    </div>
  </div>
</template>
