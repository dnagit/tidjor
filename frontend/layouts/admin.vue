<template>
  <div class="min-h-screen flex bg-gray-50">
    <aside class="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
      <NuxtLink to="/" class="flex items-center gap-2 mb-6 px-2">
        <span class="text-2xl">🎬</span>
        <span class="font-display text-xl font-bold">ติดจอ Admin</span>
      </NuxtLink>
      <AdminNavLink to="/admin" icon="📊">Dashboard</AdminNavLink>
      <AdminNavLink to="/admin/movies" icon="🎞️">หนัง</AdminNavLink>
      <AdminNavLink to="/admin/reviews" icon="✍️">รีวิว</AdminNavLink>
      <AdminNavLink to="/admin/users" icon="👥">ผู้ใช้</AdminNavLink>
      <AdminNavLink to="/admin/genres" icon="🏷️">หมวดหมู่</AdminNavLink>
      <div class="mt-auto pt-4 border-t">
        <NuxtLink to="/" class="btn-ghost w-full justify-start text-sm">← กลับหน้าเว็บ</NuxtLink>
      </div>
    </aside>
    <main class="flex-1 p-8">
      <slot />
    </main>
  </div>
</template>
