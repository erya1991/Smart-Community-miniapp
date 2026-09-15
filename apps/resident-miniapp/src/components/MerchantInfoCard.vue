<script setup lang="ts">
import StatusTag from './StatusTag.vue'
import IconContainer from './IconContainer.vue'
import AppIcon from './AppIcon.vue'
import BaseCard from './BaseCard.vue'

withDefaults(defineProps<{ name: string; storeName: string; projectName: string; status: string; businessHours?: string }>(), { businessHours: '07:00 - 21:30' })
</script>

<template>
  <BaseCard>
    <view class="merchant-info">
      <IconContainer icon="shop" size="lg" />
      <view class="merchant-info__main">
        <view class="merchant-info__headline"><text class="merchant-info__name">{{ name }}</text><StatusTag tone="success">{{ status }}</StatusTag></view>
        <view class="merchant-info__meta"><text>{{ projectName }} · {{ storeName }}</text><AppIcon name="chevron-right" :size="13" /></view>
      </view>
      <view class="merchant-info__hours"><text>今日营业时段</text><text>{{ businessHours }}</text></view>
    </view>
  </BaseCard>
</template>

<style scoped lang="scss">
.merchant-info { display: flex; align-items: center; gap: $space-3; }
.merchant-info__icon { display: flex; width: 56px; height: 56px; align-items: center; justify-content: center; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; font-weight: 700; }
.merchant-info__main { flex: 1; min-width: 0; }
.merchant-info__headline { display: flex; align-items: center; gap: $space-2; }
.merchant-info__name { overflow: hidden; font-size: 17px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.merchant-info__meta { display: flex; align-items: center; gap: 2px; margin-top: $space-1; color: $color-text-secondary; font-size: 14px; }
.merchant-info__meta text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.merchant-info__hours { display: flex; flex: none; align-items: flex-end; flex-direction: column; gap: 2px; color: $color-text-secondary; font-size: 12px; }
.merchant-info__hours text:last-child { color: $color-text-primary; font-size: 16px; font-weight: 600; }
</style>
