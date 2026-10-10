<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import FormField from '@/components/FormField.vue'
import EvidenceUploader from '@/components/EvidenceUploader.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import AppButton from '@/components/AppButton.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentAfterSaleService as service } from '@/services/after-sale'
import { formatMoneyFromFen as money } from '@/utils/navigation'
import type { AfterSaleServiceType } from '@/types/after-sale'

const orderId = ref(''), skuId = ref(''), quantity = ref(1)
const type = ref<AfterSaleServiceType>('RETURN_MONEY'), reason = ref(''), description = ref(''), amount = ref(''), images = ref<string[]>([])
const busy = ref(false), quoting = ref(false), message = ref('')
const idempotencyKey = 'after-sale-apply-' + Date.now() + '-' + Math.random().toString(36).slice(2)
const { status, data, errorMessage, load, refresh } = usePageResource(() => service.getEligibility(orderId.value, skuId.value, quantity.value))
const changeQuantity = async (delta: number) => {
  if (busy.value || quoting.value || !data.value) return
  const next = quantity.value + delta
  if (next < 1 || next > data.value.availableQuantity) return
  quantity.value = next; quoting.value = true
  try { await refresh(); if (data.value) amount.value = money(data.value.maxRefundAmount) }
  finally { quoting.value = false }
}
const chooseImages = () => {
  if (busy.value || images.value.length >= 6) return
  uni.chooseImage({ count: 6 - images.value.length, sizeType: ['compressed'], success: result => { images.value = [...images.value, ...result.tempFilePaths].slice(0, 6) }, fail: () => { message.value = '图片未选择，可稍后重试。' } })
}
const submit = async () => {
  if (busy.value || quoting.value || !data.value?.allowRefund) return
  message.value = ''
  if (!reason.value) { message.value = '请选择申请原因。'; return }
  if (!/^\d+(\.\d{1,2})?$/.test(amount.value)) { message.value = '请输入有效退款金额，最多两位小数。'; return }
  const [yuan, cents = ''] = amount.value.split('.')
  const fen = Number(yuan) * 100 + Number(cents.padEnd(2, '0'))
  if (!Number.isSafeInteger(fen) || fen <= 0 || fen > data.value.maxRefundAmount) { message.value = '退款金额必须大于零且不能超过可退上限。'; return }
  busy.value = true
  try {
    const record = await service.create({ orderId: orderId.value, skuId: skuId.value, quantity: quantity.value, serviceType: type.value, reason: reason.value, problemDesc: description.value, images: [...images.value], applyRefundAmount: fen, idempotencyKey })
    uni.redirectTo({ url: '/pages/after-sale/detail/index?id=' + encodeURIComponent(record.id) })
  } catch (error) { message.value = error instanceof Error ? error.message : '申请未提交，请重试。'; await refresh() }
  finally { busy.value = false }
}
onLoad(async options => { orderId.value = options?.orderId || ''; skuId.value = options?.skuId || ''; await load(); if (data.value) amount.value = money(data.value.maxRefundAmount) })
</script>
<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="申请售后" centered show-back /></template>
    <view v-if="data" class="stack apply-page">
      <view class="notice">申请由商家审核，退款结果由平台支付/退款服务确认。</view>
      <BaseCard><text class="section-title">{{ data.order.merchantName }}（{{ data.order.storeName }}）</text><view class="goods"><image :src="data.item.productImage" mode="aspectFill" /><view><text>{{ data.item.productName }}</text><text>{{ data.item.skuName }}</text><text>购买 {{ data.item.quantity }} 件 · 商品实付 ¥{{ money(data.itemPaidAmount) }}</text></view></view><text class="muted">订单 {{ data.order.no }} · {{ data.order.fulfillmentStatus }}</text></BaseCard>
      <BaseCard><text class="section-title">售后类型</text><view v-for="option in data.serviceTypes" :key="option.value" class="type-option" :class="{ selected: type === option.value }" @click="!busy && (type = option.value)"><view><text>{{ option.label }}</text><text>{{ option.description }}</text></view><text>{{ type === option.value ? '✓' : '○' }}</text></view></BaseCard>
      <BaseCard><view class="quantity-row"><view><text>申请数量</text><text class="muted">最多 {{ data.availableQuantity }} 件；售后中 {{ data.activeQuantity }} 件</text></view><view class="stepper"><button :disabled="busy || quoting || quantity <= 1" @click="changeQuantity(-1)">−</button><text>{{ quantity }}</text><button :disabled="busy || quoting || quantity >= data.availableQuantity" @click="changeQuantity(1)">＋</button></view></view></BaseCard>
      <BaseCard><FormField label="申请原因" required><picker :range="data.reasons" :disabled="busy" @change="reason = data!.reasons[Number($event.detail.value)]"><view class="picker-value">{{ reason || '请选择申请原因' }} ›</view></picker></FormField><FormField label="退款金额（元）" required :hint="'最多可退 ¥' + money(data.maxRefundAmount)"><input v-model="amount" type="digit" maxlength="14" :disabled="busy || quoting" placeholder="请输入退款金额" /></FormField><text class="muted">可退金额由系统按商品实际支付金额核算。</text></BaseCard>
      <BaseCard><FormField label="问题描述" :hint="description.length + ' / 500'"><textarea v-model="description" maxlength="500" auto-height :disabled="busy" placeholder="请说明商品问题，便于商家处理" /></FormField><text class="section-title evidence-title">图片凭证（最多 6 张）</text><EvidenceUploader :files="images" images :max-files="6" :readonly="busy" @add="chooseImages" @remove="images.splice($event, 1)" /></BaseCard>
      <text v-if="data.reason || message" class="error-message" role="alert">{{ message || data.reason }}</text>
    </view>
    <BottomActionBar><AppButton :loading="busy" :disabled="quoting || !data?.allowRefund" @click="submit">提交申请</AppButton></BottomActionBar>
  </AppPage>
