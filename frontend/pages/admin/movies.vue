<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();

const q = ref('');
const tab = ref<'list' | 'tmdb' | 'manual'>('list');

// ==== List ====
const { data: list, refresh } = await useAsyncData('admin-movies',
  () => api.get<any>('/api/movies', { q: q.value || undefined, limit: 50 }),
  { watch: [q] }
);

async function removeMovie(id: string) {
  if (!confirm('ลบหนังเรื่องนี้?')) return;
  await api.delete(`/api/movies/${id}`);
  await refresh();
}

// ==== TMDB import ====
const tmdbQ = ref('');
const tmdbResults = ref<any[]>([]);
async function searchTmdb() {
  const data = await api.get<any>('/api/movies/tmdb/search', { q: tmdbQ.value });
  tmdbResults.value = data.results || [];
}
async function importTmdb(id: number) {
  try {
    await api.post('/api/movies/tmdb/import', { tmdbId: id });
    alert('นำเข้าสำเร็จ ✓');
    await refresh();
  } catch (e: any) {
    alert(e?.data?.error || 'เกิดข้อผิดพลาด');
  }
}

// ==== Manual add ====
const newMovie = ref({
  title: '', titleTh: '', titleEn: '', slug: '',
  overview: '', posterUrl: '', backdropUrl: '',
  releaseDate: '', runtime: 0, director: '',
  originalLanguage: 'th',
});

async function createMovie() {
  await api.post('/api/movies', newMovie.value);
  alert('สร้างหนังเรียบร้อย');
  newMovie.value = { ...newMovie.value, title: '', titleTh: '', titleEn: '', slug: '', overview: '' };
  await refresh();
}

useSeoMeta({ title: 'จัดการหนัง', robots: 'noindex' });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">🎞️ จัดการหนัง</h1>

    <div class="flex gap-2 border-b mb-6">
      <button @click="tab = 'list'" :class="tab === 'list' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'" class="px-4 py-2">
        รายการหนัง
      </button>
      <button @click="tab = 'tmdb'" :class="tab === 'tmdb' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'" class="px-4 py-2">
        นำเข้าจาก TMDB
      </button>
      <button @click="tab = 'manual'" :class="tab === 'manual' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'" class="px-4 py-2">
        เพิ่มเอง (หนังไทย)
      </button>
    </div>

    <!-- LIST -->
    <div v-if="tab === 'list'">
      <input v-model="q" placeholder="ค้นหาหนัง..." class="input max-w-sm mb-4" />
      <table class="w-full bg-white rounded-xl2 border overflow-hidden">
        <thead class="bg-gray-50 text-left text-sm">
          <tr>
            <th class="p-3">โปสเตอร์</th>
            <th class="p-3">ชื่อ</th>
            <th class="p-3">ปี</th>
            <th class="p-3">คะแนน</th>
            <th class="p-3">รีวิว</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in list?.items" :key="m.id" class="border-t">
            <td class="p-3">
              <img v-if="m.posterUrl" :src="m.posterUrl" class="w-10 h-14 object-cover rounded" />
            </td>
            <td class="p-3">
              <NuxtLink :to="`/movies/${m.slug}`" class="font-medium hover:text-brand-600">{{ m.titleTh || m.title }}</NuxtLink>
              <p class="text-xs text-gray-500">{{ m.titleEn }}</p>
            </td>
            <td class="p-3 text-sm">{{ m.releaseDate ? new Date(m.releaseDate).getFullYear() : '-' }}</td>
            <td class="p-3 text-sm">⭐ {{ m.averageRating?.toFixed(1) || '-' }}</td>
            <td class="p-3 text-sm">{{ m.reviewCount }}</td>
            <td class="p-3 text-right">
              <button @click="removeMovie(m.id)" class="text-red-600 text-sm hover:underline">ลบ</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TMDB Import -->
    <div v-if="tab === 'tmdb'">
      <div class="flex gap-2 mb-4">
        <input v-model="tmdbQ" placeholder="ค้นหาใน TMDB..." class="input max-w-md" @keyup.enter="searchTmdb" />
        <button @click="searchTmdb" class="btn-primary">ค้นหา</button>
      </div>
      <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div v-for="r in tmdbResults" :key="r.id" class="card p-3 flex gap-3">
          <img v-if="r.poster_path" :src="`https://image.tmdb.org/t/p/w200${r.poster_path}`" class="w-20 h-28 object-cover rounded" />
          <div class="flex-1">
            <p class="font-semibold text-sm">{{ r.title }}</p>
            <p class="text-xs text-gray-500">{{ r.release_date }}</p>
            <p class="text-xs text-gray-600 line-clamp-3 mt-1">{{ r.overview }}</p>
            <button @click="importTmdb(r.id)" class="btn-primary text-xs mt-2">+ นำเข้า</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual -->
    <div v-if="tab === 'manual'" class="card p-6 max-w-3xl">
      <h2 class="font-bold mb-4">เพิ่มหนังเอง (สำหรับหนังไทย)</h2>
      <div class="grid md:grid-cols-2 gap-3">
        <input v-model="newMovie.titleTh" placeholder="ชื่อไทย *" class="input" />
        <input v-model="newMovie.titleEn" placeholder="ชื่ออังกฤษ" class="input" />
        <input v-model="newMovie.title" placeholder="ชื่อหลัก (จะใช้แสดง) *" class="input md:col-span-2" />
        <input v-model="newMovie.slug" placeholder="slug (URL-friendly, optional)" class="input md:col-span-2" />
        <textarea v-model="newMovie.overview" rows="3" placeholder="เรื่องย่อ" class="input md:col-span-2" />
        <input v-model="newMovie.posterUrl" placeholder="URL โปสเตอร์" class="input" />
        <input v-model="newMovie.backdropUrl" placeholder="URL backdrop" class="input" />
        <input v-model="newMovie.releaseDate" type="date" class="input" />
        <input v-model.number="newMovie.runtime" type="number" placeholder="ความยาว (นาที)" class="input" />
        <input v-model="newMovie.director" placeholder="ผู้กำกับ" class="input md:col-span-2" />
      </div>
      <button @click="createMovie" class="btn-primary mt-4">บันทึก</button>
    </div>
  </div>
</template>
