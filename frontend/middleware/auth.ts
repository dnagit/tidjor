export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  // กันหลุด login ตอน refresh: ฝั่ง client ลองกู้ session จาก token เดิมก่อน
  if (import.meta.client && !auth.isAuthenticated) {
    await auth.hydrate();
  }

  if (!auth.isAuthenticated) {
    // SSR ยังไม่เห็น session (token อยู่ใน localStorage) → อย่าเพิ่งเด้ง ให้ client ตัดสิน
    if (import.meta.server) return;
    return navigateTo(`/auth/login?next=${encodeURIComponent(to.fullPath)}`);
  }
});
