export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore();

  // เผื่อ auth middleware ยังไม่ได้กู้ session (เช่นเข้าหน้า admin ตรงๆ)
  if (import.meta.client && !auth.isAuthenticated) {
    await auth.hydrate();
  }

  if (!auth.isModerator) {
    if (import.meta.server) return; // ให้ client ตัดสินหลัง hydrate
    return navigateTo('/');
  }
});
