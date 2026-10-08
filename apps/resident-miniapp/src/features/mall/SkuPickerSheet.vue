<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import type { MallProductDetail } from '../../../../../packages/common/types/mall'
import { findSelectedSku, getSpecificationGroups, getSkuSelectionIssue, isSpecValueAvailable } from '../../../../../packages/common/utils/mallCatalog'

const props = defineProps<{
  product: MallProductDetail
  selectedValues: Record<string, string>
  quantity: number
  action: 'select' | 'add' | 'buy'
  busy: boolean
  message: string
}>()
const emit = defineEmits<{ close: []; select: [name: string, value: string]; quantity: [value: number]; submit: [] }>()
const groups = computed(() => getSpecificationGroups(props.product))
const sku = computed(() => findSelectedSku(props.product, props.selectedValues))
const price = computed(() => sku.value?.price ?? props.product.skus.find((item) => item.id === props.product.currentSkuId)?.price ?? 0)
const issue = computed(() => !props.product.purchaseEligibility.allowed ? props.product.purchaseEligibility.reason : getSkuSelectionIssue(props.product, props.selectedValues, props.quantity))
const submitLabel = computed(() => props.action === 'add' ? '加入购物车' : props.action === 'buy' ? '立即购买' : '确认规格')
const available = (name: string, value: string) => isSpecValueAvailable(props.product, props.selectedValues, name, value)
const money = (value: number) => (value / 100).toFixed(2)
</script>

<template>
  <view class="sku-sheet-mask" @click.self="!busy && emit('close')" @touchmove.stop.prevent>
    <view class="sku-sheet" role="dialog" aria-modal="true" aria-label="选择商品规格和数量" @click.stop @touchmove.stop>
      <view class="sku-sheet__header">
        <image :src="sku?.image || product.mainImage" mode="aspectFill" />
        <view class="sku-sheet__summary"><text class="sku-sheet__price">¥{{ money(price) }}</text><text>{{ sku ? `库存 ${sku.availableStock} 件` : '请选择完整规格' }}</text><text class="sku-sheet__selected">{{ sku?.name || product.name }}</text></view>
        <button class="sku-sheet__close" aria-label="关闭规格选择" :disabled="busy" @click="emit('close')"><AppIcon name="close" :size="20" /></button>
      </view>
      <scroll-view scroll-y class="sku-sheet__scroll">
        <view class="sku-sheet__body">
          <view v-for="group in groups" :key="group.name" class="sku-sheet__group">
            <text class="sku-sheet__label">{{ group.name }}</text>
            <view class="sku-sheet__options"><button v-for="value in group.values" :key="value" class="sku-sheet__option" :class="{ 'sku-sheet__option--active': selectedValues[group.name] === value }" :disabled="busy || (selectedValues[group.name] !== value && !available(group.name, value))" @click="emit('select', group.name, value)"><text>{{ value }}</text><text v-if="!available(group.name, value)" class="sku-sheet__unavailable">该组合无库存</text></button></view>
          </view>
          <view class="sku-sheet__quantity"><text class="sku-sheet__label">购买数量</text><view class="sku-sheet__counter"><button aria-label="减少购买数量" :disabled="busy || quantity <= 1" @click="emit('quantity', quantity - 1)">−</button><text>{{ quantity }}</text><button aria-label="增加购买数量" :disabled="busy || !sku || quantity >= sku.availableStock" @click="emit('quantity', quantity + 1)">＋</button></view></view>
          <text v-if="issue || message" class="sku-sheet__issue" role="status">{{ message || issue }}</text>
        </view>
      </scroll-view>
      <view class="sku-sheet__footer"><view class="sku-sheet__total"><text>{{ quantity }} 件合计</text><text>¥{{ money(price * quantity) }}</text></view><AppButton :disabled="Boolean(issue)" :loading="busy" @click="emit('submit')">{{ submitLabel }}</AppButton></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.sku-sheet-mask { position: fixed; z-index: 300; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgba(25, 28, 30, .4); }
.sku-sheet { display: flex; width: 100%; max-width: 390px; max-height: 85vh; flex-direction: column; overflow: hidden; border-radius: $radius-sheet $radius-sheet 0 0; background: $color-card-bg; }
.sku-sheet__header { display: flex; align-items: flex-start; gap: $space-3; padding: $space-4; }.sku-sheet__header > image { width: 80px; height: 80px; flex: none; border-radius: $radius-md; }
.sku-sheet__summary { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: $space-1; color: $color-text-secondary; font-size: 14px; line-height: 20px; }.sku-sheet__price { color: $color-accent; font-size: 24px; font-weight: 700; line-height: 30px; }.sku-sheet__selected { color: $color-text-primary; }
.sku-sheet__close { display: flex; width: $touch-target-min; height: $touch-target-min; min-width: $touch-target-min; flex: none; align-items: center; justify-content: center; margin: -$space-2 -$space-2 0 0; padding: 0; border: 0; background: $color-group-bg; }.sku-sheet__close::after { border: 0; }
.sku-sheet__scroll { height: 42vh; min-height: 180px; }.sku-sheet__body { padding: 0 $page-gutter $space-4; }.sku-sheet__group { margin-bottom: $space-4; }.sku-sheet__label { color: $color-text-primary; font-size: 16px; font-weight: 600; line-height: 24px; }
.sku-sheet__options { display: flex; flex-wrap: wrap; gap: $space-2; margin-top: $space-2; }.sku-sheet__option { display: flex; min-height: $touch-target-min; align-items: center; flex-direction: column; justify-content: center; margin: 0; padding: $space-2 $space-3; border: 1px solid $color-border; border-radius: $radius-md; background: $color-group-bg; color: $color-text-primary; font-size: 15px; line-height: 22px; }.sku-sheet__option::after { border: 0; }.sku-sheet__option--active { border-color: $color-primary; background: $color-primary-light; color: $color-primary; font-weight: 600; }.sku-sheet__option[disabled] { color: $color-text-secondary; opacity: .55; }.sku-sheet__unavailable { font-size: 13px; font-weight: 400; }
.sku-sheet__quantity { display: flex; align-items: center; justify-content: space-between; gap: $space-3; }.sku-sheet__counter { display: flex; align-items: center; border: 1px solid $color-border; border-radius: $radius-md; overflow: hidden; }.sku-sheet__counter button { display: flex; width: $touch-target-min; height: $touch-target-min; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 0; background: $color-group-bg; color: $color-text-primary; font-size: 20px; }.sku-sheet__counter button::after { border: 0; }.sku-sheet__counter button[disabled] { opacity: .45; }.sku-sheet__counter > text { min-width: 44px; color: $color-text-primary; font-size: 16px; text-align: center; }
.sku-sheet__issue { display: block; margin-top: $space-3; padding: $space-2 $space-3; border-radius: $radius-sm; background: $color-warning-light; color: $color-text-primary; font-size: 14px; line-height: 22px; }
.sku-sheet__footer { display: flex; align-items: center; gap: $space-3; padding: $space-3 $page-gutter calc(#{$space-3} + env(safe-area-inset-bottom)); border-top: 1px solid $color-border; }.sku-sheet__total { display: flex; min-width: 96px; flex-direction: column; gap: $space-1; color: $color-text-secondary; font-size: 13px; line-height: 18px; }.sku-sheet__total > text:last-child { color: $color-accent; font-size: 22px; font-weight: 700; line-height: 28px; }.sku-sheet__footer :deep(.app-button) { flex: 1; }
</style>
