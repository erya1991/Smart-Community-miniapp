<script setup lang="ts">
defineProps<{ title: string; actionText?: string }>()
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <view class="section-header">
    <view class="section-header__title-wrap">
      <view class="section-header__accent" />
      <text class="section-header__title">{{ title }}</text>
    </view>
    <view v-if="actionText" class="section-header__action" hover-class="section-header__action--pressed" @click="emit('action')">{{ actionText }} ›</view>
  </view>
</template>

<style scoped lang="scss">
.section-header { display: flex; min-height: $touch-target-min; align-items: center; justify-content: space-between; }
.section-header__title-wrap { display: flex; align-items: center; gap: $space-2; }
.section-header__accent { width: 4px; height: 18px; border-radius: 999px; background: $color-primary; }
.section-header__title { font-size: 18px; line-height: 28px; font-weight: 700; }
.section-header__action { min-height: $touch-target-min; background: transparent; color: $color-text-secondary; font-size: 14px; }
.section-header__action--pressed { color: $color-primary; }
</style>
