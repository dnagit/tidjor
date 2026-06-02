<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();

const { data, refresh } = await useAsyncData('admin-genres', () => api.get<any>('/api/genres'));

// ---------- helpers ----------
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function validateGenre(f: { name: string; nameTh: string; slug: string }) {
  const e: Record<string, string> = {};
  if (!f.name?.trim()) e.name = 'กรอกชื่อ (en)';
  else if (f.name.trim().length > 50) e.name = 'ยาวเกิน 50 ตัว';

  if (!f.nameTh?.trim()) e.nameTh = 'กรอกชื่อไทย';
  else if (f.nameTh.trim().length > 50) e.nameTh = 'ยาวเกิน 50 ตัว';

  if (!f.slug?.trim()) e.slug = 'กรอก slug';
  else if (!/^[a-z0-9-]+$/.test(f.slug.trim())) e.slug = 'ใช้ได้เฉพาะ a-z, 0-9, -';
  return e;
}

function apiErr(e: any) {
  const code = e?.data?.error;
  if (code === 'duplicate') return 'ชื่อหรือ slug ซ้ำกับที่มีอยู่แล้ว';
  if (code === 'validation_failed') return e?.data?.details?.[0]?.msg || 'ข้อมูลไม่ถูกต้อง';
  if (code === 'not_found') return 'ไม่พบหมวดนี้ (อาจถูกลบไปแล้ว)';
  return e?.data?.message || 'เกิดข้อผิดพลาด';
}

// ---------- add ----------
const form = ref({ name: '', nameTh: '', slug: '' });
const addErrors = ref<Record<string, string>>({});
const adding = ref(false);

// auto-fill slug จากชื่อ (en) ถ้ายังไม่ได้พิมพ์เอง
watch(() => form.value.name, (n) => { if (!form.value.slug) form.value.slug = slugify(n); });

async function add() {
  addErrors.value = validateGenre(form.value);
  if (Object.keys(addErrors.value).length) return;
  adding.value = true;
  try {
    await api.post('/api/genres', {
      name: form.value.name.trim(),
      nameTh: form.value.nameTh.trim(),
      slug: slugify(form.value.slug),
    });
    form.value = { name: '', nameTh: '', slug: '' };
    addErrors.value = {};
    await refresh();
  } catch (e: any) {
    addErrors.value = { _api: apiErr(e) };
  } finally {
    adding.value = false;
  }
}

// ---------- edit (inline) ----------
const editingId = ref<number | null>(null);
const editForm = ref({ name: '', nameTh: '', slug: '' });
const editErrors = ref<Record<string, string>>({});

function startEdit(g: any) {
  editingId.value = g.id;
  editForm.value = { name: g.name, nameTh: g.nameTh, slug: g.slug };
  editErrors.value = {};
}
function cancelEdit() {
  editingId.value = null;
  editErrors.value = {};
}

async function saveEdit(id: number) {
  editErrors.value = validateGenre(editForm.value);
  if (Object.keys(editErrors.value).length) return;
  try {
    await api.patch(`/api/genres/${id}`, {
      name: editForm.value.name.trim(),
      nameTh: editForm.value.nameTh.trim(),
      slug: slugify(editForm.value.slug),
    });
    editingId.value = null;
    await refresh();
  } catch (e: any) {
    editErrors.value = { _api: apiErr(e) };
  }
}

// ---------- delete ----------
async function removeGenre(g: any) {
  const used = g.movieCount ? ` (มีหนังผูกอยู่ ${g.movieCount} เรื่อง — จะถูกถอดหมวดนี้ออก)` : '';
  if (!confirm(`ลบหมวด "${g.nameTh || g.name}"?${used}`)) return;
  try {
    await api.delete(`/api/genres/${g.id}`);
    await refresh();
  } catch (e: any) {
    alert(apiErr(e));
  }
}

