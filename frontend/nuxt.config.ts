// https://nuxt.com/docs/api/configuration/nuxt-config
const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap';

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },
  ssr: true,

  devServer: {
    port: 3003,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      titleTemplate: '%s | ติดจอ',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#FFC107' },
      ],
      link: [
        // ไอคอนไฟล์เล็ก (เดิมใช้ logo.jpg 111 KB ซึ่งแย่งแบนด์วิดท์กับรูปแรกของหน้า)
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://image.tmdb.org' },
        // ฟอนต์: โหลดแบบไม่บล็อกการแสดงผล (media=print แล้วสลับเป็น all เมื่อโหลดเสร็จ)
        // หน้าแสดงด้วยฟอนต์ระบบก่อน แล้วค่อยเปลี่ยนเป็นฟอนต์จริง — ไม่ต้องรอไฟล์จากอีกโดเมนก่อนวาดหน้า
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'preload', as: 'style', href: GOOGLE_FONTS },
        { rel: 'stylesheet', href: GOOGLE_FONTS, media: 'print', onload: "this.media='all'" },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4000',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'ติดจอ',
      gaId: process.env.NUXT_PUBLIC_GA_ID || '',
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL || '',
    },
  },

  // หน้า admin ใช้ session ฝั่ง client (localStorage) → ปิด SSR กันหลุด login ตอน refresh
  routeRules: {
    '/admin/**': { ssr: false },
    // หน้าแรกเหมือนกันทุกคน (สถานะ login อยู่ฝั่ง browser) → cache ผล render 5 นาที ลด TTFB
    '/': { swr: 300 },
  },

  // โปรเจกต์อยู่ใน ~/Documents (iCloud sync) → iCloud คอยแตะไฟล์ .nuxt/.DS_Store ทำให้ dev restart วนไม่หยุด
  // สั่ง watcher ไม่ต้องสน path พวกนี้ (ทางแก้ถาวรคือย้ายโปรเจกต์ออกนอก iCloud Documents)
  ignore: ['**/.DS_Store', '**/.nuxt/**', '**/node_modules/**'],

  vite: {
    server: {
      watch: {
        ignored: ['**/.nuxt/**', '**/node_modules/**', '**/.git/**', '**/.DS_Store', '**/dist/**'],
      },
    },
  },

});