</template>
<style scoped lang="scss">
.apply-page { gap:$space-3; }.notice { padding:$space-3; border-radius:$radius-md; background:$color-primary-light; color:$color-primary; font-size:14px; line-height:22px; }.section-title { display:block; font-size:17px; font-weight:600; }.goods { display:flex; gap:12px; margin:16px 0; }.goods image { width:72px; height:72px; flex:none; border-radius:$radius-md; }.goods > view { display:flex; flex:1; min-width:0; flex-direction:column; gap:6px; overflow-wrap:anywhere; font-size:15px; }.goods > view text:first-child { font-size:16px; font-weight:600; }.muted { display:block; color:$color-text-secondary; font-size:13px; line-height:21px; overflow-wrap:anywhere; }.type-option { display:flex; align-items:center; gap:12px; margin-top:12px; padding:14px; border:1px solid $color-border; border-radius:$radius-md; background:$color-group-bg; }.type-option > view { flex:1; min-width:0; }.type-option > view text { display:block; }.type-option > view text:first-child { font-size:17px; font-weight:600; }.type-option > view text:last-child { margin-top:6px; color:$color-text-secondary; font-size:13px; line-height:21px; }.type-option.selected { border:2px solid $color-primary; background:$color-primary-light; }.quantity-row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }.quantity-row > view:first-child { min-width:0; flex:1; }.stepper { display:flex; align-items:center; gap:8px; }.stepper button { display:flex; width:44px; height:44px; align-items:center; justify-content:center; margin:0; padding:0; font-size:20px; }.picker-value { display:flex; min-height:48px; align-items:center; font-size:16px; }.evidence-title { margin:18px 0 12px; }.error-message { color:$color-error; font-size:15px; line-height:23px; overflow-wrap:anywhere; }input,textarea { font-size:16px; }textarea { min-height:96px; }
</style>
