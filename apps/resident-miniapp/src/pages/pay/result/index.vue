<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import ResultState from '@/components/ResultState.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { openPage, openSubPage } from '@/utils/navigation'

const orderId = ref('')
const paying = ref(false)
const { status, data, errorMessage, load } = usePageResource(() => residentMallService.getOrder(orderId.value))
const money = (value = 0) => (value / 100).toFixed(2)
const success = computed(() => ['Mock成功', '支付成功'].includes(data.value?.paymentStatus || ''))
const pending = computed(() => data.value?.paymentStatus === '支付中')
const closed = computed(() => data.value?.tradeStatus === '已关闭' || data.value?.paymentStatus === '已关闭')
const resultTone = computed(() => success.value ? 'success' : closed.value ? 'error' : 'pending')
const resultTitle = computed(() => success.value ? '模拟支付成功' : pending.value ? '支付结果确认中' : closed.value ? '订单已关闭' : '等待支付')
const resultDescription = computed(() => success.value ? '已按统一 Pay 业务口径完成 Mock Pay，商户可以开始履约。' : pending.value ? '请主动查询支付结果，确认前不会重复发起支付。' : closed.value ? '支付未完成，锁定库存已释放。' : '当前为 Mock Pay 测试环境，不会调用真实支付渠道。')
const pay = async (outcome: 'success' | 'failure' | 'unknown') => { if (paying.value || !data.value) return; paying.value = true; try { await residentMallService.payOrder(data.value.id, outcome); await load() } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '支付处理失败', icon: 'none' }) } finally { paying.value = false } }
const query = async () => { await residentMallService.queryPayment(orderId.value); await load(); uni.showToast({ title: '已查询统一 Pay 状态', icon: 'none' }) }
onLoad((options) => { orderId.value = typeof options?.orderId === 'string' ? options.orderId : ''; load() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="支付结果" centered show-back /></template>
    <view v-if="data" class="stack pay-page"><BaseCard class="pay-environment"><text>Mock Pay 测试环境</text><text>仅展示统一业务支付状态，不调用真实支付渠道。</text></BaseCard><ResultState :tone="resultTone" :title="resultTitle" :description="resultDescription"><text class="pay-amount">¥{{ money(data.payableAmount) }}</text><text class="pay-order">订单号：{{ data.no }}</text></ResultState><BaseCard><view class="summary-row"><text>商户</text><text>{{ data.merchantName }}</text></view><view class="summary-row"><text>履约方式</text><text>{{ data.fulfillmentMethod }}</text></view><view class="summary-row"><text>支付状态</text><text>{{ data.paymentStatus }}</text></view></BaseCard><view class="pay-actions"><AppButton v-if="!success && !closed" :loading="paying" @click="pay('success')">Mock Pay 支付</AppButton><AppButton v-if="!success && !closed" variant="secondary" :disabled="paying" @click="pay('unknown')">模拟支付处理中</AppButton><AppButton v-if="pending" variant="quiet" @click="query">主动查询支付结果</AppButton><AppButton v-if="!success && !closed" variant="quiet" :disabled="paying" @click="pay('failure')">模拟支付失败</AppButton><AppButton v-if="success" @click="openSubPage(`/pages/mall/order-detail/index?id=${data.id}`)">查看订单</AppButton><AppButton v-if="success" variant="secondary" @click="openPage('/pages/mall/index')">返回商城</AppButton><AppButton v-if="closed" @click="openPage('/pages/mall/index')">重新购买</AppButton></view></view>
  </AppPage>
</template>

<style scoped lang="scss">
.pay-page { gap:$space-3; }.pay-environment { display:flex; flex-direction:column; gap:3px; border-color:rgba(250,173,20,.45); background:$color-warning-light; color:$color-warning; font-size:13px; line-height:19px; }.pay-environment text:first-child { font-size:15px; font-weight:700; }.pay-amount { display:block; margin-top:$space-3; color:$color-accent; font-size:30px; font-weight:700; }.pay-order { display:block; margin-top:$space-2; color:$color-text-secondary; font-size:12px; }.summary-row { display:flex; align-items:center; justify-content:space-between; gap:$space-3; min-height:44px; border-bottom:1px solid rgba(225,228,230,.72); color:$color-text-secondary; font-size:14px; }.summary-row:last-child { border:0; }.summary-row text:last-child { color:$color-text-primary; text-align:right; }.pay-actions { display:flex; flex-direction:column; gap:$space-2; padding-top:$space-2; }
</style>
