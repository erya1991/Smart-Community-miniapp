<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string }>(), { title: '功能建设中', description: '该专题尚未完成详细设计，当前仅保留入口。' })
</script>

<template><view class="feature-unavailable"><text class="feature-unavailable__title">{{ title }}</text><text class="feature-unavailable__description">{{ description }}</text></view></template>

<style scoped lang="scss">
.feature-unavailable { padding: $space-5; border-radius: $radius-card; background: $color-group-bg; text-align: center; }
.feature-unavailable__title, .feature-unavailable__description { display: block; }
.feature-unavailable__title { font-size: 16px; font-weight: 600; }
.feature-unavailable__description { margin-top: $space-1; color: $color-text-secondary; font-size: 13px; }
</style>

