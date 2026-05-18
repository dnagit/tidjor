<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number;
  max?: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>(), { max: 10, readonly: false, size: 'md' });

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>();
const hover = ref(0);
const sizeClass = computed(() => ({
  sm: 'text-base', md: 'text-xl', lg: 'text-3xl',
}[props.size]));

function setRating(n: number) {
  if (!props.readonly) emit('update:modelValue', n);
}
</script>

<template>
  <div class="inline-flex items-center gap-0.5" :class="sizeClass">
    <button
      v-for="n in max"
      :key="n"
      type="button"
      :disabled="readonly"
      @mouseenter="!readonly && (hover = n)"
      @mouseleave="hover = 0"
      @click="setRating(n)"
      class="leading-none transition disabled:cursor-default"
      :class="(hover || modelValue) >= n ? 'text-brand-500' : 'text-gray-300'"
    >★</button>
    <span v-if="!readonly" class="ml-2 text-sm text-gray-600">{{ hover || modelValue }}/{{ max }}</span>
  </div>
</template>
