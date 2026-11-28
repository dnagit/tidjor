<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
const auth = useAuthStore();
const api = useApi();

const step = ref<'idle' | 'confirm'>('idle');
const username = ref('');
const password = ref('');
const error = ref('');
const deleting = ref(false);

const ERRORS: Record<string, string> = {
  username_mismatch: 'ชื่อผู้ใช้ไม่ตรงกัน',
  invalid_password: 'รหัสผ่านไม่ถูกต้อง',
  admin_cannot_delete: 'บัญชีผู้ดูแลระบบ (Admin) ลบเองไม่ได้ ต้องลดสิทธิ์เป็นผู้ใช้ทั่วไปก่อน',
};

async function confirmDelete() {
  error.value = '';
  deleting.value = true;
  try {
    await api.delete('/api/users/me', { username: username.value, password: password.value });
    track('delete_account');
    auth.user = null;
    auth.accessToken = '';
    try { localStorage.removeItem('tj_token'); } catch { /* ignore */ }
    await navigateTo('/?deleted=1');
  } catch (e: any) {
    error.value = ERRORS[e?.data?.error] || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
  } finally {
    deleting.value = false;
  }
}

useSeoMeta({ title: 'ตั้งค่าบัญชี', robots: 'noindex' });
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">⚙️ ตั้งค่าบัญชี</h1>

    <section class="card p-5 mb-6">
      <h2 class="font-bold mb-2">บัญชีของฉัน</h2>
      <p class="text-sm text-gray-700">ชื่อที่แสดง: <b>{{ auth.user?.displayName }}</b></p>
      <p class="text-sm text-gray-700">ชื่อผู้ใช้: <b>{{ auth.user?.username }}</b></p>
      <p class="text-sm text-gray-700">อีเมล: {{ auth.user?.email }}</p>
      <NuxtLink :to="`/u/${auth.user?.username}`" class="text-sm text-brand-600 underline mt-2 inline-block">ดูโปรไฟล์</NuxtLink>
    </section>

    <section class="card p-5 border-red-200">
      <h2 class="font-bold text-red-700 mb-2">ลบบัญชี</h2>
      <p class="text-sm text-gray-700 mb-3">
        ระบบจะลบบัญชี รีวิว คะแนน คอมเมนต์ การกดถูกใจ Watchlist แจ้งเตือน และการเชื่อมบัญชี Google/Facebook/LINE <b>ถาวร กู้คืนไม่ได้</b>
      </p>

      <button v-if="step === 'idle'" class="btn-outline text-sm text-red-600 border-red-300 hover:bg-red-50" @click="step = 'confirm'">
        ต้องการลบบัญชี
      </button>

      <form v-else class="space-y-3" @submit.prevent="confirmDelete">
        <label class="block text-sm">
          พิมพ์ชื่อผู้ใช้ <b>{{ auth.user?.username }}</b> เพื่อยืนยัน
          <input v-model="username" class="input mt-1" autocomplete="off" />
        </label>
        <label class="block text-sm">
          รหัสผ่าน <span class="text-gray-500">(เฉพาะบัญชีที่สมัครด้วยอีเมล — ถ้าเข้าด้วย Google/Facebook/LINE เว้นว่างได้)</span>
          <input v-model="password" type="password" class="input mt-1" autocomplete="current-password" />
        </label>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-sm"
            :disabled="deleting || username !== auth.user?.username">
            {{ deleting ? 'กำลังลบ...' : 'ลบบัญชีถาวร' }}
          </button>
          <button type="button" class="btn-outline text-sm" @click="step = 'idle'">ยกเลิก</button>
        </div>
      </form>
    </section>
  </div>
</template>
