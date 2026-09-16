<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { formatMoneyFromFen } from '@/utils/navigation'
import { merchantTabItems } from '@/config/navigation'

const keyword = ref('')
const activeFilter = ref('全部')
const showUnavailable = ref(false)
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantOrders)
const orders = computed(() => (data.value?.orders || []).filter((order) => {
  const searchText = `${order.no}${order.customerName}${order.itemSummary}`
  const matchesKeyword = searchText.includes(keyword.value.trim())
  const matchesFilter = activeFilter.value === '全部'
    || (activeFilter.value === '待处理' && order.status === '待备货')
    || (activeFilter.value === '履约中' && ['待配送', '配送中'].includes(order.status))
    || (activeFilter.value === '已完成' && order.status === '已完成')
  return matchesKeyword && matchesFilter
}))
const unavailable = () => { showUnavailable.value = true }
const statusTone = (orderStatus: string) => orderStatus === '已完成' ? 'success' : 'pending'
const primaryAction = (orderStatus: string) => {
  if (orderStatus === '待备货') return '开始备货'
  if (orderStatus === '待配送' || orderStatus === '配送中') return '查看配送'
  return '查看记录'
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="订单" compact show-user /></template>
    <view class="stack order-stack">
      <view class="order-query"><SearchBar v-model="keyword" class="order-search" placeholder="搜索订单号、收货人或商品" /><scroll-view scroll-x :show-scrollbar="false" class="order-filter-scroll"><view class="order-filters"><view v-for="filter in data!.filters" :key="filter.label" class="order-filter-hit" hover-class="order-filter-hit--pressed" @click="activeFilter = filter.label"><text class="order-filter" :class="{ 'order-filter--active': filter.label === activeFilter }">{{ filter.label }} ({{ filter.count }})</text></view></view></scroll-view></view>

      <view class="order-list">
        <BaseCard v-for="order in orders" :key="order.id" class="order-card" :class="{ 'order-card--complete': order.status === '已完成' }" :padded="false" @click="unavailable">
          <view class="order-head"><text class="order-head__number">#{{ order.no }}</text><StatusTag :tone="statusTone(order.status)">{{ order.status }}</StatusTag></view>
          <text class="order-item">{{ order.itemSummary }}</text>
          <text class="order-meta">{{ order.customerName }} · 共 {{ order.count }} 件 · {{ order.fulfillment }}</text>
          <view class="order-time"><text>下单 {{ order.createdAt }}</text><text class="order-time__promise">{{ order.promise }}</text></view>
          <view class="order-bottom"><text class="order-amount">¥{{ formatMoneyFromFen(order.amount) }}</text><view class="order-actions"><view class="order-action-hit" hover-class="order-action-hit--pressed" @click.stop="unavailable"><view class="order-action order-action--quiet">详情</view></view><view class="order-action-hit" hover-class="order-action-hit--pressed" @click.stop="unavailable"><view class="order-action" :class="{ 'order-action--complete': order.status === '已完成' }">{{ primaryAction(order.status) }}</view></view></view></view>
        </BaseCard>
      </view>
      <view v-if="!orders.length" class="order-empty">暂无匹配订单</view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.order-stack { gap: $space-2; }
.order-query { display: flex; flex-direction: column; gap: $space-1; }
.order-search { height: 44px !important; padding: 0 $space-3 !important; }
.order-filter-scroll { width: calc(100% + #{$page-gutter * 2}); margin-left: -$page-gutter; white-space: nowrap; scrollbar-width: none; }
.order-filter-scroll::-webkit-scrollbar { display: none; }
.order-filters { display: flex; gap: $space-2; padding: 0 $page-gutter; }
.order-filter-hit { display: inline-flex; min-height: $touch-target-min; align-items: center; flex: none; }
.order-filter-hit--pressed { opacity: 0.72; }
.order-filter { display: inline-flex; height: 36px; align-items: center; justify-content: center; padding: 0 $space-3; border-radius: 999px; background: $color-card-bg; color: $color-text-secondary; font-size: 14px; font-weight: 600; white-space: nowrap; }
.order-filter--active { background: $color-primary; color: #fff; }
.order-list { display: flex; flex-direction: column; gap: $space-2; }
.order-card { position: relative; overflow: hidden; padding: $space-3; border-left: 3px solid $color-accent; }
.order-card--complete { border-left-color: $color-success; }
.order-head { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: $space-2; }
.order-head__number { overflow: hidden; color: $color-text-primary; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.order-head :deep(.status-tag) { min-height: 22px; flex: none; padding: 0 6px; border-radius: 999px; font-size: 12px; }
.order-item { display: -webkit-box; overflow: hidden; margin-top: $space-2; font-size: 16px; font-weight: 600; line-height: 22px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.order-meta { display: block; overflow: hidden; margin-top: 2px; color: $color-text-secondary; font-size: 13px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.order-time { display: flex; align-items: center; justify-content: space-between; gap: $space-2; margin-top: $space-2; color: $color-text-secondary; font-size: 12px; line-height: 18px; }
.order-time > text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-time__promise { color: $color-primary; font-weight: 600; text-align: right; }
.order-bottom { display: flex; min-height: $touch-target-min; align-items: center; justify-content: space-between; gap: $space-2; margin-top: $space-1; padding-top: $space-1; border-top: 1px solid rgba(225, 228, 230, 0.72); }
.order-amount { flex: none; color: $color-accent; font-size: 20px; font-weight: 700; }
.order-actions { display: flex; justify-content: flex-end; gap: $space-2; }
.order-action-hit { display: inline-flex; min-height: $touch-target-min; align-items: center; flex: none; }
.order-action-hit--pressed { opacity: 0.72; }
.order-action { display: flex; height: 36px; align-items: center; justify-content: center; padding: 0 $space-3; border-radius: $radius-md; background: $color-primary; color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap; }
.order-action--quiet, .order-action--complete { background: $color-group-bg; color: $color-text-primary; }
.order-action--complete { color: $color-text-secondary; }
.order-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
</style>
