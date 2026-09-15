<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(defineProps<{ modelValue?: string; placeholder?: string }>(), { modelValue: '', placeholder: '搜索' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const handleInput = (event: Event) => {
  emit('update:modelValue', (event as Event & { detail: { value: string } }).detail.value)
}
</script>

<template>
  <view class="search-bar">
    <AppIcon name="search" :size="21" />
    <input class="search-bar__input" :value="modelValue" :placeholder="placeholder" @input="handleInput" />
  </view>
</template>

<style scoped lang="scss">
.search-bar { display: flex; height: 48px; align-items: center; gap: $space-2; padding: 0 $space-4; border: 1px solid $color-border; border-radius: $radius-md; background: #fff; box-shadow: 0 3px 12px rgba(27, 77, 83, 0.03); }
.search-bar__input { flex: 1; color: $color-text-primary; font-size: 15px; }
</style>
