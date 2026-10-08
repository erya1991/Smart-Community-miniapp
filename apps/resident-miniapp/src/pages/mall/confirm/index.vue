<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import FormSection from '@/components/FormSection.vue'
import FormField from '@/components/FormField.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { checkoutAddressSelection } from '@/features/checkoutAddress'
import { openSubPage } from '@/utils/navigation'
import type { CheckoutGroupChoice, CheckoutRequest, MemberAddress } from '../../../../../../packages/common/types/mall'

const request = reactive<CheckoutRequest>({})
const choices = ref<CheckoutGroupChoice[]>([])
const selectedAddressId = ref('')
const selectedAddress = ref<MemberAddress>()
const contact = reactive({ name: '', mobile: '' })
const submitting = ref(false)
const submittedTradeId = ref('')
const actionError = ref('')
const contactErrors = reactive({ name: '', mobile: '' })
const addressError = ref('')
const idempotencyKey = 'checkout-' + Date.now() + '-' + Math.random().toString(36).slice(2)
const money = (value: number) => (value / 100).toFixed(2)
const { status, data, errorMessage, load } = usePageResource(async () => {
  const context = await residentMallService.getCheckout(request)
  // Keep this session's choices and remarks while refreshing its quote.
  choices.value = context.merchantGroups.map((group) => {
    const old = choices.value.find((entry) => entry.storeId === group.storeId)
    return old || { storeId: group.storeId, fulfillmentMethod: group.defaultFulfillment, pickupPointId: group.pickupPoints[0]?.id, buyerRemark: '' }
  })
  const selection = checkoutAddressSelection.get(idempotencyKey)
  selectedAddressId.value = selection || selectedAddressId.value || context.defaultAddress?.id || ''
  selectedAddress.value = selectedAddressId.value ? await residentMallService.getAddress(selectedAddressId.value) : undefined
  if (!contact.name && !contact.mobile) Object.assign(contact, context.contact)
  return context
})
const needsAddress = computed(() => choices.value.some((choice) => ['商户配送', '普通物流'].includes(choice.fulfillmentMethod)))
const itemCount = computed(() => data.value?.merchantGroups.reduce((sum, group) => sum + group.items.reduce((count, item) => count + item.quantity, 0), 0) || 0)
const chooseAddress = () => openSubPage('/pages/member/address/index?select=1&checkoutKey=' + encodeURIComponent(idempotencyKey))
const refresh = () => load()
const submit = async () => {
  if (submitting.value || submittedTradeId.value || !data.value) return
  contactErrors.name = contact.name.trim() ? '' : '请填写联系人'
  contactErrors.mobile = /^1\d{10}$/.test(contact.mobile.trim()) ? '' : '请输入正确的 11 位手机号'
  addressError.value = needsAddress.value && !selectedAddress.value ? '请选择完整收货地址' : ''
  if (contactErrors.name || contactErrors.mobile || addressError.value) { actionError.value = '请先完善收货信息。'; return }
  submitting.value = true; actionError.value = ''
  try {
    const trade = await residentMallService.createTrade({
      ...request, merchantGroups: choices.value.map((choice) => ({ ...choice })),
      addressId: selectedAddressId.value || undefined, contact: { ...contact },
      expectedItems: data.value.merchantGroups.flatMap((group) => group.items),
      expectedPayableAmount: data.value.payableAmount, idempotencyKey,
    })
    submittedTradeId.value = trade.tradeId
    checkoutAddressSelection.clear(idempotencyKey)
    uni.redirectTo({ url: '/pages/pay/result/index?tradeId=' + encodeURIComponent(trade.tradeId) })
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '提交失败，请重试。'
  } finally { submitting.value = false }
}
const continuePayment = () => uni.redirectTo({ url: '/pages/pay/result/index?tradeId=' + encodeURIComponent(submittedTradeId.value) })
onLoad((options) => {
  request.productId = options?.productId
  request.skuId = options?.skuId
  if (options?.quantity !== undefined) request.quantity = Number(options.quantity)
  if (options?.cartIds) request.cartIds = decodeURIComponent(options.cartIds).split(',').filter(Boolean)
  load()
})
onShow(async () => {
  if (!data.value || submittedTradeId.value) return
  const selection = checkoutAddressSelection.get(idempotencyKey)
  selectedAddressId.value = selection || selectedAddressId.value
  selectedAddress.value = selectedAddressId.value ? await residentMallService.getAddress(selectedAddressId.value) : undefined
})
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="确认订单" centered show-back /></template>
    <view v-if="data" class="stack confirm-page">
      <view class="checkout-tip"><AppIcon name="verified" :size="19" /><text>共 {{ data.merchantGroups.length }} 家商户、{{ itemCount }} 件商品。请逐店确认履约信息，统一提交并支付。</text></view>
      <BaseCard v-if="actionError" class="error-card"><text>{{ actionError }}</text><AppButton variant="quiet" @click="refresh">刷新商品和价格</AppButton></BaseCard>
      <BaseCard v-if="needsAddress">
        <view class="section-head"><AppIcon name="location" :size="20" /><text>收货地址</text><button class="text-action" :disabled="submitting" @click="chooseAddress">{{ selectedAddress ? '更换地址' : '选择地址' }} ›</button></view>
        <view v-if="selectedAddress" class="address-box"><view><text>{{ selectedAddress.name }} {{ selectedAddress.mobile }}</text><text v-if="selectedAddress.isDefault" class="default-tag">默认</text></view><text>{{ selectedAddress.region }}{{ selectedAddress.detail }}</text></view>
        <text v-else class="secondary">商户配送和普通物流需选择收货地址。</text>
        <text v-if="addressError" class="field-error">{{ addressError }}</text>
      </BaseCard>
      <FormSection title="联系人">
        <FormField label="联系人" required><input v-model="contact.name" :disabled="submitting" maxlength="20" placeholder="取货或收货联系人" /><text v-if="contactErrors.name" class="field-error">{{ contactErrors.name }}</text></FormField>
        <FormField label="手机号" required><input v-model="contact.mobile" :disabled="submitting" type="number" maxlength="11" placeholder="11 位手机号" /><text v-if="contactErrors.mobile" class="field-error">{{ contactErrors.mobile }}</text></FormField>
      </FormSection>
      <BaseCard v-for="(group, index) in data.merchantGroups" :key="group.storeId">
        <view class="section-head"><AppIcon name="store" :size="21" /><text>{{ group.merchantName }}（{{ group.storeName }}）</text></view>
        <view v-for="item in group.items" :key="item.productId + item.skuId" class="goods-row"><image :src="item.productImage" mode="aspectFill" /><view><text class="goods-name">{{ item.productName }}</text><text class="secondary">规格：{{ item.skuName }}</text><view class="goods-price"><text>¥{{ money(item.unitPrice) }}</text><text>× {{ item.quantity }}</text></view></view></view>
        <text class="field-label">履约方式</text>
        <view class="fulfillment-options"><button v-for="method in group.fulfillmentMethods" :key="method" :disabled="submitting" :class="{ selected: choices[index].fulfillmentMethod === method }" @click="choices[index].fulfillmentMethod = method">{{ method }}</button></view>
        <view v-if="choices[index].fulfillmentMethod === '商户配送'" class="fulfillment-info">{{ group.deliveryNote }}</view>
        <view v-else-if="choices[index].fulfillmentMethod === '普通物流'" class="fulfillment-info">使用上方收货地址；物流信息将在支付后由商户更新。本次运费 ¥{{ money(group.deliveryFee) }}。</view>
        <view v-else-if="choices[index].fulfillmentMethod === '社区自提'" class="fulfillment-info"><view v-for="point in group.pickupPoints" :key="point.id"><button class="point-choice" :disabled="submitting" @click="choices[index].pickupPointId = point.id"><text>{{ choices[index].pickupPointId === point.id ? '✓ ' : '' }}{{ point.name }}</text></button><text>{{ point.address }}</text><text>电话：{{ point.mobile }} · {{ point.hours }}</text><text>{{ point.instructions }}</text></view></view>
        <view v-else class="fulfillment-info"><text>{{ group.verificationStore.name }}</text><text>{{ group.verificationStore.address }}</text><text>电话：{{ group.verificationStore.mobile }} · {{ group.verificationStore.hours }}</text><text>{{ group.verificationStore.instructions }}</text></view>
        <text class="field-label">给本商户的备注（选填）</text><textarea v-model="choices[index].buyerRemark" :disabled="submitting" maxlength="100" placeholder="如需无接触放置，请与商户协商后填写" auto-height /><text class="remark-count">{{ choices[index].buyerRemark.length }}/100</text>
        <view class="amount-row"><text>商品金额</text><text>¥{{ money(group.goodsAmount) }}</text></view><view class="amount-row"><text>配送费 / 运费</text><text>¥{{ money(group.deliveryFee) }}</text></view><view v-if="group.discountAmount" class="amount-row"><text>优惠</text><text>−¥{{ money(group.discountAmount) }}</text></view><view class="amount-row subtotal"><text>本商户小计</text><text>¥{{ money(group.payableAmount) }}</text></view>
      </BaseCard>
      <BaseCard><text class="field-label">金额明细</text><view class="amount-row"><text>商品金额</text><text>¥{{ money(data.goodsAmount) }}</text></view><view class="amount-row"><text>配送费 / 运费</text><text>¥{{ money(data.deliveryFee) }}</text></view><view class="amount-row"><text>优惠</text><text>−¥{{ money(data.discountAmount) }}</text></view><view class="amount-row subtotal"><text>合计（{{ itemCount }} 件）</text><text>¥{{ money(data.payableAmount) }}</text></view></BaseCard>
      <text class="checkout-footer">请在提交前核对商品规格与履约信息。</text>
    </view>
    <BottomActionBar v-if="data"><view class="bottom-amount"><text>应付金额</text><text>¥{{ money(data.payableAmount) }}</text></view><AppButton :loading="submitting" :disabled="submitting" @click="submittedTradeId ? continuePayment() : submit()">{{ submittedTradeId ? '前往支付' : '提交订单' }}</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.confirm-page { gap:$space-3; }.checkout-tip { display:flex; gap:$space-2; padding:$space-3; border-radius:$radius-card; background:$color-primary-light; color:$color-primary; font-size:15px; line-height:23px; }.section-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; }.section-head > text { flex:1; min-width:0; font-size:17px; font-weight:600; line-height:25px; }.text-action { flex:none; color:$color-primary; min-height:44px; }
