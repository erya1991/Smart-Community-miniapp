<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import EvidenceUploader from '@/components/EvidenceUploader.vue'
import FormField from '@/components/FormField.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import AppButton from '@/components/AppButton.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentAfterSaleService as service } from '@/services/after-sale'
import { formatMoneyFromFen as money, openSubPage } from '@/utils/navigation'
import type { ReturnShipmentInput } from '@/types/after-sale'

const id = ref(''), busy = ref(false), message = ref('')
const returnForm = ref<ReturnShipmentInput>({ returnMethod: '现场退回', remark: '' })
const methods = ['现场退回', '自行快递'] as const
const companies = ref<{ code: string; name: string }[]>([])
const { status, data, errorMessage, load, refresh } = usePageResource(() => service.get(id.value))
const chooseCompany = (index: number) => { const company = companies.value[index]; if (company) Object.assign(returnForm.value, { mLogisticsCode: company.code, mLogisticsName: company.name }) }
const act = async (kind: 'cancel' | 'return') => {
  if (busy.value || !data.value || !(kind === 'cancel' ? data.value.operations.cancel : data.value.operations.submitReturn)) return
  busy.value = true; message.value = ''
  try {
    const result = await uni.showModal({ title: kind === 'cancel' ? '取消售后' : '提交退货信息', content: kind === 'cancel' ? '确认取消本次售后申请？取消后如仍符合规则，可以重新申请。' : '请核对退货方式、物流信息，并确认已按说明退回商品。' })
    if (!result.confirm) return
    if (kind === 'cancel') await service.cancel(id.value)
    else await service.submitReturn(id.value, { ...returnForm.value })
    await refresh()
  } catch (error) { message.value = error instanceof Error ? error.message : '操作失败，请重试。' }
  finally { busy.value = false }
}
onLoad(async options => { id.value = options?.id || ''; await load(); try { companies.value = await service.getReturnCompanies() } catch { message.value = '退货物流公司读取失败，请返回重试。' } })
onShow(() => { if (data.value) return refresh() })
</script>
<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="售后详情" centered show-back /></template>
    <view v-if="data" class="stack after-detail">
      <BaseCard class="status-hero"><StatusTag :tone="data.refundStatus === '退款成功' ? 'success' : 'pending'">{{ data.statusLabel }}</StatusTag><text>{{ data.nextStep }}</text></BaseCard>
      <BaseCard><text class="section-title">处理进度</text><view class="timeline"><view v-for="(event, index) in data.timeline" :key="index"><text>{{ event.title }}</text><text>{{ event.description }}</text><text>{{ event.time }} · {{ event.operatorName }}</text></view></view></BaseCard>
      <BaseCard><text class="section-title">{{ data.storeName }}</text><view class="goods"><image :src="data.item.productImage" mode="aspectFill" /><view><text>{{ data.item.productName }}</text><text>{{ data.item.skuName }}</text><text>本次申请 {{ data.quantity }} 件</text><text class="amount">申请 ¥{{ money(data.applyRefundAmount) }}</text></view></view></BaseCard>
      <BaseCard><text class="section-title">申请内容</text><view class="row"><text>售后单号</text><text>{{ data.sn }}</text></view><view class="row"><text>关联订单</text><text>{{ data.orderSn }}</text></view><view class="row"><text>售后类型</text><text>{{ data.typeLabel }}</text></view><view class="row"><text>申请原因</text><text>{{ data.reason }}</text></view><view class="row"><text>申请时间</text><text>{{ data.createdAt }}</text></view><text class="description">{{ data.problemDesc || '未填写补充描述' }}</text><EvidenceUploader v-if="data.images.length" :files="data.images" images readonly /><text v-if="data.merchantAuditRemark" class="audit-reason">商家处理原因：{{ data.merchantAuditRemark }}</text></BaseCard>
      <BaseCard v-if="data.serviceType === 'RETURN_GOODS'"><text class="section-title">退货信息</text><text class="description">{{ data.returnAddress }}</text><text class="muted">{{ data.returnInstructions }}</text><template v-if="data.mDeliverTime"><view class="row"><text>退货方式</text><text>{{ data.returnMethod }}</text></view><view v-if="data.mLogisticsNo" class="row"><text>退货物流</text><text>{{ data.mLogisticsName }} {{ data.mLogisticsNo }}</text></view><view class="row"><text>提交时间</text><text>{{ data.mDeliverTime }}</text></view><text v-if="data.returnRemark" class="description">{{ data.returnRemark }}</text></template><template v-if="data.operations.submitReturn"><FormField label="退货方式" required><picker :range="methods" :disabled="busy" @change="returnForm.returnMethod = methods[Number($event.detail.value)]"><view class="picker-value">{{ returnForm.returnMethod }} ›</view></picker></FormField><template v-if="returnForm.returnMethod === '自行快递'"><FormField label="物流公司" required><picker :range="companies" range-key="name" :disabled="busy" @change="chooseCompany(Number($event.detail.value))"><view class="picker-value">{{ returnForm.mLogisticsName || '请选择物流公司' }} ›</view></picker></FormField><FormField label="物流单号" required><input v-model="returnForm.mLogisticsNo" maxlength="40" :disabled="busy" placeholder="请输入退货物流单号" /></FormField></template><FormField label="退货备注" hint="最多 200 字"><textarea v-model="returnForm.remark" maxlength="200" :disabled="busy" auto-height /></FormField></template></BaseCard>
      <BaseCard><text class="section-title">退款信息</text><view class="row"><text>退款状态</text><text>{{ data.refundStatus }}</text></view><view class="row"><text>实际退款金额</text><text class="amount">¥{{ money(data.actualRefundAmount) }}</text></view><text v-if="data.refundAt" class="muted">{{ data.refundAt }} · 原支付渠道退回</text><text v-if="data.refundTransactionNo" class="muted">模拟退款流水：{{ data.refundTransactionNo }}</text><text v-if="data.refundStatus === '退款失败'" class="audit-reason">退款处理中出现异常，平台正在处理。</text></BaseCard>
      <text v-if="message" class="error-message" role="alert">{{ message }}</text>
    </view>
    <BottomActionBar v-if="data"><AppButton v-if="data.operations.cancel" variant="secondary" :loading="busy" @click="act('cancel')">取消售后</AppButton><AppButton v-else-if="data.operations.submitReturn" :loading="busy" @click="act('return')">提交退货信息</AppButton><AppButton v-else variant="secondary" @click="openSubPage('/pages/mall/order-detail/index?id=' + encodeURIComponent(data!.orderId))">查看订单</AppButton></BottomActionBar>
  </AppPage>
