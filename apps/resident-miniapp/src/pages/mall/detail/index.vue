<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import AppButton from '@/components/AppButton.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import CatalogActionFeedback from '@/features/mall/CatalogActionFeedback.vue'
import SkuPickerSheet from '@/features/mall/SkuPickerSheet.vue'
import { openPage, openSubPage } from '@/utils/navigation'
import { findSelectedSku, getSkuSelectionIssue, getSkuSpecValues, getSpecificationGroups, isSellableSku, isSpecValueAvailable } from '../../../../../../packages/common/utils/mallCatalog'

const productId = ref('')
const selectedValues = ref<Record<string, string>>({})
const quantity = ref(1)
const showSkuSheet = ref(false)
const sheetAction = ref<'select' | 'add' | 'buy'>('select')
const isSubmitting = ref(false)
const actionMessage = ref('')
const cartCount = ref(0)
const galleryIndex = ref(0)
const { status, data, errorMessage, load, refresh } = usePageResource(async () => {
  const [detail, count] = await Promise.all([residentMallService.getDetail(productId.value), residentMallService.getCartCount()])
  const groups = getSpecificationGroups(detail)
  selectedValues.value = Object.fromEntries(Object.entries(selectedValues.value).filter(([name, value]) => groups.some((group) => group.name === name && group.values.includes(value))))
  if (detail.skus.length === 1 && !findSelectedSku(detail, selectedValues.value)) selectedValues.value = getSkuSpecValues(detail, detail.skus[0])
  cartCount.value = count
  return detail
})
const selectedSku = computed(() => data.value ? findSelectedSku(data.value, selectedValues.value) : undefined)
const displaySku = computed(() => selectedSku.value || data.value?.skus.find((item) => item.id === data.value?.currentSkuId))
const canPurchase = computed(() => status.value === 'ready' && Boolean(data.value?.purchaseEligibility.allowed && data.value.skus.some(isSellableSku)))
const selectionIssue = computed(() => !data.value ? '商品加载中' : !data.value.purchaseEligibility.allowed ? data.value.purchaseEligibility.reason : getSkuSelectionIssue(data.value, selectedValues.value, quantity.value))
const gallery = computed(() => Array.from(new Set([displaySku.value?.image, ...(data.value?.gallery || []), data.value?.mainImage].filter((item): item is string => Boolean(item)))))
watch(() => selectedSku.value?.id, () => { galleryIndex.value = 0 })
const money = (value = 0) => (value / 100).toFixed(2)
const selectSpec = (name: string, value: string) => {
  if (isSubmitting.value || !data.value) return
  const isSelected = selectedValues.value[name] === value
  if (!isSelected && !isSpecValueAvailable(data.value, selectedValues.value, name, value)) return
  const nextValues = { ...selectedValues.value }
  if (isSelected) delete nextValues[name]
  else nextValues[name] = value
  selectedValues.value = nextValues
  actionMessage.value = ''
}
const changeQuantity = (value: number) => { if (!isSubmitting.value && Number.isSafeInteger(value) && value > 0) { quantity.value = value; actionMessage.value = '' } }
const openSkuSheet = (action: 'select' | 'add' | 'buy') => { if (!isSubmitting.value) { sheetAction.value = action; actionMessage.value = ''; showSkuSheet.value = true } }
const previewImage = (current: string) => uni.previewImage({ current, urls: gallery.value })
const fulfillmentHint = (method: string) => {
  if (method === '商户配送') return data.value?.deliveryNote
  if (method === '社区自提') return data.value?.fulfillmentMethods.length === 1 ? data.value.deliveryNote : '取货地点与时间以确认订单信息为准，备货后凭取货码取货。'
  return `到店后凭核销码人工核对，门店地址：${data.value?.storeAddress || ''}`
}
const submitSku = async () => {
  if (selectionIssue.value || isSubmitting.value || !data.value || !selectedSku.value) return
  if (sheetAction.value === 'select') { showSkuSheet.value = false; return }
  isSubmitting.value = true
  actionMessage.value = ''
  try {
    if (sheetAction.value === 'add') {
      await residentMallService.addCart(data.value.id, selectedSku.value.id, selectedSku.value.price, quantity.value)
      cartCount.value = await residentMallService.getCartCount()
      showSkuSheet.value = false
      uni.showToast({ title: '已加入购物车', icon: 'success' })
    } else {
      const request = await residentMallService.prepareBuyNow(data.value.id, selectedSku.value.id, quantity.value, selectedSku.value.price)
      showSkuSheet.value = false
      openSubPage(`/pages/mall/confirm/index?productId=${encodeURIComponent(request.productId!)}&skuId=${encodeURIComponent(request.skuId!)}&quantity=${request.quantity}`)
    }
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '商品暂不可购买，请刷新后重试。'
    uni.showToast({ title: actionMessage.value, icon: 'none' })
    await load()
  } finally { isSubmitting.value = false }
}
onBackPress(() => { if (showSkuSheet.value) { if (!isSubmitting.value) showSkuSheet.value = false; return true } return false })
onLoad((options) => { productId.value = typeof options?.id === 'string' ? options.id : ''; load() })
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="商品详情" centered show-back /></template>
    <view v-if="data" class="stack detail-page">
      <view class="hero"><swiper class="hero__swiper" :current="galleryIndex" :circular="gallery.length > 1" @change="galleryIndex = $event.detail.current"><swiper-item v-for="photo in gallery" :key="photo"><image :src="photo" mode="aspectFill" @click="previewImage(photo)" /></swiper-item></swiper><text class="hero__count">{{ galleryIndex + 1 }} / {{ gallery.length }}</text></view>
      <BaseCard class="summary-card"><view class="summary-price"><text>¥{{ money(displaySku?.price) }}</text><text v-if="displaySku?.marketPrice" class="summary-market">¥{{ money(displaySku.marketPrice) }}</text><text class="summary-unit"> / 份</text></view><text class="summary-name">{{ data.name }}</text><text class="summary-point">{{ data.sellingPoint }}</text><view class="summary-metrics"><text>已售 {{ data.salesCount || 0 }} 件</text><text v-if="data.reviewCount !== undefined">{{ data.reviewCount }} 条评价</text></view><view v-if="!canPurchase" class="sold-out"><AppIcon name="bag" :size="15" /><text>{{ data.purchaseEligibility.allowed ? '商品已售罄，请稍后再来。' : data.purchaseEligibility.reason }}</text></view><view v-else-if="selectedSku && selectedSku.availableStock > 0 && selectedSku.availableStock <= selectedSku.warningStock" class="stock-tight"><AppIcon name="bell" :size="15" /><text>库存紧张，仅剩 {{ selectedSku.availableStock }} 件</text></view></BaseCard>
      <BaseCard><view class="sku-entry" @click="openSkuSheet('select')"><view><text class="sku-entry__title">规格与数量</text><text>{{ selectedSku ? `已选：${selectedSku.name} · ${quantity} 件` : '请选择规格与购买数量' }}</text></view><text class="sku-entry__action">选择规格 ›</text></view><CatalogActionFeedback :message="actionMessage" @retry="actionMessage = ''; load()" /></BaseCard>
      <BaseCard><view class="section-title"><view /><text>履约方式说明</text></view><text class="fulfillment-supported">支持：{{ data.fulfillmentMethods.join(' / ') }}</text><view class="fulfillment-notes"><view v-for="method in data.fulfillmentMethods" :key="method"><text>{{ method }}</text><text>{{ fulfillmentHint(method) }}</text></view></view><text class="fulfillment-next">请在确认订单页选择履约方式。</text></BaseCard>
      <BaseCard class="merchant-card"><view class="merchant-card__icon"><AppIcon name="store" :size="24" /></view><view class="merchant-card__main"><text>{{ data.merchantName }}<text v-if="data.storeName !== data.merchantName">（{{ data.storeName }}）</text></text><text>{{ data.storeAddress }}</text></view></BaseCard>
      <BaseCard><view class="section-title"><view /><text>商品说明与售后</text></view><view class="info-row"><text>商品详情</text><text>{{ data.detail }}</text></view><view class="info-row"><text>配送说明</text><text>{{ data.deliveryNote }}</text></view><view class="info-row"><text>售后说明</text><text>{{ data.afterSaleNote }}</text></view></BaseCard>
    </view>
    <template #tabbar><BottomActionBar v-if="status === 'ready'" class="detail-actions"><view class="cart-shortcut" @click="openSubPage('/pages/mall/cart/index')"><view class="cart-shortcut__icon"><AppIcon name="cart" :size="23" /><text v-if="cartCount" class="cart-shortcut__badge">{{ cartCount > 99 ? '99+' : cartCount }}</text></view><text>购物车</text></view><AppButton variant="secondary" :disabled="!canPurchase || isSubmitting" @click="openSkuSheet('add')">加入购物车</AppButton><AppButton :disabled="!canPurchase || isSubmitting" @click="openSkuSheet('buy')">立即购买</AppButton></BottomActionBar><BottomActionBar v-else-if="status === 'error'"><AppButton variant="secondary" @click="openPage('/pages/mall/index')">返回商城</AppButton></BottomActionBar><SkuPickerSheet v-if="showSkuSheet && status === 'ready' && data" :product="data" :selected-values="selectedValues" :quantity="quantity" :action="sheetAction" :busy="isSubmitting" :message="actionMessage" @close="showSkuSheet = false" @select="selectSpec" @quantity="changeQuantity" @submit="submitSku" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.detail-page { gap: $space-3; }.hero { position: relative; height: 286px; overflow: hidden; background: $color-group-bg; }.hero image { width: 100%; height: 100%; }.hero__count { position: absolute; right: $space-3; bottom: $space-3; padding: 4px $space-2; border-radius: 999px; background: rgba(0,0,0,.6); color: #fff; font-size: 12px; }.summary-card { margin-top: -$space-2; }.summary-price { display: flex; align-items: baseline; gap: $space-2; color: $color-accent; font-size: 30px; font-weight: 700; }.summary-market { color: $color-text-disabled; font-size: 14px; text-decoration: line-through; }.summary-unit { color: $color-text-secondary; font-size: 14px; font-weight: 400; }.summary-name { display: block; margin-top: $space-2; font-size: 22px; font-weight: 700; }.summary-point { display: block; margin-top: $space-2; color: $color-text-secondary; font-size: 15px; line-height: 22px; }.sold-out,.stock-tight { display: flex; align-items: center; gap: 4px; margin-top: $space-3; padding: $space-2; border-radius: $radius-sm; font-size: 13px; }.sold-out { background: $color-group-bg; color: $color-text-secondary; }.stock-tight { background: $color-warning-light; color: $color-warning; }.section-title { display: flex; align-items: center; gap: $space-2; padding-bottom: $space-3; border-bottom: 1px solid rgba(225,228,230,.72); font-size: 17px; font-weight: 700; }.section-title > view { width: 4px; height: 18px; border-radius: 999px; background: $color-primary; }.merchant-card { display: flex; align-items: center; gap: $space-3; }.merchant-card__icon { display: flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; }.merchant-card__main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }.merchant-card__main text:first-child { font-size: 17px; font-weight: 700; }.merchant-card__main text:not(:first-child) { color: $color-text-secondary; font-size: 13px; }.info-row { display: grid; grid-template-columns: 74px 1fr; gap: $space-3; padding: $space-3 0; border-bottom: 1px solid rgba(225,228,230,.72); font-size: 14px; line-height: 21px; }.info-row:last-child { border: 0; }.info-row text:first-child { color: $color-text-secondary; }.cart-shortcut { display: flex; width: 54px; min-height: $touch-target-min; flex: none; align-items: center; flex-direction: column; justify-content: center; color: $color-text-secondary; font-size: 11px; }
