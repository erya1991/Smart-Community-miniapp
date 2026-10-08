<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import ResultState from '@/components/ResultState.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'

const tradeId = ref('')
const orderId = ref('')
const busy = ref(false)
const actionError = ref('')
const demoOpen = ref(false)
const money = (value: number) => (value / 100).toFixed(2)
const { status, data, errorMessage, load } = usePageResource(async () => {
  if (!tradeId.value && orderId.value) tradeId.value = (await residentMallService.getTradeForOrder(orderId.value)).tradeId
  if (!tradeId.value) throw new Error('未找到待支付交易，请返回商城或订单列表。')
  return residentMallService.getTrade(tradeId.value)
})
const paid = computed(() => data.value && ['支付成功', 'Mock成功'].includes(data.value.paymentStatus))
const closed = computed(() => data.value?.paymentStatus === '已关闭')
const pending = computed(() => data.value?.paymentStatus === '支付中')
const failed = computed(() => data.value?.paymentStatus === '支付失败')
const title = computed(() => paid.value ? '支付成功' : closed.value ? '交易已关闭' : pending.value ? '支付结果确认中' : failed.value ? '支付失败' : '等待支付')
const description = computed(() => paid.value ? '商户已收到订单，请按各商户约定方式收货或取货。' : closed.value ? '本次交易已关闭，预占库存已释放。可返回商城重新购买。' : pending.value ? '支付结果尚未确认，请查询支付结果。请勿重复发起支付。' : failed.value ? '本次支付未完成，订单及库存仍保留。可重试支付或取消交易。' : '请核对金额后完成支付，交易将在 30 分钟后自动关闭。')
const act = async (action: () => Promise<unknown>) => {
  if (busy.value) return
  busy.value = true; actionError.value = ''
  try { await action(); await load() }
  catch (error) { actionError.value = error instanceof Error ? error.message : '操作失败，请重试。' }
  finally { busy.value = false }
}
const pay = (outcome: 'success' | 'failure' | 'unknown' = 'success') => act(() => residentMallService.payTrade(tradeId.value, outcome))
const query = () => act(() => residentMallService.queryTradePayment(tradeId.value))
const cancel = () => uni.showModal({ title: '取消交易', content: '将关闭本次交易的全部商户订单，并释放预占库存。', success: ({ confirm }) => { if (confirm) act(() => residentMallService.cancelTrade(tradeId.value)) } })
const viewOrders = () => {
  if (data.value?.orders.length === 1) openSubPage('/pages/mall/order-detail/index?id=' + encodeURIComponent(data.value.orders[0].id))
  else openSubPage('/pages/mall/order-list/index')
}
const returnMall = () => uni.switchTab({ url: '/pages/mall/index' })
onLoad((options) => { tradeId.value = options?.tradeId || ''; orderId.value = options?.orderId || ''; load() })
onShow(() => { if (data.value && !busy.value) load() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="支付结果" centered show-back /></template>
    <view v-if="data" class="stack payment-page">
      <ResultState :tone="paid ? 'success' : failed || closed ? 'error' : 'pending'" :title="title" :description="description" />
      <BaseCard>
        <view class="amount"><text>{{ paid ? '支付金额' : '应付金额' }}</text><text>¥{{ money(data.payableAmount) }}</text></view>
        <view class="summary-row"><text>交易编号</text><text>{{ data.tradeSn }}</text></view>
        <view class="summary-row"><text>商户订单</text><text>{{ data.orders.length }} 笔</text></view>
        <view v-for="order in data.orders" :key="order.id" class="order-row"><text>{{ order.merchantName }} · {{ order.storeName }}</text><view><text>{{ order.fulfillmentMethod }}</text><text>¥{{ money(order.payableAmount) }}</text></view></view>
      </BaseCard>
      <BaseCard v-if="actionError"><text class="action-error">{{ actionError }}</text></BaseCard>
      <view class="secondary-actions"><AppButton variant="secondary" :disabled="busy" @click="viewOrders">查看订单</AppButton><AppButton variant="quiet" :disabled="busy" @click="returnMall">返回商城</AppButton></view>
      <AppButton v-if="!paid && !closed" variant="quiet" :disabled="busy" @click="cancel">取消交易</AppButton>
      <BaseCard class="demo-panel">
        <button class="demo-toggle" @click="demoOpen = !demoOpen">原型演示 / Mock {{ demoOpen ? '收起 ∧' : '展开 ∨' }}</button>
        <view v-if="demoOpen" class="demo-options"><text>当前仅使用内存支付适配器，不会调用微信支付或产生资金交易。下方按钮用于演示结果；“支付中”仅在查询后确认成功。</text><AppButton variant="quiet" :disabled="busy || !!paid || !!closed || !!pending" @click="pay('unknown')">模拟支付处理中</AppButton><AppButton variant="quiet" :disabled="busy || !!paid || !!closed || !!pending" @click="pay('failure')">模拟支付失败</AppButton></view>
      </BaseCard>
    </view>
    <BottomActionBar v-if="data"><AppButton v-if="paid || closed" @click="viewOrders">查看订单</AppButton><AppButton v-else-if="pending" :loading="busy" :disabled="busy" @click="query">查询支付结果</AppButton><AppButton v-else :loading="busy" :disabled="busy" @click="pay()">{{ failed ? '重试支付' : '立即支付' }}</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.payment-page { gap:$space-3; }.amount { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding-bottom:12px; border-bottom:1px solid $color-border; font-size:16px; }.amount text:last-child { color:$color-accent; font-size:28px; font-weight:700; }.summary-row { display:flex; justify-content:space-between; gap:12px; padding-top:12px; font-size:14px; color:$color-text-secondary; }.summary-row text:last-child { min-width:0; overflow-wrap:anywhere; text-align:right; }.order-row { padding-top:16px; font-size:15px; line-height:24px; }.order-row > text { display:block; font-weight:600; }.order-row > view { display:flex; justify-content:space-between; gap:8px; color:$color-text-secondary; }.secondary-actions { display:flex; flex-wrap:wrap; gap:12px; }.secondary-actions > :deep(.app-button) { flex:1; }.demo-toggle { margin:0; padding:0; min-height:44px; display:flex; align-items:center; color:$color-text-secondary; background:transparent; text-align:left; font-size:14px; }.demo-toggle::after { border:none; }.demo-options { display:flex; flex-direction:column; gap:12px; color:$color-text-secondary; font-size:13px; line-height:21px; }.action-error { color:$color-error; font-size:15px; line-height:23px; }
</style>