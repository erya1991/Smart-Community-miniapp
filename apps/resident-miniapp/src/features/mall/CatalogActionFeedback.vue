<script setup lang="ts">
import { openSubPage } from '@/utils/navigation'

defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <view v-if="message" class="catalog-feedback">
    <text>{{ message }}</text>
    <view class="catalog-feedback__actions"><button @click="emit('retry')">刷新商品</button><button @click="openSubPage('/pages/mall/cart/index')">查看购物车</button></view>
  </view>
</template>

<style scoped lang="scss">
.catalog-feedback { margin-bottom: $space-3; padding: $space-3; border-radius: $radius-sm; background: $color-error-light; color: $color-error; font-size: 15px; line-height: 22px; }
.catalog-feedback__actions { display: flex; flex-wrap: wrap; gap: $space-2; margin-top: $space-1; }
.catalog-feedback__actions button { display: flex; min-height: $touch-target-min; align-items: center; justify-content: center; margin: 0; padding: 0 $space-3; border: 1px solid $color-border; border-radius: $radius-sm; background: $color-card-bg; color: $color-primary; font-size: 15px; }.catalog-feedback__actions button::after { border: 0; }
</style>
