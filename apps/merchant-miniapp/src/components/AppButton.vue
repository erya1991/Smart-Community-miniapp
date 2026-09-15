<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'quiet'
  disabled?: boolean
}>(), { variant: 'primary', disabled: false })
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button class="app-button" :class="`app-button--${variant}`" :disabled="disabled" @click="emit('click')"><slot /></button>
</template>

<style scoped lang="scss">
.app-button { display: flex; width: 100%; height: $button-height; align-items: center; justify-content: center; border-radius: $radius-md; font-size: 16px; font-weight: 600; }
.app-button--primary { background: $color-primary; color: #fff; }
.app-button--secondary { border: 1px solid $color-primary; background: #fff; color: $color-primary; }
.app-button--quiet { height: 42px; background: $color-primary-light; color: $color-primary; }
.app-button[disabled] { opacity: 0.48; }
</style>

