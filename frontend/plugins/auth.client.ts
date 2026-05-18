// Hydrate auth on client startup
export default defineNuxtPlugin(async (nuxtApp) => {
  const auth = useAuthStore();
  await auth.hydrate();
});
