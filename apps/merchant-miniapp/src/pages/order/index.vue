<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { merchantTabItems } from '@/config/navigation'
import { usePageResource } from '@/composables/usePageResource'
import { merchantTradeService } from '@/services/trade'
import { formatMoneyFromFen, openSubPage } from '@/utils/navigation'

const keyword = ref('')
const activeFilter = ref('全部')
const { status, data, errorMessage, load } = usePageResource(merchantTradeService.getOrders)
const orders = computed(() => (data.value?.orders || []).filter((order) => {
  const searchText = `${order.no}${order.memberName}${order.items.map((item) => item.productName).join('')}`
  const matchesKeyword = searchText.includes(keyword.value.trim())
  const matchesFilter = activeFilter.value === '全部'
    || (activeFilter.value === '待处理' && ['待备货', '待核销'].includes(order.displayStatus))
    || (activeFilter.value === '履约中' && ['待配送', '配送中', '待自提', '已送达'].includes(order.displayStatus))
    || (activeFilter.value === '已完成' && order.tradeStatus === '已完成')
  return matchesKeyword && matchesFilter
}))
const statusTone = (value: string) => value === '已完成' ? 'success' : value === '已关闭' ? 'error' : 'pending'
const primaryAction = (value: string) => value === '待备货' ? '完成备货' : value === '待配送' ? '开始配送' : value === '配送中' ? '标记送达' : ['待自提', '待核销'].includes(value) ? '去核销' : '查看详情'
const handlePrimary = async (order: typeof orders.value[number]) => {
  if (['待自提', '待核销'].includes(order.displayStatus)) { openSubPage(`/pages/verification/index?code=${order.verificationCode || ''}`); return }
  const action = order.displayStatus === '待备货' ? 'finish-preparing' : order.displayStatus === '待配送' ? 'start-delivery' : order.displayStatus === '配送中' ? 'mark-delivered' : undefined
  if (!action) { openSubPage(`/pages/order/detail/index?id=${order.id}`); return }
  try { await merchantTradeService.fulfill(order.id, action); uni.showToast({ title: `${primaryAction(order.displayStatus)}成功`, icon: 'success' }); load() } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '订单状态已变化', icon: 'none' }); load() }
}
onLoad(load); onShow(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="订单" compact show-user /></template>
    <view class="stack order-stack"><view class="order-query"><SearchBar v-model="keyword" class="order-search" placeholder="搜索订单号、居民或商品" /><scroll-view scroll-x :show-scrollbar="false" class="order-filter-scroll"><view class="order-filters"><view v-for="filter in data?.filters || []" :key="filter.label" class="order-filter-hit" @click="activeFilter = filter.label"><text class="order-filter" :class="{ 'order-filter--active': filter.label === activeFilter }">{{ filter.label }} ({{ filter.count }})</text></view></view></scroll-view></view><view class="order-list"><BaseCard v-for="order in orders" :key="order.id" class="order-card" :class="{ 'order-card--complete': order.tradeStatus === '已完成' }" :padded="false" @click="openSubPage(`/pages/order/detail/index?id=${order.id}`)"><view class="order-head"><text>#{{ order.no }}</text><StatusTag :tone="statusTone(order.displayStatus)">{{ order.displayStatus }}</StatusTag></view><text class="order-item">{{ order.items.map((item) => `${item.productName} ×${item.quantity}`).join('；') }}</text><text class="order-meta">{{ order.memberName }} · {{ order.fulfillmentMethod }} · {{ order.createdAt }}</text><view class="order-bottom"><view><text>¥{{ formatMoneyFromFen(order.paidAmount || order.payableAmount) }}</text><text>{{ order.fulfillmentStatus === '待配送' ? '请尽快安排配送' : order.fulfillmentStatus === '待备货' ? '已支付待备货' : order.fulfillmentStatus }}</text></view><view class="order-actions"><view class="quiet-action" @click.stop="openSubPage(`/pages/order/detail/index?id=${order.id}`)">详情</view><view class="primary-action" @click.stop="handlePrimary(order)">{{ primaryAction(order.displayStatus) }}</view></view></view></BaseCard></view><view v-if="!orders.length" class="order-empty">暂无匹配订单</view></view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.order-stack { gap:$space-2; }.order-query { display:flex; flex-direction:column; gap:$space-1; }.order-search { height:44px !important; padding:0 $space-3 !important; }.order-filter-scroll { width:calc(100% + #{$page-gutter * 2}); margin-left:-$page-gutter; white-space:nowrap; }.order-filters { display:flex; gap:$space-2; padding:0 $page-gutter; }.order-filter-hit { display:inline-flex; min-height:$touch-target-min; align-items:center; }.order-filter { display:inline-flex; height:36px; align-items:center; justify-content:center; padding:0 $space-3; border-radius:999px; background:$color-card-bg; color:$color-text-secondary; font-size:14px; font-weight:600; }.order-filter--active { background:$color-primary; color:#fff; }.order-list { display:flex; flex-direction:column; gap:6px; }.order-card { padding:$space-3; border-left:3px solid $color-accent; }.order-card--complete { border-left-color:$color-success; }.order-head { display:flex; align-items:center; justify-content:space-between; gap:$space-2; }.order-head text { overflow:hidden; font-size:14px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }.order-head :deep(.status-tag) { min-height:22px; padding:0 6px; border-radius:999px; font-size:12px; }.order-item { display:block; overflow:hidden; margin-top:$space-2; font-size:16px; font-weight:600; line-height:22px; text-overflow:ellipsis; white-space:nowrap; }.order-meta { display:block; overflow:hidden; margin-top:2px; color:$color-text-secondary; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }.order-bottom { display:flex; min-height:$touch-target-min; align-items:center; justify-content:space-between; gap:$space-2; margin-top:$space-2; padding-top:$space-2; border-top:1px solid rgba(225,228,230,.72); }.order-bottom > view:first-child { display:flex; flex-direction:column; gap:2px; }.order-bottom > view:first-child text:first-child { color:$color-accent; font-size:20px; font-weight:700; }.order-bottom > view:first-child text:last-child { color:$color-text-secondary; font-size:11px; }.order-actions { display:flex; gap:$space-2; }.quiet-action,.primary-action { display:flex; min-width:58px; height:36px; align-items:center; justify-content:center; padding:0 $space-2; border-radius:$radius-md; font-size:13px; font-weight:600; }.quiet-action { background:$color-group-bg; color:$color-text-primary; }.primary-action { background:$color-primary; color:#fff; }.order-empty { padding:$space-8 0; color:$color-text-secondary; text-align:center; }
</style>
