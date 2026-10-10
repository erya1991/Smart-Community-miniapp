<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import EvidenceUploader from '@/components/EvidenceUploader.vue'
import FormField from '@/components/FormField.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantAfterSaleService } from '@/services/after-sale'
import { merchantTradeService } from '@/services/trade'
import { platformRefundDemoService } from '@/services/platform-refund-demo'
import { openSubPage } from '@/utils/navigation'

const id = ref(''), busy = ref(false), message = ref(''), rejectOpen = ref(false), rejectReason = ref(''), demoOpen = ref(false)
const order = ref<Awaited<ReturnType<typeof merchantTradeService.getOrder>>>()
const { status, data, errorMessage, load, refresh } = usePageResource(async () => { const record = await merchantAfterSaleService.get(id.value); order.value = await merchantTradeService.getOrder(record.orderId); return record })
const money = (amount: number) => (amount / 100).toFixed(2)
const act = async (action: 'approve' | 'reject' | 'receive') => {
  if (!data.value || busy.value) return
  if (action === 'reject' && !rejectOpen.value) { rejectOpen.value = true; return }
  if (action === 'reject' && !rejectReason.value.trim()) { message.value = '请填写驳回原因。'; return }
  if (action === 'approve' && !data.value.operations.approve || action === 'reject' && !data.value.operations.reject || action === 'receive' && !data.value.operations.confirmReturn) return
  busy.value = true; message.value = ''
  try {
    const content = action === 'receive' ? '请确认已实际收到居民退回的商品。确认后进入平台退款处理，当前不会直接退款成功。' : action === 'reject' ? '确认驳回？原因将展示给居民：' + rejectReason.value.trim() : data.value.serviceType === 'RETURN_GOODS' ? '确认同意退货退款？居民退回商品并确认收货后，再由平台处理退款。' : '确认同意退款？申请将进入等待平台退款状态，同意审核不代表退款成功。'
    const result = await uni.showModal({ title: action === 'receive' ? '确认收到退货' : action === 'reject' ? '驳回售后' : '同意申请', content })
    if (!result.confirm) return
    if (action === 'receive') await merchantAfterSaleService.confirmReturn(data.value.id)
    else if (action === 'reject') await merchantAfterSaleService.reject(data.value.id, rejectReason.value.trim())
    else await merchantAfterSaleService.approve(data.value.id)
    rejectOpen.value = false; await refresh()
  } catch (error) { message.value = error instanceof Error ? error.message : '处理失败，请刷新重试。'; await refresh() } finally { busy.value = false }
}
const simulate = async (outcome: 'processing' | 'success' | 'failure') => {
  if (!data.value || busy.value || data.value.serviceStatus !== 'WAIT_REFUND') return
  busy.value = true; message.value = ''
  try { const result = await uni.showModal({ title: '平台退款 Mock', content: '本次以平台模拟器身份更新退款结果，仅用于原型演示，不执行真实资金操作。' }); if (!result.confirm) return; await platformRefundDemoService.process(data.value.id, outcome); await refresh() }
  catch (error) { message.value = error instanceof Error ? error.message : '模拟失败'; await refresh() } finally { busy.value = false }
}
onLoad(options => { id.value = options?.id || ''; load() })
onShow(() => { if (data.value) refresh() })
</script>
<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="售后详情" centered show-back /></template>
    <view v-if="data" class="stack after-sale-detail">
      <BaseCard class="status-panel"><StatusTag :tone="data.serviceStatus === 'COMPLETE' ? 'success' : data.serviceStatus === 'REFUSE' ? 'error' : 'pending'">{{ data.statusLabel }}</StatusTag><text>{{ data.nextStep }}</text><text>售后单 {{ data.sn }}</text></BaseCard>
      <view class="notice">{{ data.serviceType === 'RETURN_GOODS' ? '退货收货与退款结果分别记录，确认收货后仍须等待平台退款。' : '商户只审核申请，退款结果由平台处理并同步。' }}</view>
      <BaseCard><text class="section-title">退款信息</text><view class="line"><text>申请金额</text><text class="amount">¥{{ money(data.applyRefundAmount) }}</text></view><view class="line"><text>退款状态</text><text>{{ data.refundStatus }}</text></view><template v-if="data.refundAt"><view class="line"><text>实际退款</text><text>¥{{ money(data.actualRefundAmount) }}</text></view><view class="line"><text>退款时间</text><text>{{ data.refundAt }}</text></view><view class="line"><text>Mock 退款流水</text><text>{{ data.refundTransactionNo }}</text></view></template><text v-if="data.profitSharingReturnRequired" class="muted">资金调整处理中，由平台协调处理。</text></BaseCard>
      <BaseCard><text class="section-title">售后商品</text><view class="goods"><image :src="data.item.productImage" mode="aspectFill" /><view><text>{{ data.item.productName }}</text><text>{{ data.item.skuName }}</text><text>购买 {{ data.item.quantity }} 件 · 售后 {{ data.quantity }} 件</text></view></view></BaseCard>
      <BaseCard><text class="section-title">居民申请</text><view class="line"><text>申请人</text><text>{{ data.memberName }}</text></view><view class="line"><text>申请类型</text><text>{{ data.typeLabel }}</text></view><view class="line"><text>申请原因</text><text>{{ data.reason }}</text></view><view class="line"><text>申请时间</text><text>{{ data.createdAt }}</text></view><text class="description">{{ data.problemDesc || '未填写补充说明' }}</text><EvidenceUploader v-if="data.images.length" :files="data.images" images readonly :max-files="6" /><text v-if="data.merchantAuditRemark" class="error">审核说明：{{ data.merchantAuditRemark }}</text></BaseCard>
      <BaseCard v-if="data.serviceType === 'RETURN_GOODS'"><text class="section-title">退货与收货</text><text class="description">{{ data.returnAddress }} · {{ data.returnInstructions }}</text><template v-if="data.mDeliverTime"><view class="line"><text>退回方式</text><text>{{ data.returnMethod }}</text></view><view class="line"><text>退回时间</text><text>{{ data.mDeliverTime }}</text></view><view v-if="data.mLogisticsNo" class="line"><text>{{ data.mLogisticsName }}</text><text>{{ data.mLogisticsNo }}</text></view><text v-if="data.returnRemark" class="description">{{ data.returnRemark }}</text><view class="line"><text>收货时间</text><text>{{ data.returnReceivedAt || '等待实际收到退货后确认' }}</text></view></template><text v-else class="muted">{{ data.serviceStatus === 'APPLY' ? '等待审核申请' : '居民尚未提交退回信息' }}</text></BaseCard>
      <BaseCard v-if="order"><text class="section-title">订单与支付摘要</text><view class="line"><text>子订单号</text><text>{{ data.orderSn }}</text></view><view class="line"><text>交易号</text><text>{{ data.tradeSn }}</text></view><view class="line"><text>实付金额</text><text>¥{{ money(order.paidAmount) }}</text></view><view class="line"><text>支付 / 履约</text><text>{{ order.paymentStatus }} / {{ order.fulfillmentStatus }}</text></view><AppButton variant="quiet" @click="openSubPage('/pages/order/detail/index?id=' + encodeURIComponent(data.orderId))">查看订单</AppButton></BaseCard>
      <BaseCard><text class="section-title">售后进度</text><view class="timeline"><view v-for="(event, index) in data.timeline" :key="index"><text>{{ event.title }}</text><text>{{ event.description }}</text><text>{{ event.time }} · {{ event.operatorName }}</text></view></view></BaseCard>
      <BaseCard v-if="rejectOpen && data.operations.reject"><FormField label="驳回原因" required><textarea v-model="rejectReason" :disabled="busy" maxlength="500" auto-height placeholder="请说明原因，居民将看到该内容" /></FormField></BaseCard>
      <text v-if="message" class="error">{{ message }}</text>
      <BaseCard v-if="data.serviceStatus === 'WAIT_REFUND'"><view class="demo-toggle" @click="demoOpen = !demoOpen">原型演示（Mock） {{ demoOpen ? '收起' : '展开' }}</view><view v-if="demoOpen" class="stack"><text class="muted">平台角色模拟器：模拟退款处理、成功或失败。商户审核按钮不具备退款权限。</text><AppButton variant="secondary" :disabled="busy" @click="simulate('processing')">模拟平台处理中 / 重试</AppButton><AppButton variant="secondary" :disabled="busy" @click="simulate('success')">模拟平台退款成功</AppButton><AppButton variant="secondary" :disabled="busy" @click="simulate('failure')">模拟平台退款失败</AppButton></view></BaseCard>
    </view>
    <BottomActionBar v-if="data"><AppButton v-if="data.operations.reject" variant="secondary" :disabled="busy" @click="act('reject')">{{ rejectOpen ? '确认驳回' : '驳回申请' }}</AppButton><AppButton v-if="data.operations.approve" :disabled="busy" :loading="busy" @click="act('approve')">同意申请</AppButton><AppButton v-else-if="data.operations.confirmReturn" :disabled="busy" :loading="busy" @click="act('receive')">确认收到退货</AppButton><AppButton v-else-if="!data.operations.reject" variant="secondary" @click="openSubPage('/pages/after-sale/index')">返回售后列表</AppButton></BottomActionBar>
  </AppPage>
