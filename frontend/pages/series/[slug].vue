<script setup lang="ts">
// หน้าซีรีส์ใช้หน้าเดียวกับหนัง (ข้อมูลอยู่ในตาราง Movie เดียวกัน แยกด้วย mediaType)
import MediaDetail from '~/pages/movies/[slug].vue';
</script>

<template>
  <MediaDetail />
</template>
