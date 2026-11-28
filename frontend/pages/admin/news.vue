<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();
const auth = useAuthStore();

const { data, refresh } = await useAsyncData('admin-news', () => api.get<{ items: any[] }>('/api/news/admin/all'));

const editing = ref<string | null>(null);
const form = ref({ title: '', excerpt: '', content: '' });
const message = ref('');

function startEdit(n: any) {
  editing.value = n.id;
  form.value = { title: n.title, excerpt: n.excerpt, content: n.content };
}
async function save(n: any) {
  await api.patch(`/api/news/${n.id}`, form.value);
  editing.value = null;
  await refresh();
}
async function togglePublish(n: any) {
  await api.patch(`/api/news/${n.id}`, { isPublished: !n.isPublished });
  await refresh();
}
async function remove(n: any) {
  if (!confirm(`ลบข่าว "${n.title}" ถาวร?`)) return;
  await api.delete(`/api/news/${n.id}`);
  await refresh();
}

// AI เขียนข่าว 1 ข่าว (~1 นาที, ~$0.05) — ทำเบื้องหลัง แล้วโหลดรายการใหม่
const generating = ref(false);
async function generate() {
  generating.value = true;
  message.value = 'AI กำลังค้นข้อมูลและเขียนข่าว ใช้เวลาประมาณ 1-2 นาที...';
  try {
    await api.post('/api/news/admin/generate');
    const before = data.value?.items?.length || 0;
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      await refresh();
      if ((data.value?.items?.length || 0) > before) { message.value = 'เขียนข่าวใหม่เสร็จแล้ว ✓'; return; }
    }
    message.value = 'ยังไม่เห็นข่าวใหม่ — อาจไม่มีเรื่องใกล้ฉายที่ยังไม่มีข่าว ดู log ที่ server (pm2 logs)';
  } catch (e: any) {
    message.value = e?.data?.error === 'already_running' ? 'กำลังเขียนข่าวอยู่แล้ว รอสักครู่' : `เกิดข้อผิดพลาด: ${e?.data?.error || e.message}`;
  } finally {
    generating.value = false;
  }
}

useSeoMeta({ title: 'จัดการข่าว', robots: 'noindex' });
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 class="text-3xl font-bold">📰 จัดการข่าว</h1>
      <button v-if="auth.isAdmin" class="btn-primary text-sm" :disabled="generating" @click="generate">
        {{ generating ? 'กำลังเขียน...' : '✨ ให้ AI เขียนข่าว 1 ข่าว' }}
      </button>
    </div>
    <p v-if="message" class="mb-4 text-sm text-gray-700 bg-brand-50 rounded-lg px-3 py-2">{{ message }}</p>

    <div class="space-y-3">
      <article v-for="n in data?.items" :key="n.id" class="card p-4">
        <template v-if="editing === n.id">
          <input v-model="form.title" class="input mb-2" placeholder="พาดหัว" />
          <input v-model="form.excerpt" class="input mb-2" placeholder="สรุปสั้น (meta description)" />
          <textarea v-model="form.content" rows="14" class="input mb-2 font-mono text-sm" />
          <p class="text-xs text-gray-500 mb-2">ย่อหน้าคั่นด้วยบรรทัดว่าง · ขึ้นบรรทัดด้วย "## " = หัวข้อย่อย</p>
          <div class="flex gap-2">
            <button class="btn-primary text-sm" @click="save(n)">บันทึก</button>
            <button class="btn-outline text-sm" @click="editing = null">ยกเลิก</button>
          </div>
        </template>
        <template v-else>
          <div class="flex justify-between items-start gap-4">
            <div class="min-w-0">
              <NuxtLink :to="`/news/${n.slug}`" target="_blank" class="font-bold hover:text-brand-600">{{ n.title }}</NuxtLink>
              <p class="text-sm text-gray-500 mt-1">
                {{ new Date(n.publishedAt).toLocaleDateString('th-TH') }}
                <span v-if="n.movie"> · {{ n.movie.title }}</span>
                <span v-if="n.isAi"> · ✨ AI</span>
                <span v-if="!n.isPublished" class="chip bg-red-50 text-red-700 ml-1">ไม่เผยแพร่</span>
              </p>
              <p class="text-sm text-gray-700 mt-2 line-clamp-2">{{ n.excerpt }}</p>
            </div>
            <div class="flex flex-col gap-1 text-sm shrink-0 text-right">
              <button class="text-brand-600" @click="startEdit(n)">แก้ไข</button>
              <button :class="n.isPublished ? 'text-gray-600' : 'text-green-600'" @click="togglePublish(n)">
                {{ n.isPublished ? 'ซ่อน' : 'เผยแพร่' }}
              </button>
              <button class="text-red-600" @click="remove(n)">ลบ</button>
            </div>
          </div>
        </template>
      </article>
      <p v-if="!data?.items?.length" class="text-gray-500">ยังไม่มีข่าว</p>
    </div>
  </div>
</template>