.hero__swiper { width: 100%; height: 100%; }

.summary-metrics { display: flex; flex-wrap: wrap; gap: $space-4; margin-top: $space-3; color: $color-text-secondary; font-size: 13px; line-height: 20px; }
.sku-entry { display: flex; min-height: $touch-target-min; align-items: center; justify-content: space-between; gap: $space-3; }.sku-entry > view { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: $space-2; color: $color-text-secondary; font-size: 15px; line-height: 23px; }.sku-entry__title { color: $color-text-primary; font-size: 17px; font-weight: 600; }.sku-entry__action { flex: none; color: $color-primary; font-size: 14px; }
.fulfillment-supported { display: block; margin-top: $space-3; color: $color-text-primary; font-size: 15px; line-height: 24px; }.fulfillment-notes { display: flex; flex-direction: column; gap: $space-3; margin-top: $space-3; }.fulfillment-notes > view { display: flex; flex-direction: column; gap: $space-1; color: $color-text-secondary; font-size: 14px; line-height: 22px; }.fulfillment-notes > view > text:first-child { color: $color-text-primary; font-weight: 600; }.fulfillment-next { display: block; margin-top: $space-3; color: $color-text-secondary; font-size: 13px; line-height: 20px; }
.cart-shortcut { width: $touch-target-min; }.cart-shortcut__icon { position: relative; display: flex; align-items: center; justify-content: center; }.cart-shortcut__badge { position: absolute; top: -6px; right: -12px; min-width: 18px; padding: 1px 4px; border-radius: 999px; background: $color-accent; color: #fff; font-size: 11px; text-align: center; }
.detail-actions :deep(.bottom-action__inner .app-button) { flex: 1; padding: 0 $space-2; font-size: 15px; }
.merchant-card__main > text:not(:first-child) { line-height: 21px; }
</style>
