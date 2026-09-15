<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { formatMoneyFromFen } from '@/utils/navigation'
import { merchantTabItems } from '@/config/navigation'

const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantOrders)
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="订单" /></template>
    <view class="stack">
      <SearchBar placeholder="搜索订单号" />
      <view class="order-filters"><text class="order-filter order-filter--active">全部</text><text class="order-filter">待处理</text><text class="order-filter">履约中</text><text class="order-filter">已完成</text></view>
      <BaseCard v-for="order in data" :key="order.id">
        <view class="order-head"><text>订单 {{ order.no }}</text><StatusTag tone="pending">{{ order.status }}</StatusTag></view>
        <view class="order-body"><text>{{ order.fulfillment }} · 共 {{ order.count }} 件</text><text class="price">¥{{ formatMoneyFromFen(order.amount) }}</text></view>
        <text class="order-note">本阶段仅提供订单列表容器，履约操作在后续阶段实现。</text>
      </BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.order-filters { display: flex; overflow: hidden; border-radius: 999px; background: #fff; }
.order-filter { display: flex; min-height: $touch-target-min; align-items: center; justify-content: center; flex: 1; color: $color-text-secondary; font-size: 14px; }
.order-filter--active { background: $color-primary; color: #fff; }
.order-head, .order-body { display: flex; align-items: center; justify-content: space-between; }
.order-head { font-size: 14px; font-weight: 600; }
.order-body { margin-top: $space-4; color: $color-text-secondary; }
.order-note { display: block; margin-top: $space-3; padding-top: $space-3; border-top: 1px solid $color-border; color: $color-text-disabled; font-size: 13px; }
</style>
