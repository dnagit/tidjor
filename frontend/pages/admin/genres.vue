<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();

const { data, refresh } = await useAsyncData('admin-genres', () => api.get<any>('/api/genres'));

const form = ref({ name: '', nameTh: '', slug: '' });
async function add() {
  await api.post('/api/genres', form.value);
  form.value = { name: '', nameTh: '', slug: '' };
  await refresh();
}

useSeoMeta({ title: 'จัดการหมวดหมู่', robots: 'noindex' });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">🏷️ หมวดหมู่</h1>

    <div class="card p-4 mb-6 grid md:grid-cols-4 gap-3">
      <input v-model="form.name" placeholder="ชื่อ (en)" class="input" />
      <input v-model="form.nameTh" placeholder="ชื่อ (ไทย)" class="input" />
      <input v-model="form.slug" placeholder="slug" class="input" />
      <button @click="add" class="btn-primary">+ เพิ่ม</button>
    </div>

    <table class="w-full bg-white rounded-xl2 border overflow-hidden">
      <thead class="bg-gray-50 text-left text-sm">
        <tr>
          <th class="p-3">ID</th>
          <th class="p-3">ชื่อไทย</th>
          <th class="p-3">ชื่อ (en)</th>
          <th class="p-3">Slug</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in data?.items" :key="g.id" class="border-t">
          <td class="p-3 text-sm">{{ g.id }}</td>
          <td class="p-3">{{ g.nameTh }}</td>
          <td class="p-3 text-sm">{{ g.name }}</td>
          <td class="p-3 text-sm font-mono text-gray-500">{{ g.slug }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
