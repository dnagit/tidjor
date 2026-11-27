// Google Analytics 4 (gtag.js)
// ทำงานเฉพาะเมื่อตั้ง NUXT_PUBLIC_GA_ID (เช่น G-XXXXXXXXXX) — ไม่ตั้ง = ไม่โหลดอะไรเลย
// การเปลี่ยนหน้าแบบ SPA นับให้อัตโนมัติจาก Enhanced measurement ของ GA4
// ("Page changes based on browser history events" — เปิดไว้เป็นค่าเริ่มต้น)
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export default defineNuxtPlugin(() => {
  const id = useRuntimeConfig().public.gaId as string;
  if (!id || window.location.pathname.startsWith('/admin')) return;

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
});
