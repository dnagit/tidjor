<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const api = useApi();

const q = ref('');
const { data, refresh } = await useAsyncData('admin-users',
  () => api.get<any>('/api/admin/users', { q: q.value || undefined }),
  { watch: [q] }
);

async function toggleBan(u: any) {
  await api.patch(`/api/admin/users/${u.id}/ban`, { banned: !u.isBanned });
  await refresh();
}

async function changeRole(u: any, role: string) {
  await api.patch(`/api/admin/users/${u.id}/role`, { role });
  await refresh();
}

useSeoMeta({ title: 'จัดการผู้ใช้', robots: 'noindex' });
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">👥 จัดการผู้ใช้</h1>
    <input v-model="q" placeholder="ค้นหา email / username / ชื่อ" class="input max-w-sm mb-4" />
    <table class="w-full bg-white rounded-xl2 border overflow-hidden">
      <thead class="bg-gray-50 text-left text-sm">
        <tr>
          <th class="p-3">ผู้ใช้</th>
          <th class="p-3">Email</th>
          <th class="p-3">Role</th>
          <th class="p-3">รีวิว</th>
          <th class="p-3">สมัครเมื่อ</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in data?.items" :key="u.id" class="border-t">
          <td class="p-3">
            <div class="flex items-center gap-2">
              <img v-if="u.avatarUrl" :src="u.avatarUrl" class="w-8 h-8 rounded-full" />
              <div v-else class="w-8 h-8 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold">
                {{ u.displayName?.[0]?.toUpperCase() }}
              </div>
              <div>
                <p class="font-medium text-sm">{{ u.displayName }}</p>
                <p class="text-xs text-gray-500">@{{ u.username }}</p>
              </div>
            </div>
          </td>
          <td class="p-3 text-sm">{{ u.email }}</td>
          <td class="p-3 text-sm">
            <select :value="u.role" @change="changeRole(u, ($event.target as HTMLSelectElement).value)" class="text-sm border rounded px-2 py-1">
              <option value="USER">USER</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </td>
          <td class="p-3 text-sm">{{ u._count.reviews }}</td>
          <td class="p-3 text-sm">{{ new Date(u.createdAt).toLocaleDateString('th-TH') }}</td>
          <td class="p-3 text-sm">
            <span v-if="u.isBanned" class="chip bg-red-50 text-red-700">Banned</span>
            <span v-else class="chip">Active</span>
          </td>
          <td class="p-3 text-right">
            <button @click="toggleBan(u)" class="text-sm hover:underline" :class="u.isBanned ? 'text-green-600' : 'text-red-600'">
              {{ u.isBanned ? 'Unban' : 'Ban' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
