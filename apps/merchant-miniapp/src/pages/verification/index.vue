<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import ResultState from '@/components/ResultState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { merchantTradeService } from '@/services/trade'
import type { MerchantOrderContext, TradeOrder, VerificationResult } from '@/types/mall'

const code = ref('')
const context = ref<MerchantOrderContext>()
const candidate = ref<VerificationResult | null>(null)
const successOrder = ref<TradeOrder>()
const checking = ref(false)
const saving = ref(false)
const error = ref('')
watch(code, () => { candidate.value = null; successOrder.value = undefined; error.value = '' })
const lookup = async () => {
  if (checking.value || saving.value) return
  candidate.value = null; successOrder.value = undefined; error.value = ''
  if (!code.value.trim()) { error.value = '请扫码或输入核销码。'; return }
  checking.value = true
  try { context.value = await merchantTradeService.getContext(); candidate.value = await merchantTradeService.lookupVerification(code.value) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '凭证查询失败，请重试。' }
  finally { checking.value = false }
}
const scan = () => {
  if (checking.value || saving.value) return
  uni.scanCode({
    success: async ({ result }) => { code.value = result; await nextTick(); await lookup() },
    fail: () => { error.value = '扫码未完成，可手动输入核销码。' },
  })
}
const confirm = async () => {
  if (saving.value || candidate.value?.kind !== 'ready' || !candidate.value.order) return
  const id = candidate.value.order.id
  saving.value = true; error.value = ''
  try {
    const choice = await uni.showModal({ title: '确认核销', content: '请确认居民、商品、数量和核销地点无误。确认后凭证不可再次使用。' })
    if (!choice.confirm) return
    successOrder.value = await merchantTradeService.confirmVerification(id)
    candidate.value = null
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '核销失败，请刷新凭证。'
    candidate.value = null
  } finally { saving.value = false }
}
onLoad(async (options) => {
  context.value = await merchantTradeService.getContext()
  code.value = typeof options?.code === 'string' ? options.code : ''
  // Navigation only fills the code; the merchant still queries and confirms it.
})
</script>

<template>
  <AppPage secondary :with-bottom-action="candidate?.kind === 'ready'">
    <template #navbar><AppNavbar title="订单核销" centered show-back /></template>
    <view class="stack verification-page">
      <BaseCard class="store-card"><AppIcon name="store" :size="22" /><view><text>当前核销门店 / 操作点</text><text>{{ context?.storeName || '正在读取门店' }}</text><text class="operator-name">{{ context?.operatorName }}</text></view><StatusTag tone="success">本店订单</StatusTag></BaseCard>
      <BaseCard>
        <view class="section-title"><AppIcon name="qr" :size="21" /><text>现场核销操作</text></view>
        <text class="scan-description">扫描居民出示的社区自提或到店核销码，或手动输入凭证查询。扫码只查询，核对后另行确认核销。</text>
        <AppButton :disabled="checking || saving" @click="scan"><AppIcon name="qr" :size="19" />扫码查询凭证</AppButton>
        <view class="manual"><input v-model="code" :disabled="checking || saving" maxlength="80" placeholder="输入核销码或订单号" /><AppButton variant="secondary" size="compact" :loading="checking" :disabled="saving" @click="lookup">查询订单</AppButton></view>
        <text v-if="error" class="action-error" role="alert">{{ error }}</text>
      </BaseCard>
      <ResultState v-if="successOrder" tone="success" title="核销成功" description="现场核对已完成，订单履约完成。">
        <view class="success-details"><text>订单号：{{ successOrder.no }}</text><text>履约方式：{{ successOrder.fulfillmentMethod }}</text><text>核销时间：{{ successOrder.verificationAt }}</text><text>操作人：{{ successOrder.verificationOperatorName }}</text><text>操作结果：已完成，凭证不可重复使用</text></view>
        <AppButton variant="secondary" @click="successOrder = undefined; candidate = null; code = ''">继续核销</AppButton>
      </ResultState>
      <BaseCard v-if="candidate" class="candidate-card" :class="{ 'candidate-card--ready': candidate.kind === 'ready', 'candidate-card--error': candidate.kind !== 'ready' }">
        <view class="candidate-head"><text>{{ candidate.kind === 'ready' ? '订单信息核对' : candidate.kind === 'already' ? '已核销，禁止重复操作' : '无法核销' }}</text><StatusTag :tone="candidate.kind === 'ready' ? 'pending' : 'error'">{{ candidate.kind === 'ready' ? '待核销' : candidate.kind === 'already' ? '已使用' : '异常' }}</StatusTag></view>
        <text class="candidate-message">{{ candidate.message }}</text>
        <template v-if="candidate.order">
          <view class="verify-row"><text>订单编号</text><text>{{ candidate.order.no }}</text></view>
          <view class="verify-row"><text>提货居民</text><text>{{ candidate.order.memberName }} {{ candidate.order.memberMobile.slice(0, 3) }}****{{ candidate.order.memberMobile.slice(-4) }}</text></view>
          <view class="verify-row"><text>履约方式</text><text>{{ candidate.order.fulfillmentMethod }}</text></view>
          <view class="verify-row"><text>核销地点</text><text>{{ candidate.order.fulfillmentLocation?.name || candidate.order.pickupPoint || candidate.order.storeName }}</text></view>
          <view class="verify-row"><text>当前状态</text><text>{{ candidate.order.fulfillmentStatus }} / {{ candidate.order.paymentStatus }}</text></view>
          <view v-for="item in candidate.order.items" :key="item.skuId" class="verify-product"><image :src="item.productImage" mode="aspectFill" /><view><text>{{ item.productName }}</text><text>{{ item.skuName }} · 数量 {{ item.remainingFulfillmentQuantity ?? item.quantity }}</text></view></view>
          <view v-if="candidate.kind === 'already'" class="verify-row"><text>原核销时间</text><text>{{ candidate.order.verificationAt }}</text></view>
        </template>
      </BaseCard>
      <BaseCard class="verification-rules"><text>异常核销提示</text><view><text>· 非本店、未支付、已关闭、未备货、已失效、已核销及阻断性售后订单会分别提示原因。</text><text>· 查询凭证不会完成订单；确认核销需再次确认，重复核销会被拒绝。</text></view></BaseCard>
    </view>
    <BottomActionBar v-if="candidate?.kind === 'ready'"><AppButton variant="secondary" :disabled="saving" @click="candidate = null">取消 / 重扫</AppButton><AppButton :loading="saving" @click="confirm">确认核销</AppButton></BottomActionBar>
  </AppPage>
