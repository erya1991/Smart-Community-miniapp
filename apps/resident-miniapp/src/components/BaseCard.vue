<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>

<template>
  <view class="base-card" :class="{ 'base-card--padded': padded }"><slot /></view>
</template>

<style scoped lang="scss">
.base-card {
  overflow: hidden;
  border: 1px solid $color-border;
  border-radius: 18px;
  background: $color-card-bg;
  box-shadow: 0 4px 16px rgba(27, 77, 83, 0.055);
}

.base-card--padded { padding: $space-4 $space-5; }
</style>