</template>
<style scoped lang="scss">
.after-detail { gap:$space-3; }.status-hero { background:$color-primary; color:#fff; }.status-hero > text { display:block; margin-top:12px; font-size:16px; line-height:25px; }.status-hero :deep(.status-tag) { background:rgba(255,255,255,.15); color:#fff; }.section-title { display:block; font-size:17px; font-weight:600; }.goods { display:flex; gap:12px; margin-top:16px; }.goods image { width:72px; height:72px; flex:none; border-radius:$radius-md; }.goods > view { display:flex; min-width:0; flex:1; flex-direction:column; gap:6px; font-size:15px; overflow-wrap:anywhere; }.row { display:flex; align-items:flex-start; gap:12px; padding-top:14px; font-size:14px; line-height:22px; }.row text:first-child { flex:none; color:$color-text-secondary; }.row text:last-child { min-width:0; flex:1; text-align:right; overflow-wrap:anywhere; }.amount { color:$color-accent; font-weight:600; }.description { display:block; margin:14px 0; font-size:15px; line-height:24px; white-space:pre-wrap; overflow-wrap:anywhere; }.muted { display:block; margin-top:8px; color:$color-text-secondary; font-size:13px; line-height:22px; overflow-wrap:anywhere; }.timeline { display:flex; flex-direction:column; gap:16px; padding:16px 0 0 12px; border-left:2px solid $color-primary-light; }.timeline > view { display:flex; flex-direction:column; gap:4px; }.timeline text { font-size:13px; color:$color-text-secondary; line-height:21px; overflow-wrap:anywhere; }.timeline text:first-child { color:$color-primary; font-size:15px; font-weight:600; }.picker-value { display:flex; min-height:48px; align-items:center; font-size:16px; }.audit-reason { display:block; margin-top:12px; padding:12px; border-radius:$radius-md; background:$color-warning-light; font-size:15px; line-height:24px; overflow-wrap:anywhere; }.error-message { color:$color-error; font-size:15px; line-height:24px; }input,textarea { font-size:16px; }
</style>
