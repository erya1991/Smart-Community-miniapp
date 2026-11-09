<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number; label?: string }>(), {
  size: 24,
  label: '',
})

const iconModules = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  import: 'default',
  query: '?url',
})
const iconSource = computed(() => iconModules[`../assets/icons/${props.name}.svg`] as string | undefined)
</script>

<template>
  <!-- #ifdef H5 -->
  <img
    class="app-icon"
    :src="iconSource"
    :style="{ width: props.size + 'px', height: props.size + 'px', objectFit: 'contain' }"
    :aria-label="props.label"
    :alt="props.label"
    draggable="false"
  />
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <image
    class="app-icon"
    :src="iconSource"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
    mode="aspectFit"
    :aria-label="props.label"
  />
  <!-- #endif -->
</template>

<style scoped lang="scss">
.app-icon {
  display: block;
  flex: none;
}
</style>