useSeoMeta({ title: 'จัดการหมวดหมู่', robots: 'noindex' });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">🏷️ หมวดหมู่</h1>

    <!-- ADD -->
    <div class="card p-4 mb-6">
      <div class="grid md:grid-cols-4 gap-3 items-start">
        <div>
          <input v-model="form.name" placeholder="ชื่อ (en) *" class="input w-full"
            :class="{ '!border-red-400': addErrors.name }" @keyup.enter="add" />
          <p v-if="addErrors.name" class="text-xs text-red-500 mt-1">{{ addErrors.name }}</p>
        </div>
        <div>
          <input v-model="form.nameTh" placeholder="ชื่อ (ไทย) *" class="input w-full"
            :class="{ '!border-red-400': addErrors.nameTh }" @keyup.enter="add" />
          <p v-if="addErrors.nameTh" class="text-xs text-red-500 mt-1">{{ addErrors.nameTh }}</p>
        </div>
        <div>
          <input v-model="form.slug" placeholder="slug *" class="input w-full font-mono"
            :class="{ '!border-red-400': addErrors.slug }" @keyup.enter="add" />
          <p v-if="addErrors.slug" class="text-xs text-red-500 mt-1">{{ addErrors.slug }}</p>
        </div>
        <button @click="add" :disabled="adding" class="btn-primary self-start" style="height:42px">
          {{ adding ? 'กำลังเพิ่ม...' : '+ เพิ่ม' }}
        </button>
      </div>
      <p v-if="addErrors._api" class="text-sm text-red-500 mt-2">⚠️ {{ addErrors._api }}</p>
    </div>

    <!-- LIST -->
    <table class="w-full bg-white rounded-xl2 border overflow-hidden">
      <thead class="bg-gray-50 text-left text-sm">
        <tr>
          <th class="p-3 w-12">ID</th>
          <th class="p-3">ชื่อไทย</th>
          <th class="p-3">ชื่อ (en)</th>
          <th class="p-3">Slug</th>
          <th class="p-3 w-24 text-center">หนัง</th>
          <th class="p-3 w-32"></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="g in data?.items" :key="g.id">
          <tr class="border-t align-top">
            <td class="p-3 text-sm text-gray-500">{{ g.id }}</td>

            <!-- view -->
            <template v-if="editingId !== g.id">
              <td class="p-3">{{ g.nameTh }}</td>
              <td class="p-3 text-sm">{{ g.name }}</td>
              <td class="p-3 text-sm font-mono text-gray-500">{{ g.slug }}</td>
              <td class="p-3 text-sm text-center text-gray-500">{{ g.movieCount ?? 0 }}</td>
              <td class="p-3 text-right space-x-3 whitespace-nowrap">
                <button @click="startEdit(g)" class="text-brand-600 text-sm hover:underline">แก้ไข</button>
                <button @click="removeGenre(g)" class="text-red-600 text-sm hover:underline">ลบ</button>
              </td>
            </template>

            <!-- edit -->
            <template v-else>
              <td class="p-2">
                <input v-model="editForm.nameTh" class="input w-full" :class="{ '!border-red-400': editErrors.nameTh }" />
                <p v-if="editErrors.nameTh" class="text-xs text-red-500 mt-1">{{ editErrors.nameTh }}</p>
              </td>
              <td class="p-2">
                <input v-model="editForm.name" class="input w-full" :class="{ '!border-red-400': editErrors.name }" />
                <p v-if="editErrors.name" class="text-xs text-red-500 mt-1">{{ editErrors.name }}</p>
              </td>
              <td class="p-2">
                <input v-model="editForm.slug" class="input w-full font-mono" :class="{ '!border-red-400': editErrors.slug }" />
                <p v-if="editErrors.slug" class="text-xs text-red-500 mt-1">{{ editErrors.slug }}</p>
              </td>
              <td class="p-2 text-sm text-center text-gray-400">{{ g.movieCount ?? 0 }}</td>
              <td class="p-2 text-right space-x-2 whitespace-nowrap">
                <button @click="saveEdit(g.id)" class="text-green-600 text-sm hover:underline">บันทึก</button>
                <button @click="cancelEdit" class="text-gray-500 text-sm hover:underline">ยกเลิก</button>
              </td>
            </template>
          </tr>
          <tr v-if="editingId === g.id && editErrors._api">
            <td colspan="6" class="px-3 pb-3 text-sm text-red-500">⚠️ {{ editErrors._api }}</td>
          </tr>
        </template>
        <tr v-if="data && !data.items.length">
          <td colspan="6" class="p-6 text-center text-gray-400">ยังไม่มีหมวดหมู่</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