</template>
<style scoped lang="scss">
.after-sale-detail { gap:12px; }.status-panel { display:flex; flex-direction:column; gap:8px; background:$color-primary; color:#fff; }.status-panel > text:last-child { font-size:13px; opacity:.8; }.status-panel :deep(.status-tag) { align-self:flex-start; }.notice { padding:12px; border-radius:$radius-md; background:$color-primary-light; color:$color-primary; font-size:14px; line-height:22px; }.section-title { display:block; font-size:17px; font-weight:700; padding-bottom:12px; border-bottom:1px solid $color-border; }.line { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-top:12px; font-size:15px; line-height:22px; }.line text:first-child { flex:none; color:$color-text-secondary; }.line text:last-child { min-width:0; text-align:right; overflow-wrap:anywhere; }.amount { color:$color-accent; font-size:24px; font-weight:700; }.goods { display:flex; gap:12px; padding-top:12px; }.goods image { width:64px; height:64px; flex:none; border-radius:$radius-sm; }.goods > view { display:flex; flex:1; min-width:0; flex-direction:column; gap:5px; font-size:15px; }.goods text:first-child { font-weight:600; }.goods text:not(:first-child) { color:$color-text-secondary; font-size:13px; }.description,.muted { display:block; padding-top:12px; font-size:14px; color:$color-text-secondary; line-height:22px; }.error { display:block; color:$color-error; font-size:15px; line-height:24px; padding-top:8px; }.timeline { padding:12px 0 0 8px; }.timeline > view { position:relative; display:flex; flex-direction:column; gap:4px; border-left:1px solid $color-border; padding:0 0 20px 16px; font-size:14px; }.timeline > view::before { position:absolute; content:''; width:8px; height:8px; top:4px; left:-4px; border-radius:50%; background:$color-primary; }.timeline text:not(:first-child) { font-size:13px; color:$color-text-secondary; }.after-sale-detail text { overflow-wrap:anywhere; }textarea { box-sizing:border-box; width:100%; min-height:100px; padding:12px; background:$color-group-bg; border-radius:$radius-md; font-size:15px; line-height:24px; }.demo-toggle { display:flex; min-height:44px; align-items:center; color:$color-primary; font-size:15px; }
</style>
