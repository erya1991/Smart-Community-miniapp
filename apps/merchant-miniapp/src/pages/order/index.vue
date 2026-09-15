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
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
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
const flowIcon = (fulfillment: string) => fulfillment === '商户配送' ? 'car' : 'bag'
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="订单" large show-user /></template>
    <view class="stack order-stack">
      <SearchBar v-model="keyword" placeholder="搜索订单号、收货人或商品" />
      <scroll-view scroll-x :show-scrollbar="false" class="order-filter-scroll"><view class="order-filters"><text v-for="filter in data!.filters" :key="filter.label" class="order-filter" :class="{ 'order-filter--active': filter.label === activeFilter }" @click="activeFilter = filter.label">{{ filter.label }} ({{ filter.count }})</text></view></scroll-view>

      <view class="order-list">
        <BaseCard v-for="order in orders" :key="order.id" class="order-card">
          <view class="order-head"><view class="order-head__number"><text>订单号 {{ order.no }}</text><view class="order-head__copy" @click="unavailable"><AppIcon name="message" :size="14" />复制</view></view><StatusTag :tone="statusTone(order.status)">{{ order.status }}</StatusTag></view>
          <view class="order-status-bar" :class="{ 'order-status-bar--complete': order.status === '已完成' }"><view class="order-status-bar__main"><view class="order-status-bar__dot" /><text class="order-status-bar__title">{{ order.status }}</text><StatusTag tone="disabled">{{ order.fulfillment }}</StatusTag></view><text class="order-status-bar__promise">{{ order.promise }}</text></view>
          <view class="order-summary"><view class="order-summary__icon"><IconContainer :icon="flowIcon(order.fulfillment)" size="sm" /></view><view class="order-summary__copy"><text class="order-summary__item">{{ order.itemSummary }}</text><text class="order-summary__meta">{{ order.customerName }} · {{ order.createdAt }} · 共 {{ order.count }} 件</text></view><text class="order-summary__amount">¥{{ formatMoneyFromFen(order.amount) }}</text></view>
          <view class="order-actions"><view class="order-action order-action--quiet" @click="unavailable">查看详情</view><view class="order-action" :class="{ 'order-action--complete': order.status === '已完成' }" @click="unavailable">{{ order.status === '待备货' ? '开始备货' : order.status === '待配送' ? '查看配送' : '查看记录' }}</view></view>
        </BaseCard>
      </view>
      <view v-if="!orders.length" class="order-empty">暂无匹配订单</view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.order-stack { gap: $space-3; }
.order-filter-scroll { width: calc(100% + #{$page-gutter * 2}); margin-left: -$page-gutter; white-space: nowrap; scrollbar-width: none; }
.order-filter-scroll::-webkit-scrollbar { display: none; }
.order-filters { display: flex; gap: $space-2; padding: $space-1 $page-gutter $space-2; }
.order-filter { display: inline-flex; min-height: 44px; min-width: 88px; align-items: center; justify-content: center; padding: 0 $space-3; border-radius: 999px; background: $color-card-bg; color: $color-text-secondary; font-size: 14px; font-weight: 600; }
.order-filter--active { background: $color-primary; color: #fff; }
.order-list { display: flex; flex-direction: column; gap: $space-3; }
.order-card { padding: $space-3; }
.order-head { display: flex; align-items: center; justify-content: space-between; gap: $space-2; }
.order-head__number { display: flex; min-width: 0; align-items: center; gap: $space-2; color: $color-text-secondary; font-size: 13px; }
.order-head__number > text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-head__copy { display: flex; min-width: 44px; min-height: 44px; flex: none; align-items: center; gap: 3px; color: $color-primary; font-size: 12px; }
.order-head :deep(.status-tag) { border-radius: 999px; }
.order-status-bar { display: flex; min-height: 62px; align-items: center; justify-content: space-between; gap: $space-2; margin-top: $space-3; padding: $space-3; border-radius: $radius-md; background: rgba(250, 238, 233, 0.72); }
.order-status-bar--complete { background: $color-group-bg; }
.order-status-bar__main { display: flex; min-width: 0; align-items: center; gap: $space-2; }
.order-status-bar__dot { width: 9px; height: 9px; flex: none; border-radius: 50%; background: $color-accent; }
.order-status-bar--complete .order-status-bar__dot { background: $color-success; }
.order-status-bar__title { font-size: 18px; font-weight: 700; }
.order-status-bar__promise { color: $color-text-secondary; font-size: 12px; text-align: right; }
.order-summary { display: flex; align-items: center; gap: $space-3; margin-top: $space-3; }
.order-summary__copy { flex: 1; min-width: 0; }
.order-summary__item, .order-summary__meta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-summary__item { font-size: 16px; font-weight: 600; }
.order-summary__meta { margin-top: 3px; color: $color-text-secondary; font-size: 13px; }
.order-summary__amount { flex: none; color: $color-accent; font-size: 18px; font-weight: 700; }
.order-actions { display: flex; justify-content: flex-end; gap: $space-2; margin-top: $space-3; padding-top: $space-3; border-top: 1px solid rgba(225, 228, 230, 0.72); }
.order-action { display: flex; min-width: 100px; min-height: 44px; align-items: center; justify-content: center; padding: 0 $space-3; border-radius: $radius-md; background: $color-primary; color: #fff; font-size: 14px; font-weight: 600; }
.order-action--quiet { background: $color-group-bg; color: $color-text-primary; }
.order-action--complete { background: $color-group-bg; color: $color-text-secondary; }
.order-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
</style>
