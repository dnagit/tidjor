<template>
  <!-- pb-16: เว้นที่ให้แถบเมนูล่างจอบนมือถือ (รวม footer) -->
  <div class="min-h-screen flex flex-col bg-gray-50 overflow-x-clip pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <MobileTabBar />
    <CookieBanner />
  </div>
</template>
