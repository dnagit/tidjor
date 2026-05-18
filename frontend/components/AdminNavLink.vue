<script setup lang="ts">
defineProps<{ to: string; icon?: string }>();
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
    active-class="bg-brand-50 text-brand-700 font-semibold"
  >
    <span>{{ icon }}</span>
    <span><slot /></span>
  </NuxtLink>
</template>
