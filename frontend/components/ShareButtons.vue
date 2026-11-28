<script setup lang="ts">
// แชร์ไป LINE / Facebook / X หรือคัดลอกลิงก์ — มือถือใช้เมนูแชร์ของเครื่อง (Web Share) ถ้ามี
const props = defineProps<{ title: string; path?: string; contentType?: string; itemId?: string }>();
const route = useRoute();
const config = useRuntimeConfig();
const url = computed(() => `${config.public.siteUrl.replace(/\/+$/, '')}${props.path || route.path}`);
const enc = encodeURIComponent;
const copied = ref(false);
const canNativeShare = ref(false);
onMounted(() => { canNativeShare.value = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches; });

const log = (method: string) => track('share', { method, content_type: props.contentType, item_id: props.itemId || props.path || route.path });
function open(method: string, href: string) {
  log(method);
  window.open(href, '_blank', 'noopener,width=600,height=600');
}
async function nativeShare() {
  try { await navigator.share({ title: props.title, url: url.value }); log('native'); } catch { /* ยกเลิก */ }
}
async function copy() {
  try { await navigator.clipboard.writeText(url.value); copied.value = true; log('copy'); setTimeout(() => (copied.value = false), 2000); } catch { /* ignore */ }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-gray-500">แชร์:</span>
    <button v-if="canNativeShare" type="button" class="btn-outline text-sm py-1.5" @click="nativeShare">📤 แชร์</button>
    <button type="button" class="rounded-lg px-3 py-1.5 text-white font-medium bg-[#06C755] hover:opacity-90" @click="open('line', `https://social-plugins.line.me/lineit/share?url=${enc(url)}`)">LINE</button>
    <button type="button" class="rounded-lg px-3 py-1.5 text-white font-medium bg-[#1877F2] hover:opacity-90" @click="open('facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`)">Facebook</button>
    <button type="button" class="rounded-lg px-3 py-1.5 text-white font-medium bg-black hover:opacity-80" @click="open('x', `https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`)">X</button>
    <button type="button" class="btn-outline text-sm py-1.5" @click="copy">{{ copied ? '✓ คัดลอกแล้ว' : '🔗 คัดลอกลิงก์' }}</button>
  </div>
</template>
