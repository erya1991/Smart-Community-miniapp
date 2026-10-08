<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'
import type { CheckoutRequest, FulfillmentMethod } from '../../../../../../packages/common/types/mall'

const request = reactive<CheckoutRequest>({})
const selectedFulfillment = ref<FulfillmentMethod>('商户配送')
const selectedAddressId = ref('')
const contact = reactive({ name: '', mobile: '' })
const buyerRemark = ref('')
const submitting = ref(false)
const idempotencyKey = `mall-trade-${Date.now()}`
const { status, data, errorMessage, load } = usePageResource(async () => {
  const context = await residentMallService.getCheckout(request)
  if (!context.fulfillmentMethods.includes(selectedFulfillment.value)) selectedFulfillment.value = context.defaultFulfillment
  if (!selectedAddressId.value) selectedAddressId.value = context.defaultAddress?.id || ''
  if (!contact.name) Object.assign(contact, context.contact)
  return context
})
const money = (value: number) => (value / 100).toFixed(2)
const currentAddress = computed(() => data.value?.defaultAddress?.id === selectedAddressId.value ? data.value.defaultAddress : undefined)
const fulfillmentHint = (method: FulfillmentMethod) => method === '商户配送' ? '商户安排社区内配送，需使用收货地址。' : method === '社区自提' ? '备货后凭核销码到大光路社区服务点取货。' : '支付成功后生成核销码，到门店人工核对后核销。'
const switchFulfillment = (method: FulfillmentMethod) => { selectedFulfillment.value = method }
const chooseAddress = () => openSubPage('/pages/member/address/index?select=1')
const submit = async () => {
  if (!data.value || submitting.value) return
  if (selectedFulfillment.value === '商户配送' && !selectedAddressId.value) { uni.showToast({ title: '商户配送请先选择收货地址', icon: 'none' }); return }
  submitting.value = true
  try {
    const order = await residentMallService.createOrder({ ...request, fulfillmentMethod: selectedFulfillment.value, addressId: selectedAddressId.value || undefined, contact: { ...contact }, buyerRemark: buyerRemark.value, idempotencyKey })
    openSubPage(`/pages/pay/result/index?orderId=${order.id}`)
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '订单提交失败', icon: 'none' }); load() } finally { submitting.value = false }
}
onLoad((options) => {
  request.productId = typeof options?.productId === 'string' ? options.productId : undefined
  request.skuId = typeof options?.skuId === 'string' ? options.skuId : undefined
  request.quantity = typeof options?.quantity === 'string' ? Number(options.quantity) : undefined
  request.cartIds = typeof options?.cartIds === 'string' && options.cartIds ? decodeURIComponent(options.cartIds).split(',').filter(Boolean) : undefined
  const fulfillment = typeof options?.fulfillment === 'string' ? decodeURIComponent(options.fulfillment) as FulfillmentMethod : undefined
  if (fulfillment) selectedFulfillment.value = fulfillment
  load()
})
onShow(() => { if (data.value) load() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary :with-bottom-action="true" @retry="load">
    <template #navbar><AppNavbar title="确认订单" centered show-back /></template>
    <view v-if="data" class="stack confirm-page">
      <view class="confirm-tip"><AppIcon name="verified" :size="18" /><text>正在结算 {{ data.merchantName }} 的订单；一次结算只生成一个商户订单。</text></view>
      <BaseCard><view class="section-title"><AppIcon name="car" :size="20" /><text>选择履约方式</text></view><view class="fulfillment-list"><view v-for="method in data.fulfillmentMethods" :key="method" class="fulfillment-option" :class="{ 'fulfillment-option--active': selectedFulfillment === method }" @click="switchFulfillment(method)"><view><text>{{ method }}</text><text>{{ fulfillmentHint(method) }}</text></view><text class="radio">{{ selectedFulfillment === method ? '✓' : '' }}</text></view></view></BaseCard>
      <BaseCard v-if="selectedFulfillment === '商户配送'" class="address-summary" @click="chooseAddress"><view class="section-title"><AppIcon name="location" :size="20" /><text>收货地址</text><text class="section-link">{{ currentAddress ? '更换' : '选择' }} ›</text></view><view v-if="currentAddress" class="address-summary__body"><view><text>{{ currentAddress.name }}</text><text>{{ currentAddress.mobile }}</text><text class="default-tag">默认</text></view><text>{{ currentAddress.region }}{{ currentAddress.detail }}</text></view><view v-else class="address-summary__empty">请选择配送收货地址</view></BaseCard>
      <BaseCard v-else class="pickup-summary"><view class="section-title"><AppIcon name="store" :size="20" /><text>{{ selectedFulfillment === '社区自提' ? '自提点' : '核销门店' }}</text></view><text class="pickup-summary__name">{{ selectedFulfillment === '社区自提' ? '大光路社区服务点（生鲜恒温柜）' : data.storeName }}</text><text>{{ selectedFulfillment === '社区自提' ? '开放时间 08:30—20:00，备货完成后请出示核销码。' : data.storeAddress }}</text></BaseCard>
      <BaseCard><view class="section-title"><AppIcon name="user" :size="20" /><text>联系人</text><text v-if="selectedFulfillment !== '商户配送'" class="section-hint">自提/核销必填</text></view><view class="contact-row"><input v-model="contact.name" maxlength="20" placeholder="联系人" /><input v-model="contact.mobile" type="number" maxlength="11" placeholder="手机号" /></view></BaseCard>
      <BaseCard><view class="merchant-heading"><AppIcon name="store" :size="20" /><text>{{ data.merchantName }}（{{ data.storeName }}）</text></view><view v-for="item in data.items" :key="item.skuId" class="order-item"><image :src="item.productImage" mode="aspectFill" /><view><text>{{ item.productName }}</text><text>规格：{{ item.skuName }}</text><text class="order-item__price">¥{{ money(item.unitPrice) }}</text></view><text>× {{ item.quantity }}</text></view><view class="remark-area"><text>买家留言</text><textarea v-model="buyerRemark" maxlength="100" auto-height placeholder="选填，请与商户协商后填写" /></view><view class="after-sale-note"><AppIcon name="verified" :size="16" /><text>售后说明：{{ data.afterSaleNote }}</text></view></BaseCard>
      <BaseCard class="amount-card"><view class="section-title"><AppIcon name="bill" :size="20" /><text>金额明细</text></view><view class="amount-row"><text>商品金额</text><text>¥{{ money(data.goodsAmount) }}</text></view><view class="amount-row"><text>配送费</text><text>¥{{ money(data.deliveryFee) }}</text></view><view v-if="data.discountAmount" class="amount-row"><text>优惠</text><text>-¥{{ money(data.discountAmount) }}</text></view><view class="amount-total"><text>应付金额</text><text>¥{{ money(data.payableAmount) }}</text></view></BaseCard>
      <view class="confirm-footer"><AppIcon name="verified" :size="16" /><text>提交前将重新校验商品、SKU、价格、库存、履约条件与交易资格。</text></view>
    </view>
    <BottomActionBar><view class="payable"><text>实付金额</text><text>¥{{ money(data?.payableAmount || 0) }}</text></view><AppButton :loading="submitting" @click="submit">提交订单</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.confirm-page { gap:$space-3; }.confirm-tip { display:flex; align-items:flex-start; gap:$space-2; padding:$space-3; border-radius:$radius-card; background:$color-primary-light; color:$color-text-secondary; font-size:14px; line-height:21px; }.section-title,.merchant-heading { display:flex; min-height:28px; align-items:center; gap:$space-2; padding-bottom:$space-3; border-bottom:1px solid rgba(225,228,230,.72); font-size:17px; font-weight:700; }.section-link { margin-left:auto; color:$color-primary; font-size:14px; font-weight:500; }.section-hint { margin-left:auto; color:$color-text-secondary; font-size:12px; font-weight:400; }.fulfillment-list { display:flex; flex-direction:column; gap:$space-2; padding-top:$space-3; }.fulfillment-option { display:flex; min-height:68px; align-items:center; justify-content:space-between; gap:$space-3; padding:$space-3; border:1px solid $color-border; border-radius:$radius-md; background:$color-group-bg; }.fulfillment-option--active { border-color:$color-primary; background:$color-primary-light; }.fulfillment-option > view { display:flex; min-width:0; flex-direction:column; gap:3px; color:$color-text-secondary; font-size:12px; line-height:18px; }.fulfillment-option > view text:first-child { color:$color-text-primary; font-size:16px; font-weight:700; }.radio { display:flex; width:24px; height:24px; flex:none; align-items:center; justify-content:center; border:1px solid $color-border; border-radius:50%; color:#fff; }.fulfillment-option--active .radio { border-color:$color-primary; background:$color-primary; }.address-summary__body,.pickup-summary { display:flex; flex-direction:column; gap:$space-2; padding-top:$space-3; color:$color-text-secondary; font-size:14px; line-height:21px; }.address-summary__body > view { display:flex; align-items:center; gap:$space-2; color:$color-text-primary; }.address-summary__body > view text:first-child { font-size:17px; font-weight:700; }.default-tag { padding:2px 6px; border-radius:$radius-sm; background:$color-primary-light; color:$color-primary; font-size:11px; }.address-summary__empty { padding-top:$space-3; color:$color-error; font-size:14px; }.pickup-summary__name { color:$color-text-primary; font-size:16px; font-weight:700; }.contact-row { display:grid; grid-template-columns:1fr 1.4fr; gap:$space-2; padding-top:$space-3; }.contact-row input { min-width:0; height:44px; padding:0 $space-3; border:1px solid $color-border; border-radius:$radius-md; background:$color-group-bg; font-size:14px; }.merchant-heading { padding-top:0; }.order-item { display:flex; align-items:center; gap:$space-3; padding:$space-3 0; border-bottom:1px solid rgba(225,228,230,.72); }.order-item image { width:64px; height:64px; flex:none; border-radius:$radius-md; background:$color-group-bg; }.order-item > view { display:flex; min-width:0; flex:1; flex-direction:column; gap:3px; }.order-item > view text:first-child { overflow:hidden; font-size:16px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }.order-item > view text:nth-child(2) { color:$color-text-secondary; font-size:13px; }.order-item > text { color:$color-text-secondary; font-size:14px; }.order-item__price { color:$color-accent !important; font-size:17px !important; font-weight:700; }.remark-area { display:flex; flex-direction:column; gap:$space-2; padding-top:$space-3; font-size:15px; font-weight:600; }.remark-area textarea { min-height:44px; padding:$space-2 $space-3; border-radius:$radius-md; background:$color-group-bg; color:$color-text-primary; font-size:14px; line-height:20px; }.after-sale-note { display:flex; align-items:flex-start; gap:4px; margin-top:$space-3; padding:$space-2; border-radius:$radius-sm; background:$color-primary-light; color:$color-text-secondary; font-size:12px; line-height:18px; }.amount-card { padding-bottom:$space-3; }.amount-row,.amount-total { display:flex; align-items:center; justify-content:space-between; padding-top:$space-3; color:$color-text-secondary; font-size:15px; }.amount-total { margin-top:$space-3; padding-top:$space-3; border-top:1px dashed $color-border; color:$color-text-primary; font-weight:700; }.amount-total text:last-child { color:$color-accent; font-size:24px; }.confirm-footer { display:flex; align-items:flex-start; gap:4px; padding:$space-2 $space-1; color:$color-text-secondary; font-size:12px; line-height:18px; }.payable { display:flex; min-width:118px; align-items:baseline; flex-direction:column; justify-content:center; gap:2px; }.payable text:first-child { color:$color-text-secondary; font-size:12px; }.payable text:last-child { color:$color-accent; font-size:23px; font-weight:700; }.bottom-action :deep(.app-button) { flex:1; }
</style>
