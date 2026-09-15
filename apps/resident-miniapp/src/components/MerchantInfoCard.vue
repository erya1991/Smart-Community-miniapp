<script setup lang="ts">
import StatusTag from './StatusTag.vue'
import IconContainer from './IconContainer.vue'

defineProps<{ name: string; storeName: string; projectName: string; status: string }>()
</script>

<template>
  <BaseCard>
    <view class="merchant-info">
      <IconContainer icon="shop" size="lg" />
      <view class="merchant-info__main">
        <view class="merchant-info__headline"><text class="merchant-info__name">{{ name }}</text><StatusTag tone="success">{{ status }}</StatusTag></view>
        <text class="merchant-info__meta">{{ projectName }} · {{ storeName }}</text>
      </view>
    </view>
  </BaseCard>
</template>

<style scoped lang="scss">
.merchant-info { display: flex; align-items: center; gap: $space-3; }
.merchant-info__icon { display: flex; width: 56px; height: 56px; align-items: center; justify-content: center; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; font-weight: 700; }
.merchant-info__main { flex: 1; min-width: 0; }
.merchant-info__headline { display: flex; align-items: center; gap: $space-2; }
.merchant-info__name { overflow: hidden; font-size: 17px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.merchant-info__meta { display: block; margin-top: $space-1; color: $color-text-secondary; font-size: 14px; }
</style>
