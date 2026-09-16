<script setup lang="ts">
import StatusTag from './StatusTag.vue'
import IconContainer from './IconContainer.vue'
import AppIcon from './AppIcon.vue'
import BaseCard from './BaseCard.vue'

withDefaults(defineProps<{ name: string; storeName: string; projectName: string; status: string; businessHours?: string; compact?: boolean }>(), { businessHours: '07:00 - 21:30', compact: false })
</script>

<template>
  <BaseCard :padded="!compact">
    <view class="merchant-info" :class="{ 'merchant-info--compact': compact }">
      <IconContainer icon="shop" :size="compact ? 'sm' : 'lg'" />
      <view class="merchant-info__main">
        <view class="merchant-info__headline"><text class="merchant-info__name">{{ name }}</text><StatusTag tone="success">{{ status }}</StatusTag></view>
        <view class="merchant-info__meta"><text class="merchant-info__project">{{ projectName }} · {{ storeName }}</text><text v-if="compact" class="merchant-info__hours-inline">{{ businessHours }}</text><AppIcon name="chevron-right" :size="13" /></view>
      </view>
      <view v-if="!compact" class="merchant-info__hours"><text>今日营业时段</text><text>{{ businessHours }}</text></view>
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
.merchant-info__project { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.merchant-info__hours { display: flex; flex: none; align-items: flex-end; flex-direction: column; gap: 2px; color: $color-text-secondary; font-size: 12px; }
.merchant-info__hours text:last-child { color: $color-text-primary; font-size: 16px; font-weight: 600; }
.merchant-info--compact { min-height: 76px; gap: $space-2; padding: $space-3; }
.merchant-info--compact .merchant-info__headline { gap: $space-1; }
.merchant-info--compact .merchant-info__name { font-size: 16px; }
.merchant-info--compact .merchant-info__meta { gap: $space-1; margin-top: 2px; font-size: 12px; }
.merchant-info--compact .merchant-info__project { flex: 1; min-width: 0; }
.merchant-info__hours-inline { flex: none; color: $color-text-primary; font-size: 12px; font-weight: 600; white-space: nowrap; }
.merchant-info--compact :deep(.status-tag) { min-height: 22px; padding: 0 6px; font-size: 12px; }
</style>
