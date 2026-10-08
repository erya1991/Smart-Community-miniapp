<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import ResultState from '@/components/ResultState.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'

const productId = ref('')
const merchant = ref('')
const { status, data, errorMessage, load } = usePageResource(async () => productId.value ? residentMallService.getDetail(productId.value) : null)
const contextText = computed(() => data.value ? `${data.value.merchantName} · ${data.value.name}` : merchant.value || '已按商户整理结算商品')
const goBack = () => uni.navigateBack()
onLoad((options) => { productId.value = typeof options?.productId === 'string' ? options.productId : ''; merchant.value = typeof options?.merchant === 'string' ? decodeURIComponent(options.merchant) : ''; load() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="确认订单" centered show-back /></template>
    <view class="placeholder-page"><BaseCard class="context-card"><text>本次结算</text><text>{{ contextText }}</text><text>已保留项目、商户、SKU 与履约方式上下文。</text></BaseCard><ResultState tone="pending" title="订单确认即将开放" description="当前已完成商品选择与单商户结算路由；确认订单、支付及履约将在后续阶段提供。"><view class="return-link" @click="goBack">返回商城</view></ResultState></view>
  </AppPage>
</template>

<style scoped lang="scss">
.placeholder-page { display: flex; flex-direction: column; gap: $space-4; }.context-card { display: flex; flex-direction: column; gap: $space-2; background: $color-primary-light; }.context-card text:first-child { color: $color-primary; font-size: 13px; }.context-card text:nth-child(2) { font-size: 18px; font-weight: 700; }.context-card text:last-child { color: $color-text-secondary; font-size: 13px; line-height: 20px; }.return-link { min-height: 44px; margin-top: $space-3; color: $color-primary; font-size: 15px; line-height: 44px; }
</style>
