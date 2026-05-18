export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore();
  if (!auth.isModerator) {
    return navigateTo('/');
  }
});