button { margin:0; padding:0; background:transparent; font-size:15px; line-height:normal; }button::after { border:none; }.secondary { display:block; color:$color-text-secondary; font-size:14px; line-height:22px; }.address-box { background:$color-primary-light; border-radius:$radius-md; padding:12px; font-size:15px; line-height:24px; }.address-box > view { display:flex; flex-wrap:wrap; gap:8px; }.address-box > text { display:block; }.default-tag { font-size:12px; color:$color-primary; }
input { min-height:44px; font-size:16px; }textarea { box-sizing:border-box; width:100%; min-height:64px; padding:12px; background:$color-group-bg; border-radius:$radius-md; font-size:15px; line-height:24px; }.goods-row { display:flex; gap:12px; padding:12px 0; }.goods-row image { width:76px; height:76px; flex:none; border-radius:$radius-md; }.goods-row > view { flex:1; min-width:0; }.goods-name { display:block; font-size:16px; font-weight:600; line-height:24px; }.goods-price { display:flex; flex-wrap:wrap; justify-content:space-between; margin-top:6px; }.goods-price text:first-child { color:$color-accent; font-size:18px; font-weight:700; }
.field-label { display:block; margin:16px 0 8px; font-size:16px; font-weight:600; }.fulfillment-options { display:flex; flex-wrap:wrap; gap:8px; }.fulfillment-options button { padding:10px 12px; min-height:44px; background:$color-group-bg; border-radius:$radius-md; color:$color-text-secondary; }.fulfillment-options button.selected { color:#fff; background:$color-primary; }.fulfillment-info { margin-top:12px; padding:12px; border-radius:$radius-md; background:$color-primary-light; font-size:15px; line-height:24px; overflow-wrap:anywhere; }.fulfillment-info text { display:block; }.point-choice { min-height:44px; text-align:left; color:$color-primary; }.remark-count { display:block; text-align:right; font-size:13px; color:$color-text-secondary; }.amount-row { display:flex; justify-content:space-between; gap:12px; padding-top:10px; font-size:15px; color:$color-text-secondary; }.subtotal { font-weight:600; color:$color-text-primary; }.subtotal text:last-child { color:$color-accent; font-size:20px; }.bottom-amount { display:flex; min-width:0; flex:1; flex-wrap:wrap; align-items:center; gap:6px; font-size:13px; }.bottom-amount text:last-child { color:$color-accent; font-size:24px; font-weight:700; }.checkout-footer { text-align:center; color:$color-text-secondary; font-size:13px; padding:12px 0; }.field-error,.error-card { color:$color-error; font-size:14px; line-height:22px; }.field-error { display:block; }
</style>