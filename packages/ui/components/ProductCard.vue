<script setup lang="ts">
import { computed } from 'vue'
import type { ProductSummary } from '../../common/types/app'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ product: ProductSummary; variant?: 'default' | 'home' }>(), { variant: 'default' })
const imageSource = computed(() => props.variant === 'home' ? props.product.homeImage || props.product.image : props.product.image)
const displayName = computed(() => props.variant === 'home' ? props.product.homeName || props.product.name : props.product.name)
const displayMerchant = computed(() => props.variant === 'home' ? props.product.homeMerchantName || props.product.merchantName : props.product.merchantName)
const displayPrice = computed(() => props.variant === 'home' ? props.product.homePrice ?? props.product.price : props.product.price)
</script>

<template>
  <view class="product-card" :class="`product-card--${props.variant}`">
    <view class="product-card__image" :style="{ background: props.product.imageTone }"><image v-if="imageSource" :src="imageSource" mode="aspectFill" /></view>
    <view class="product-card__body">
      <template v-if="props.variant === 'home'">
        <text class="product-card__name">{{ displayName }}</text>
        <view class="product-card__merchant"><text>{{ displayMerchant }}</text></view>
      </template>
      <template v-else>
        <view class="product-card__merchant"><AppIcon name="shop" :size="14" /><text>{{ props.product.merchantName }}</text></view>
        <text class="product-card__name">{{ props.product.name }}</text>
        <text class="product-card__tag">{{ props.product.fulfillment }}</text>
      </template>
      <view class="product-card__bottom">
        <text class="price"><text class="product-card__currency">¥</text>{{ displayPrice.toFixed(2) }}</text>
        <view class="product-card__add" :class="{ 'product-card__add--disabled': props.product.soldOut }"><AppIcon name="plus" :size="20" /></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.product-card { overflow: hidden; border: 1px solid $color-border; border-radius: 16px; background: #fff; box-shadow: 0 3px 12px rgba(27, 77, 83, 0.05); }
.product-card__image { display: flex; height: 138px; align-items: center; justify-content: center; overflow: hidden; }
.product-card__image image { width: 100%; height: 100%; }
.product-card__body { padding: $space-3; }
.product-card__merchant { display: flex; align-items: center; gap: 4px; overflow: hidden; color: $color-text-secondary; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.product-card__name { display: -webkit-box; min-height: 50px; overflow: hidden; margin-top: $space-1; color: $color-text-primary; font-size: 16px; font-weight: 600; line-height: 24px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-card__tag { display: inline-block; margin-top: $space-2; padding: 2px $space-2; border-radius: $radius-sm; background: $color-group-bg; color: $color-text-secondary; font-size: 12px; }
.product-card__bottom { display: flex; align-items: center; justify-content: space-between; margin-top: $space-3; }
.product-card__currency { font-size: 13px; }
.product-card__add { display: flex; width: $touch-target-min; height: $touch-target-min; align-items: center; justify-content: center; border-radius: 50%; background: $color-primary-light; color: $color-primary; font-size: 22px; }
.product-card__add--disabled { opacity: 0.45; }

.product-card--home {
  border-color: rgba(225, 228, 230, 0.72);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04);
}

.product-card--home .product-card__image { height: 142px; }
.product-card--home .product-card__body { padding: 12px; }
.product-card--home .product-card__name { min-height: 48px; margin-top: 0; font-size: 15px; line-height: 22px; }
.product-card--home .product-card__merchant { margin-top: 2px; font-size: 13px; }
.product-card--home .product-card__bottom { margin-top: 8px; }
.product-card--home .price { color: $color-primary; font-size: 18px; font-weight: 600; }
.product-card--home .product-card__add { width: 36px; height: 36px; background: #c3edf0; }
</style>
