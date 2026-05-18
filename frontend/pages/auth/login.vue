<script setup lang="ts">
const auth = useAuthStore();
const route = useRoute();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function submit() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await auth.login(email.value, password.value);
    await navigateTo((route.query.next as string) || '/');
  } catch (e: any) {
    errorMsg.value = e?.data?.error === 'invalid_credentials'
      ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      : 'เกิดข้อผิดพลาด';
  } finally { loading.value = false; }
}

useSeoMeta({ title: 'เข้าสู่ระบบ', robots: 'noindex' });
</script>

<template>
  <div class="max-w-md mx-auto py-12 px-4">
    <div class="card p-8">
      <h1 class="text-2xl font-bold mb-2 text-center">🎬 ติดจอ</h1>
      <p class="text-gray-500 text-sm text-center mb-6">เข้าสู่ระบบเพื่อรีวิวหนัง</p>

      <form @submit.prevent="submit" class="space-y-3">
        <input v-model="email" type="email" placeholder="อีเมล" required class="input" />
        <input v-model="password" type="password" placeholder="รหัสผ่าน" required class="input" />
        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        <button type="submit" :disabled="loading" class="btn-primary w-full">
          {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </button>
      </form>

      <div class="flex items-center my-6">
        <span class="flex-1 border-t" />
        <span class="px-3 text-xs text-gray-400">หรือ</span>
        <span class="flex-1 border-t" />
      </div>

      <div class="space-y-2">
        <button @click="auth.loginWithProvider('google')" class="btn-outline w-full">
          <span>🔵</span> เข้าสู่ระบบด้วย Google
        </button>
        <button @click="auth.loginWithProvider('facebook')" class="btn-outline w-full">
          <span>📘</span> เข้าสู่ระบบด้วย Facebook
        </button>
        <button @click="auth.loginWithProvider('line')" class="btn-outline w-full">
          <span>💚</span> เข้าสู่ระบบด้วย LINE
        </button>
      </div>

      <p class="text-center mt-6 text-sm text-gray-600">
        ยังไม่มีบัญชี?
        <NuxtLink to="/auth/register" class="text-brand-600 font-medium">สมัครสมาชิก</NuxtLink>
      </p>
    </div>
  </div>
</template>
