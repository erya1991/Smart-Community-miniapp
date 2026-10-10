<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import MerchantOrderDemoPanel from '@/features/fulfillment/MerchantOrderDemoPanel.vue'
import { merchantTabItems } from '@/config/navigation'
import { usePageResource } from '@/composables/usePageResource'
import { merchantTradeService } from '@/services/trade'
import { merchantOrderAction, matchesMerchantOrderFilter } from '@/utils/merchantOrder'
import { formatMoneyFromFen, openSubPage } from '@/utils/navigation'
import type { MerchantOrderFilter } from '@/types/mall'

const keyword = ref('')
const activeFilter = ref<MerchantOrderFilter>('all')
const { status, data, errorMessage, load, refresh } = usePageResource(merchantTradeService.getOrders)
const orders = computed(() => (data.value?.orders || []).filter((order) => {
  const search = [order.no, order.memberName, ...order.items.map((item) => item.productName)].join('')
  return search.includes(keyword.value.trim()) && matchesMerchantOrderFilter(order, activeFilter.value)
}))
const statusTone = (value: string) => value === '已完成' ? 'success' : ['已关闭', '支付失败'].includes(value) ? 'error' : 'pending'
const handlePrimary = (order: typeof orders.value[number]) => {
  if (merchantOrderAction(order) === '去核销') openSubPage('/pages/verification/index?code=' + encodeURIComponent(order.verificationCode || ''))
  else openSubPage('/pages/order/detail/index?id=' + encodeURIComponent(order.id))
}
onLoad((options) => {
  const filter = options?.filter as MerchantOrderFilter
  if (['all', 'preparing', 'delivery', 'transit', 'verification', 'completed'].includes(filter)) activeFilter.value = filter
  load()
})
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="订单" compact show-user /></template>
    <view class="stack order-stack">
      <MerchantOrderDemoPanel @changed="refresh" />
      <view class="order-query"><SearchBar v-model="keyword" class="order-search" placeholder="搜索订单号、居民或商品" /><scroll-view scroll-x :show-scrollbar="false" class="order-filter-scroll"><view class="order-filters"><view v-for="filter in data?.filters || []" :key="filter.key" class="order-filter-hit" @click="activeFilter = filter.key"><text class="order-filter" :class="{ 'order-filter--active': filter.key === activeFilter }">{{ filter.label }} ({{ filter.count }})</text></view></view></scroll-view></view>
      <view class="order-list"><BaseCard v-for="order in orders" :key="order.id" class="order-card" :class="{ 'order-card--complete': order.tradeStatus === '已完成' }" :padded="false" @click="openSubPage('/pages/order/detail/index?id=' + encodeURIComponent(order.id))">
        <view class="order-head"><text>#{{ order.no }}</text><StatusTag :tone="statusTone(order.displayStatus)">{{ order.displayStatus === '支付中' ? '支付结果确认中' : order.displayStatus }}</StatusTag></view>
        <text class="order-item">{{ order.items.map((item) => item.productName + ' ×' + (item.remainingFulfillmentQuantity ?? item.quantity)).join('；') }}</text>
        <text class="order-meta">{{ order.memberName }} · {{ order.fulfillmentMethod }} · {{ order.paidAt || order.createdAt }}</text>
        <text v-if="order.hasAfterSaleRecords" class="order-blocked">{{ order.afterSaleSummary }}{{ order.fulfillmentBlocked ? ' · 履约暂不可用' : '' }}</text>
        <view class="order-bottom"><view><text>实付 ¥{{ formatMoneyFromFen(order.paidAmount) }}</text><text>{{ order.fulfillmentStatus === '已送达' ? '等待居民确认' : order.fulfillmentMethod }}</text></view><view class="order-actions"><view class="quiet-action" @click.stop="openSubPage('/pages/order/detail/index?id=' + encodeURIComponent(order.id))">详情</view><view v-if="merchantOrderAction(order)" class="primary-action" @click.stop="handlePrimary(order)">{{ merchantOrderAction(order) }}</view></view></view>
      </BaseCard></view><view v-if="!orders.length" class="order-empty">暂无匹配订单</view>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index" /></template>
  </AppPage>
</template>
<style scoped lang="scss">
.order-stack { gap:$space-2; }.order-query { display:flex; flex-direction:column; gap:$space-1; }.order-search { height:44px !important; padding:0 $space-3 !important; }.order-filter-scroll { width:calc(100% + #{$page-gutter * 2}); margin-left:-$page-gutter; white-space:nowrap; }.order-filters { display:flex; gap:$space-2; padding:0 $page-gutter; }.order-filter-hit { display:inline-flex; min-height:$touch-target-min; align-items:center; }.order-filter { display:inline-flex; height:36px; align-items:center; justify-content:center; padding:0 $space-3; border-radius:999px; background:$color-card-bg; color:$color-text-secondary; font-size:14px; font-weight:600; }.order-filter--active { background:$color-primary; color:#fff; }.order-list { display:flex; flex-direction:column; gap:6px; }.order-card { padding:$space-3; border-left:3px solid $color-accent; }.order-card--complete { border-left-color:$color-success; }.order-head { display:flex; align-items:center; justify-content:space-between; gap:$space-2; }.order-head text { overflow:hidden; font-size:14px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }.order-head :deep(.status-tag) { min-height:22px; padding:0 6px; border-radius:999px; font-size:12px; }.order-item { display:block; overflow:hidden; margin-top:$space-2; font-size:16px; font-weight:600; line-height:22px; text-overflow:ellipsis; white-space:nowrap; }.order-meta { display:block; overflow:hidden; margin-top:2px; color:$color-text-secondary; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }.order-bottom { display:flex; min-height:$touch-target-min; align-items:center; justify-content:space-between; gap:$space-2; margin-top:$space-2; padding-top:$space-2; border-top:1px solid rgba(225,228,230,.72); }.order-bottom > view:first-child { display:flex; flex-direction:column; gap:2px; }.order-bottom > view:first-child text:first-child { color:$color-accent; font-size:20px; font-weight:700; }.order-bottom > view:first-child text:last-child { color:$color-text-secondary; font-size:11px; }.order-actions { display:flex; gap:$space-2; }.quiet-action,.primary-action { display:flex; min-width:58px; height:36px; align-items:center; justify-content:center; padding:0 $space-2; border-radius:$radius-md; font-size:13px; font-weight:600; }.quiet-action { background:$color-group-bg; color:$color-text-primary; }.primary-action { background:$color-primary; color:#fff; }.order-empty { padding:$space-8 0; color:$color-text-secondary; text-align:center; }
.order-head > text { flex:1; min-width:0; white-space:normal; overflow-wrap:anywhere; }.order-head :deep(.status-tag) { flex:none; }.order-item { white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }.order-bottom { flex-wrap:wrap; }.order-actions { margin-left:auto; }.quiet-action,.primary-action { min-height:44px; height:auto; }.order-blocked { display:block; color:$color-error; font-size:13px; line-height:21px; }
</style>
