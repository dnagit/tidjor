<script setup lang="ts">
const auth = useAuthStore();
const email = ref('');
const password = ref('');
const displayName = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function submit() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await auth.register(email.value, password.value, displayName.value);
    await navigateTo('/');
  } catch (e: any) {
    errorMsg.value = e?.data?.error === 'email_taken'
      ? 'อีเมลนี้มีผู้ใช้งานแล้ว'
      : 'เกิดข้อผิดพลาด';
  } finally { loading.value = false; }
}

useSeoMeta({ title: 'สมัครสมาชิก', robots: 'noindex' });
</script>

<template>
  <div class="max-w-md mx-auto py-12 px-4">
    <div class="card p-8">
      <h1 class="text-2xl font-bold mb-2 text-center">สมัครสมาชิก 🎬</h1>
      <p class="text-gray-500 text-sm text-center mb-6">เริ่มต้นรีวิวหนังในไม่กี่วินาที</p>

      <form @submit.prevent="submit" class="space-y-3">
        <input v-model="displayName" type="text" placeholder="ชื่อที่ใช้แสดง" required class="input" />
        <input v-model="email" type="email" placeholder="อีเมล" required class="input" />
        <input v-model="password" type="password" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" minlength="8" required class="input" />
        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        <button type="submit" :disabled="loading" class="btn-primary w-full">
          {{ loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก' }}
        </button>
      </form>

      <p class="text-center mt-6 text-sm text-gray-600">
        มีบัญชีแล้ว?
        <NuxtLink to="/auth/login" class="text-brand-600 font-medium">เข้าสู่ระบบ</NuxtLink>
      </p>
    </div>
  </div>
</template>
