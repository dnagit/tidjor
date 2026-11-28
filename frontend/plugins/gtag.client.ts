// Google Analytics 4 (gtag.js)
// ทำงานเฉพาะเมื่อ 1) ตั้ง NUXT_PUBLIC_GA_ID และ 2) ผู้ใช้กดยอมรับคุกกี้วิเคราะห์ (PDPA)
// การเปลี่ยนหน้าแบบ SPA นับให้อัตโนมัติจาก Enhanced measurement ของ GA4
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export default defineNuxtPlugin(() => {
  const id = useRuntimeConfig().public.gaId as string;
  const { consent, ready, KEY } = useConsent();

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'all' || saved === 'necessary') consent.value = saved;
  } catch { /* private mode */ }
  ready.value = true;

  if (!id) return;
  let loaded = false;
  const load = () => {
    if (loaded || window.location.pathname.startsWith('/admin')) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag ต้องส่ง arguments object ไม่ใช่ array
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  };

  watch(consent, (c) => {
    if (c === 'all') load();
    // ถอนความยินยอมหลังโหลดไปแล้ว → ปิดการส่งข้อมูลทันที
    else if (loaded) window.gtag('consent', 'update', { analytics_storage: 'denied' });
  }, { immediate: true });
});
