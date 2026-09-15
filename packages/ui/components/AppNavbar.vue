<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(defineProps<{
  title: string
  subtitle?: string
  showBrand?: boolean
  centered?: boolean
}>(), {
  subtitle: '',
  showBrand: false,
  centered: false,
})
</script>

<template>
  <view class="navbar">
    <view class="navbar__inner" :class="{ 'navbar__inner--centered': centered }">
      <view v-if="showBrand" class="navbar__mark"><AppIcon name="brand-building" :size="22" /></view>
      <view class="navbar__copy">
        <text class="navbar__title">{{ title }}</text>
        <text v-if="subtitle" class="navbar__subtitle">{{ subtitle }}</text>
      </view>
      <view class="navbar__capsule">•••　◉</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.navbar {
  padding-top: var(--status-bar-height, 24px);
  background: rgba(248, 249, 252, 0.96);
  border-bottom: 1px solid rgba(225, 228, 230, 0.6);
}

.navbar__inner {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: $space-2;
  padding: 0 $page-gutter;
}

.navbar__mark {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: $color-primary-light;
}

.navbar__copy {
  flex: 1;
  min-width: 0;
}

.navbar__inner--centered .navbar__copy { text-align: center; }
.navbar__inner--centered::before { width: 84px; content: ''; }

.navbar__title,
.navbar__subtitle {
  display: block;
}

.navbar__title {
  font-size: 17px;
  font-weight: 700;
}

.navbar__subtitle {
  color: $color-text-secondary;
  font-size: 13px;
}

.navbar__capsule {
  min-width: 84px;
  padding: 5px 10px;
  border: 1px solid rgba(95, 103, 105, 0.22);
  border-radius: 999px;
  color: $color-text-secondary;
  font-size: 13px;
  text-align: right;
}
</style>
