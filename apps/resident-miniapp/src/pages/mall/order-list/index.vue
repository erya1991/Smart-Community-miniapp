<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'

const active = ref('全部')
const tabs = ['全部', '待支付', '待履约', '待收货/待核销', '已完成', '售后/退款']
const { status, data, errorMessage, load } = usePageResource(residentMallService.getOrders)
const orders = computed(() => (data.value || []).filter((order) => {
  if (active.value === '全部') return true
  if (active.value === '待支付') return ['未支付', '支付中', '支付失败'].includes(order.paymentStatus)
  if (active.value === '待履约') return ['待备货', '待配送', '配送中'].includes(order.displayStatus)
  if (active.value === '待收货/待核销') return ['已送达', '待自提', '待核销'].includes(order.displayStatus)
  if (active.value === '已完成') return order.tradeStatus === '已完成'
  return order.afterSaleStatus !== '无售后' || order.refundStatus !== '无退款'
}))
const money = (value: number) => (value / 100).toFixed(2)
const tone = (order: { displayStatus: string }) => order.displayStatus === '已完成' ? 'success' : order.displayStatus === '已关闭' ? 'error' : 'pending'
onLoad(load); onShow(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="商城订单" centered show-back /></template>
    <view class="stack resident-order-page"><scroll-view scroll-x :show-scrollbar="false" class="order-tabs"><view><text v-for="tab in tabs" :key="tab" class="order-tab" :class="{ 'order-tab--active': active === tab }" @click="active = tab">{{ tab }}</text></view></scroll-view><BaseCard v-for="order in orders" :key="order.id" class="resident-order-card" :padded="false" @click="openSubPage(`/pages/mall/order-detail/index?id=${order.id}`)"><view class="resident-order-card__head"><text>{{ order.merchantName }}</text><StatusTag :tone="tone(order)">{{ order.displayStatus }}</StatusTag></view><view class="resident-order-card__items"><view v-for="item in order.items" :key="item.skuId" class="resident-order-item"><image :src="item.productImage" mode="aspectFill" /><view><text>{{ item.productName }}</text><text>{{ item.skuName }} · ×{{ item.quantity }}</text></view><text>¥{{ money(item.unitPrice * item.quantity) }}</text></view></view><view class="resident-order-card__foot"><text>{{ order.fulfillmentMethod }} · {{ order.createdAt }}</text><text>实付 <text>¥{{ money(order.paidAmount || order.payableAmount) }}</text></text></view></BaseCard><view v-if="!orders.length" class="order-empty">暂无此状态订单</view><view class="after-sale-placeholder">售后/退款入口将在阶段 05 提供完整处理能力；当前订单会保留售后与退款独立状态。</view></view>
  </AppPage>
</template>

<style scoped lang="scss">
.resident-order-page { gap:$space-2; }.order-tabs { width:calc(100% + #{$page-gutter * 2}); margin-left:-$page-gutter; white-space:nowrap; }.order-tabs > view { display:flex; gap:$space-2; padding:0 $page-gutter; }.order-tab { display:inline-flex; height:36px; align-items:center; justify-content:center; padding:0 $space-3; border-radius:999px; background:#fff; color:$color-text-secondary; font-size:14px; font-weight:600; }.order-tab--active { background:$color-primary; color:#fff; }.resident-order-card { overflow:hidden; }.resident-order-card__head { display:flex; min-height:50px; align-items:center; justify-content:space-between; padding:0 $space-4; border-bottom:1px solid rgba(225,228,230,.72); font-size:16px; font-weight:700; }.resident-order-card__head :deep(.status-tag) { min-height:22px; padding:0 6px; border-radius:999px; font-size:12px; }.resident-order-card__items { padding:0 $space-4; }.resident-order-item { display:flex; align-items:center; gap:$space-2; padding:$space-3 0; }.resident-order-item image { width:58px; height:58px; flex:none; border-radius:$radius-md; background:$color-group-bg; }.resident-order-item > view { display:flex; min-width:0; flex:1; flex-direction:column; gap:3px; }.resident-order-item > view text:first-child { overflow:hidden; font-size:15px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }.resident-order-item > view text:last-child,.resident-order-item > text { color:$color-text-secondary; font-size:12px; }.resident-order-item > text { color:$color-text-primary; font-size:14px; }.resident-order-card__foot { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:$space-2; padding:0 $space-4; border-top:1px solid rgba(225,228,230,.72); color:$color-text-secondary; font-size:12px; }.resident-order-card__foot > text:last-child { color:$color-text-primary; }.resident-order-card__foot > text:last-child text { color:$color-accent; font-size:17px; font-weight:700; }.order-empty { padding:$space-8 0; color:$color-text-secondary; text-align:center; }.after-sale-placeholder { padding:$space-3; border-radius:$radius-md; background:$color-group-bg; color:$color-text-secondary; font-size:12px; line-height:18px; }
</style>
