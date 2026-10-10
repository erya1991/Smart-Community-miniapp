<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppButton from '@/components/AppButton.vue'
import StatusTag from '@/components/StatusTag.vue'
import ResultState from '@/components/ResultState.vue'
import MerchantOrderDemoPanel from '@/features/fulfillment/MerchantOrderDemoPanel.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantAfterSaleService } from '@/services/after-sale'
import { openSubPage } from '@/utils/navigation'
import type { MerchantAfterSaleFilter } from '@/types/after-sale'

const active = ref<MerchantAfterSaleFilter>('pending')
const filterKeys: MerchantAfterSaleFilter[] = ['pending', 'processing', 'completed', 'all']
const { status, data, errorMessage, load, refresh } = usePageResource(() => merchantAfterSaleService.getList())
const records = computed(() => (data.value?.records || []).filter(record => active.value === 'all' || active.value === 'pending' && record.serviceStatus === 'APPLY' || active.value === 'processing' && ['PASS', 'BUYER_RETURN', 'SELLER_CONFIRM', 'WAIT_REFUND'].includes(record.serviceStatus) || active.value === 'completed' && ['COMPLETE', 'REFUSE', 'BUYER_CANCEL'].includes(record.serviceStatus)))
const money = (amount: number) => (amount / 100).toFixed(2)
onLoad(options => { const filter = options?.filter; if (filterKeys.includes(filter as MerchantAfterSaleFilter)) active.value = filter as MerchantAfterSaleFilter; load() })
onShow(() => { if (data.value) refresh() })
</script>
<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="售后管理" centered show-back /></template>
    <view class="stack after-sale-list">
      <MerchantOrderDemoPanel @changed="refresh" />
      <text class="store-note">仅展示当前门店售后</text>
      <view class="filters"><view v-for="filter in data?.filters || []" :key="filter.key" :class="{ active: active === filter.key }" @click="active = filter.key">{{ filter.label }} {{ filter.count }}</view></view>
      <ResultState v-if="data && !records.length" tone="pending" title="暂无售后记录" description="居民提交申请后，可在当前门店查看并处理。" />
      <view v-for="record in records" :key="record.id" class="after-sale-row">
        <view class="row-heading"><text>{{ record.memberName }} · {{ record.typeLabel }}</text><StatusTag :tone="record.serviceStatus === 'COMPLETE' ? 'success' : record.serviceStatus === 'REFUSE' ? 'error' : 'pending'">{{ record.statusLabel }}</StatusTag></view>
        <view class="goods"><image :src="record.item.productImage" mode="aspectFill" /><view><text>{{ record.item.productName }}</text><text>{{ record.item.skuName }} · 售后 {{ record.quantity }} 件</text><text>申请退款 ¥{{ money(record.applyRefundAmount) }}</text></view></view>
        <text class="muted">申请原因：{{ record.reason }}</text><text class="muted">售后单 {{ record.sn }}</text><text class="muted">子订单 {{ record.orderSn }}</text><text class="muted">{{ record.createdAt }}</text>
        <view class="row-footer"><text>{{ record.nextStep }}</text><AppButton variant="secondary" @click="openSubPage('/pages/after-sale/detail/index?id=' + encodeURIComponent(record.id))">{{ record.operations.approve ? '去审核' : record.operations.confirmReturn ? '确认收货' : '查看详情' }}</AppButton></view>
      </view>
    </view>
  </AppPage>
</template>
<style scoped lang="scss">
.after-sale-list { gap:12px; }.store-note,.muted { color:$color-text-secondary; font-size:13px; line-height:20px; overflow-wrap:anywhere; }.filters { display:flex; flex-wrap:wrap; border-bottom:1px solid $color-border; }.filters > view { min-height:44px; padding:0 10px; display:flex; align-items:center; font-size:14px; }.filters .active { color:$color-primary; border-bottom:2px solid $color-primary; font-weight:700; }.after-sale-row { display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:$radius-md; background:#fff; }.row-heading,.row-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }.row-heading > text { font-size:14px; }.goods { display:flex; gap:12px; }.goods image { width:64px; height:64px; border-radius:$radius-sm; flex:none; }.goods > view { min-width:0; flex:1; display:flex; flex-direction:column; gap:3px; overflow-wrap:anywhere; }.goods text:first-child { font-size:16px; font-weight:600; }.goods text:nth-child(2) { font-size:13px; color:$color-text-secondary; }.goods text:last-child { color:$color-accent; font-size:15px; }.row-footer { border-top:1px solid $color-border; padding-top:8px; }.row-footer > text { flex:1; min-width:100px; color:$color-text-secondary; font-size:13px; line-height:20px; }.row-footer :deep(.app-button) { min-width:96px; }
</style>
