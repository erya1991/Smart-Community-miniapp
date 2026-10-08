<script setup lang="ts">
import { computed } from 'vue'
import type { ProductSummary } from '../../common/types/app'
import type { ResidentMallProductSummary } from '../../common/types/mall'
import AppIcon from './AppIcon.vue'

type CardProduct = ProductSummary | ResidentMallProductSummary
const props = withDefaults(defineProps<{ product: CardProduct; variant?: 'default' | 'home' }>(), { variant: 'default' })
const emit = defineEmits<{ add: [product: CardProduct]; open: [product: CardProduct] }>()
const handleAdd = () => {
  emit('add', props.product)
}
const homeProduct = computed(() => props.product as ProductSummary)
const imageSource = computed(() => props.variant === 'home' ? homeProduct.value.homeImage || props.product.image : props.product.image)
const displayName = computed(() => props.variant === 'home' ? homeProduct.value.homeName || props.product.name : props.product.name)
const displayMerchant = computed(() => 'storeName' in props.product ? props.product.storeName : props.variant === 'home' ? homeProduct.value.homeMerchantName || props.product.merchantName : props.product.merchantName)
const sellingPoint = computed(() => 'sellingPoint' in props.product ? props.product.sellingPoint : '')
const salesCount = computed(() => 'salesCount' in props.product ? props.product.salesCount : undefined)
const unavailable = computed(() => props.product.soldOut || ('purchaseEligibility' in props.product && !props.product.purchaseEligibility.allowed))
const displayPrice = computed(() => props.variant === 'home' ? homeProduct.value.homePrice ?? props.product.price : props.product.price)
const stockLabel = computed(() => props.product.soldOut ? '已售罄' : 'stockTight' in props.product && props.product.stockTight ? '库存紧张' : '')
</script>

<template>
  <view class="product-card" :class="`product-card--${props.variant}`" hover-class="product-card--pressed" @click="emit('open', props.product)">
    <view class="product-card__image" :style="{ background: props.product.imageTone }"><image v-if="imageSource" :src="imageSource" mode="aspectFill" /><text v-if="stockLabel" class="product-card__stock" :class="{ 'product-card__stock--sold-out': props.product.soldOut }">{{ stockLabel }}</text></view>
    <view class="product-card__body">
      <template v-if="props.variant === 'home'">
        <text class="product-card__name">{{ displayName }}</text>
        <view class="product-card__merchant"><text class="product-card__store">{{ displayMerchant }}</text></view>
      </template>
      <template v-else>
        <view class="product-card__merchant"><AppIcon name="shop" :size="14" /><text class="product-card__store">{{ displayMerchant }}</text></view>
        <text class="product-card__name">{{ props.product.name }}</text>
        <text class="product-card__tag">{{ props.product.fulfillment }}</text>
      </template>
      <text v-if="sellingPoint" class="product-card__point">{{ sellingPoint }}</text>
      <text v-if="salesCount !== undefined" class="product-card__sales">已售 {{ salesCount }} 件</text>
      <view class="product-card__bottom">
        <text class="price"><text class="product-card__currency">¥</text>{{ displayPrice.toFixed(2) }}</text>
        <view class="product-card__add-hit" @click.stop="handleAdd"><view class="product-card__add" :class="{ 'product-card__add--disabled': unavailable }"><AppIcon name="plus" :size="20" /></view></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.product-card { overflow: hidden; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04); }
.product-card--pressed { opacity: 0.78; }
.product-card__image { position: relative; display: flex; height: 164px; align-items: center; justify-content: center; overflow: hidden; }
.product-card__stock { position: absolute; bottom: $space-2; left: $space-2; padding: $space-1 $space-2; border-radius: $radius-sm; background: $color-warning-light; color: $color-text-primary; font-size: 13px; font-weight: 500; }.product-card__stock--sold-out { background: $color-group-bg; color: $color-text-primary; }
.product-card__image image { width: 100%; height: 100%; }
.product-card__body { padding: $space-3; }
.product-card__merchant { display: flex; align-items: center; gap: 4px; overflow: hidden; color: $color-text-secondary; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.product-card__store { display: block; min-width: 0; flex: 1; overflow: hidden; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.product-card__name { display: -webkit-box; min-height: 50px; overflow: hidden; margin-top: $space-1; color: $color-text-primary; font-size: 16px; font-weight: 600; line-height: 24px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-card__tag { display: inline-block; margin-top: $space-2; padding: 2px $space-2; border-radius: $radius-sm; background: $color-group-bg; color: $color-text-secondary; font-size: 12px; }
.product-card__point { display: block; overflow: hidden; margin-top: $space-2; color: $color-text-secondary; font-size: 13px; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
.product-card__sales { display: block; margin-top: $space-1; color: $color-text-secondary; font-size: 13px; line-height: 18px; }
.product-card__bottom { display: flex; align-items: center; justify-content: space-between; margin-top: $space-3; }
.product-card__currency { font-size: 13px; }
.product-card__add-hit { display: flex; width: $touch-target-min; height: $touch-target-min; flex: none; align-items: center; justify-content: center; }
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
