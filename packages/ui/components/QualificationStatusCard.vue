<script setup lang="ts">
import StatusTag from './StatusTag.vue'
defineProps<{ title: string; status: string; tone?: 'success' | 'pending' | 'error' | 'disabled'; description?: string }>()
</script>

<template>
  <view class="qualification-status"><view class="qualification-status__heading"><text>{{ title }}</text><StatusTag :tone="tone || 'pending'">{{ status }}</StatusTag></view><text v-if="description" class="qualification-status__description">{{ description }}</text><view class="qualification-status__body"><slot /></view></view>
</template>

<style scoped lang="scss">
.qualification-status { padding: $space-4; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: #fff; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04); }
.qualification-status__heading { display: flex; align-items: center; justify-content: space-between; gap: $space-3; font-size: 18px; font-weight: 700; }
.qualification-status__description { display: block; margin-top: $space-2; color: $color-text-secondary; font-size: 14px; }
.qualification-status__body { margin-top: $space-3; }
</style>