</template>
<style scoped lang="scss">
.verification-page { gap:$space-3; }.store-card { display:flex; align-items:center; gap:$space-2; }.store-card > view { display:flex; min-width:0; flex:1; flex-direction:column; gap:2px; }.store-card > view text:first-child { color:$color-text-secondary; font-size:12px; }.store-card > view text:last-child { overflow:hidden; font-size:16px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }.store-card :deep(.status-tag) { min-height:22px; padding:0 6px; border-radius:999px; font-size:11px; }.section-title { display:flex; align-items:center; gap:$space-2; padding-bottom:$space-3; border-bottom:1px solid rgba(225,228,230,.72); font-size:17px; font-weight:700; }.scan-description { display:block; margin:$space-3 0; color:$color-text-secondary; font-size:13px; line-height:20px; }.manual { display:flex; align-items:center; gap:$space-2; margin-top:$space-3; }.manual input { min-width:0; height:44px; flex:1; padding:0 $space-3; border:1px solid $color-border; border-radius:$radius-md; background:$color-group-bg; font-size:14px; }.manual :deep(.app-button) { flex:none; }.candidate-card { border-color:rgba(250,77,79,.45); }.candidate-card--ready { border-color:rgba(27,77,83,.55); }.candidate-head { display:flex; align-items:center; justify-content:space-between; gap:$space-2; }.candidate-head text { font-size:17px; font-weight:700; }.candidate-head :deep(.status-tag) { min-height:22px; padding:0 6px; border-radius:999px; font-size:12px; }.candidate-message { display:block; margin-top:$space-2; color:$color-text-secondary; font-size:13px; line-height:20px; }.verify-row { display:flex; align-items:center; justify-content:space-between; gap:$space-3; padding-top:$space-3; color:$color-text-secondary; font-size:13px; }.verify-row text:last-child { color:$color-text-primary; text-align:right; }.verify-product { display:flex; align-items:center; gap:$space-3; margin-top:$space-3; padding:$space-3; border-radius:$radius-md; background:$color-group-bg; }.verify-product image { width:56px; height:56px; border-radius:$radius-sm; }.verify-product > view { display:flex; flex:1; flex-direction:column; gap:2px; }.verify-product text:first-child { font-size:15px; font-weight:600; }.verify-product text:not(:first-child) { color:$color-text-secondary; font-size:12px; }.verify-product text:last-child { color:$color-accent; font-size:14px; font-weight:700; }.verification-rules { display:flex; flex-direction:column; gap:$space-2; background:$color-group-bg; }.verification-rules > text { color:$color-error; font-size:15px; font-weight:700; }.verification-rules > view { display:flex; flex-direction:column; gap:$space-1; color:$color-text-secondary; font-size:12px; line-height:18px; }
</style>
<style scoped lang="scss">
.store-card > view .operator-name { font-size:12px; color:$color-text-secondary; }
.verify-row { align-items:flex-start; }
.verify-row text:last-child { min-width:0; flex:1; overflow-wrap:anywhere; }
.verify-row text:first-child { flex:none; }
.verify-product > view { min-width:0; overflow-wrap:anywhere; }
.success-details { display:flex; flex-direction:column; gap:8px; margin:16px 0; text-align:left; overflow-wrap:anywhere; font-size:13px; }
.action-error { display:block; margin-top:12px; color:$color-error; font-size:13px; }
@media (max-width:340px) { .manual { flex-wrap:wrap; }.manual input { flex-basis:100%; }.manual :deep(.app-button) { width:100%; } }
</style>
