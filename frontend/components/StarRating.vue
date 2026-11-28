<script setup lang="ts">
// ดาวให้คะแนน 1-10
// fluid: ดาวยืด/หดเต็มความกว้างกล่อง (ใช้ในช่องให้คะแนน — ไม่ล้นจอมือถือ)
const props = withDefaults(defineProps<{
  modelValue: number;
  max?: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fluid?: boolean;
  showValue?: boolean;
}>(), { max: 10, readonly: false, size: 'md', fluid: false, showValue: true });

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>();
const hover = ref(0);
const sizeClass = computed(() => (props.fluid
  // sm = กล่องเล็ก (เช่น การ์ดใน Watchlist 2 คอลัมน์) · อื่น ๆ = กว้างเกือบเต็มจอ
  ? (props.size === 'sm' ? 'text-[clamp(0.85rem,3.4vw,1.1rem)]' : 'text-[clamp(1.4rem,7.5vw,2.25rem)]')
  : { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' }[props.size]));

function setRating(n: number) {
  if (!props.readonly) emit('update:modelValue', n);
}
</script>

<template>
  <div class="items-center" :class="[sizeClass, fluid ? 'flex w-full' : 'inline-flex gap-0.5']">
    <div :class="fluid ? 'flex flex-1 justify-between max-w-md' : 'contents'">
      <button
        v-for="n in max"
        :key="n"
        type="button"
        :disabled="readonly"
        :aria-label="readonly ? undefined : `ให้ ${n} คะแนน`"
        @mouseenter="!readonly && (hover = n)"
        @mouseleave="hover = 0"
        @click="setRating(n)"
        class="leading-none transition disabled:cursor-default"
        :class="[(hover || modelValue) >= n ? 'text-brand-500' : 'text-gray-300', fluid && 'py-1']"
      >★</button>
    </div>
    <span v-if="!readonly && showValue" class="ml-2 text-sm text-gray-600 shrink-0 tabular-nums">{{ hover || modelValue }}/{{ max }}</span>
  </div>
</template>
