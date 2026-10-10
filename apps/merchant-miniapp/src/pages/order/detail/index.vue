<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import StepProgress from '@/components/StepProgress.vue'
import LogisticsShipmentPanel from '@/features/fulfillment/LogisticsShipmentPanel.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantTradeService } from '@/services/trade'
import { merchantAfterSaleService } from '@/services/after-sale'
import type { MerchantAfterSaleView } from '@/types/after-sale'
import { merchantOrderAction, isOrderPaid } from '@/utils/merchantOrder'
import { openSubPage } from '@/utils/navigation'

const orderId = ref(''), remark = ref(''), actionError = ref('')
const busy = ref(false), shipmentOpen = ref(false)
const shipmentPanel = ref<InstanceType<typeof LogisticsShipmentPanel>>()
const afterSales = ref<MerchantAfterSaleView[]>([])
const { status, data, errorMessage, load, refresh } = usePageResource(async () => { const order = await merchantTradeService.getOrder(orderId.value); remark.value = order.merchantRemark || ''; afterSales.value = await merchantAfterSaleService.getOrderRecords(order.id); return order })
const money = (value: number) => (value / 100).toFixed(2)
const displayStatus = computed(() => data.value?.displayStatus || '')
const paid = computed(() => data.value && isOrderPaid(data.value))
const steps = computed(() => data.value?.fulfillmentMethod === '商户配送' ? ['待备货', '待配送', '配送中', '已送达', '已完成'] : data.value?.fulfillmentMethod === '普通物流' ? ['待备货', '待发货', '已发货', '已完成'] : data.value?.fulfillmentMethod === '社区自提' ? ['待备货', '待自提', '已核销', '已完成'] : ['待核销', '已核销', '已完成'])
const current = computed(() => Math.max(1, steps.value.indexOf(displayStatus.value) + 1))
const actionLabel = computed(() => data.value ? merchantOrderAction(data.value) : '')
const tone = computed(() => displayStatus.value === '已完成' ? 'success' : ['支付失败', '已关闭'].includes(displayStatus.value) ? 'error' : 'pending')
const fulfill = async () => {
  if (!data.value || busy.value) return
  if (actionLabel.value === '去核销') { openSubPage('/pages/verification/index?code=' + encodeURIComponent(data.value.verificationCode || '')); return }
  if (actionLabel.value === '查看物流') { uni.pageScrollTo({ selector: '#shipment-info', duration: 200 }); return }
  if (actionLabel.value === '发货') {
    if (shipmentOpen.value) { await shipmentPanel.value?.submit(); return }
    shipmentOpen.value = true
    await nextTick(); uni.pageScrollTo({ selector: '#logistics-form', duration: 200 }); return
  }
  const action = actionLabel.value === '完成备货' ? 'finish-preparing' : actionLabel.value === '开始配送' ? 'start-delivery' : actionLabel.value === '确认送达' ? 'mark-delivered' : undefined
  if (!action) return
  const content = action === 'finish-preparing' ? '确认商品已完成备货？确认后订单将进入' + (data.value.fulfillmentMethod === '普通物流' ? '待发货' : data.value.fulfillmentMethod === '社区自提' ? '待自提' : data.value.fulfillmentMethod === '到店核销' ? '待核销' : '待配送') + '状态。' : action === 'start-delivery' ? '确认现在开始配送？请核对收货人、地址和商品。' : '请确认商品已经实际送达居民，之后等待居民确认收货。'
  busy.value = true; actionError.value = ''
  try { const result = await uni.showModal({ title: actionLabel.value, content }); if (!result.confirm) return; await merchantTradeService.fulfill(data.value.id, action); await refresh() }
  catch (error) { actionError.value = error instanceof Error ? error.message : '操作失败，请刷新后重试。'; await refresh() }
  finally { busy.value = false }
}
const shipped = async () => { shipmentOpen.value = false; await refresh() }
const saveRemark = async () => { if (!data.value || busy.value) return; busy.value = true; actionError.value = ''; try { await merchantTradeService.saveRemark(data.value.id, remark.value); await refresh(); uni.showToast({ title: '备注已保存', icon: 'success' }) } catch (error) { actionError.value = error instanceof Error ? error.message : '保存失败，请重试。' } finally { busy.value = false } }
onLoad((options) => { orderId.value = options?.id || ''; load() })
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="订单详情" centered show-back /></template>
    <view v-if="data" class="stack merchant-detail-page">
      <BaseCard class="merchant-status"><view><StatusTag :tone="tone">{{ data.paymentStatus === '支付中' ? '支付结果确认中' : data.paymentStatus === 'Mock成功' ? '支付成功' : data.paymentStatus }}</StatusTag><text>{{ data.fulfillmentMethod }}</text></view><view><text>履约：{{ paid ? data.fulfillmentStatus : '等待支付确认' }}</text><StatusTag v-if="data.afterSaleStatus !== '无售后'" tone="error">{{ data.afterSaleStatus }}</StatusTag></view><text>当前子订单 {{ data.no }}</text><text>下单 {{ data.createdAt }}</text></BaseCard>
      <text v-if="actionError" class="operation-error">{{ actionError }}</text><BaseCard v-if="afterSales.length"><view class="section-title"><text>{{ data.afterSaleSummary || '售后记录' }}</text></view><text v-if="data.fulfillmentBlocked" class="waiting-note">本子订单存在售后限制，暂不可备货、配送、发货或核销。其他商户子订单可独立处理。</text><view v-for="record in afterSales" :key="record.id" class="after-sale-record"><text>{{ record.item.productName }} · {{ record.quantity }} 件 · {{ record.statusLabel }}</text><AppButton variant="quiet" @click="openSubPage('/pages/after-sale/detail/index?id=' + encodeURIComponent(record.id))">查看售后</AppButton></view></BaseCard>
      <BaseCard><view class="section-title"><AppIcon name="car" :size="20" /><text>履约流程：{{ data.fulfillmentMethod }}</text></view><StepProgress v-if="paid" :steps="steps" :current="current" :completed="Math.max(0, current - 1)" /><text v-else class="waiting-note">支付结果确认成功前不能履约。</text><view class="timeline"><view v-for="(event, index) in data.timeline" :key="index"><text>{{ event.title }}</text><text>{{ event.description }}</text><text>{{ event.time }} {{ event.operatorName || '' }}</text></view></view><text v-if="data.fulfillmentStatus === '已送达'" class="waiting-note">已送达，等待居民确认收货。</text></BaseCard>
      <BaseCard><view class="section-title"><AppIcon name="location" :size="20" /><text>{{ ['商户配送', '普通物流'].includes(data.fulfillmentMethod) ? '收货与送达信息' : data.fulfillmentMethod + '信息' }}</text></view><view class="info-block"><text>{{ data.contactSnapshot.name }} {{ data.contactSnapshot.mobile }}</text><template v-if="data.addressSnapshot"><text>{{ data.addressSnapshot.region }}{{ data.addressSnapshot.detail }}</text></template><template v-else><text>{{ data.fulfillmentLocation?.name || data.pickupPoint }}</text><text>{{ data.fulfillmentLocation?.address }}</text><text v-if="data.fulfillmentLocation">{{ data.fulfillmentLocation.mobile }} · {{ data.fulfillmentLocation.hours }}</text></template><text v-if="data.buyerRemark" class="remark">买家留言：{{ data.buyerRemark }}</text><text v-if="data.verificationCode">核销码：{{ data.verificationCode }}（{{ data.verificationStatus }}）</text></view></BaseCard>
      <BaseCard v-if="data.logisticsNo" id="shipment-info"><view class="section-title"><text>物流信息</text></view><view class="info-block"><text>{{ data.logisticsName }}</text><text>物流单号：{{ data.logisticsNo }}</text><text>发货时间：{{ data.shippedAt }}</text><text v-if="data.shipmentRemark">{{ data.shipmentRemark }}</text><text>当前只登记发货信息，不查询实时物流轨迹。</text></view></BaseCard>
      <LogisticsShipmentPanel v-if="shipmentOpen && actionLabel === '发货'" ref="shipmentPanel" :order-id="data.id" @busy="busy = $event" @shipped="shipped" />
      <BaseCard><view class="section-title"><AppIcon name="bag" :size="20" /><text>订购商品明细</text></view><view v-for="item in data.items" :key="item.skuId" class="product-row"><image :src="item.productImage" mode="aspectFill" /><view><text>{{ item.productName }}</text><text>{{ item.skuName }}</text><text>¥{{ money(item.unitPrice) }} × {{ item.quantity }}</text><text v-if="item.remainingFulfillmentQuantity !== undefined">剩余履约数量 {{ item.remainingFulfillmentQuantity }} 件</text></view></view><view class="money-row"><text>商品小计</text><text>¥{{ money(data.goodsAmount) }}</text></view><view class="money-row"><text>配送费 / 运费</text><text>¥{{ money(data.deliveryFee) }}</text></view><view class="money-row"><text>优惠</text><text>−¥{{ money(data.discountAmount) }}</text></view><view class="money-row"><text>实付金额</text><text>¥{{ money(data.paidAmount) }}</text></view></BaseCard>
      <BaseCard><view class="section-title"><AppIcon name="bill" :size="20" /><text>订单信息</text></view><view class="plain-row"><text>交易号</text><text>{{ data.tradeSn }}</text></view><view class="plain-row"><text>子订单号</text><text>{{ data.no }}</text></view><view class="plain-row"><text>支付时间</text><text>{{ data.paidAt || '未支付' }}</text></view><view class="plain-row"><text>资金摘要</text><text>{{ data.profitSharingStatus }}</text></view></BaseCard>
      <BaseCard><view class="section-title"><AppIcon name="message" :size="20" /><text>商户备注</text></view><textarea v-model="remark" maxlength="200" :disabled="busy" auto-height placeholder="仅当前商户和平台处理人员可见" /><AppButton variant="quiet" :disabled="busy" :loading="busy" @click="saveRemark">保存备注</AppButton></BaseCard>
    </view>
    <BottomActionBar v-if="data"><AppButton v-if="actionLabel" :disabled="busy" :loading="busy" @click="fulfill">{{ shipmentOpen && actionLabel === '发货' ? '确认发货' : actionLabel }}</AppButton><AppButton v-else variant="secondary" @click="openSubPage('/pages/order/index')">返回订单列表</AppButton></BottomActionBar>
  </AppPage>
</template>
<style scoped lang="scss">
.merchant-detail-page { gap:$space-3; }.merchant-status { display:flex; flex-direction:column; gap:$space-2; background:$color-primary; color:#fff; }.merchant-status > view { display:flex; align-items:center; gap:$space-2; }.merchant-status :deep(.status-tag) { min-height:24px; border:1px solid rgba(255,255,255,.45); background:rgba(255,255,255,.14); color:#fff; }.merchant-status > text { color:rgba(255,255,255,.8); font-size:13px; }.section-title { display:flex; align-items:center; gap:$space-2; padding-bottom:$space-3; border-bottom:1px solid rgba(225,228,230,.72); font-size:17px; font-weight:700; }.timeline { display:flex; flex-direction:column; gap:$space-3; padding:$space-3 0 0 $space-2; }.timeline > view { position:relative; display:flex; flex-direction:column; gap:2px; padding-left:$space-3; color:$color-text-secondary; font-size:12px; line-height:18px; }.timeline > view::before { position:absolute; top:5px; left:0; width:7px; height:7px; border-radius:50%; background:$color-primary; content:''; }.timeline text:first-child { color:$color-text-primary; font-size:14px; font-weight:600; }.timeline text:last-child { color:$color-text-disabled; }.info-block { display:flex; flex-direction:column; gap:$space-2; padding-top:$space-3; font-size:15px; line-height:22px; }.info-block text:first-child { font-size:17px; font-weight:700; }.remark { padding:$space-2; border-radius:$radius-sm; background:$color-warning-light; color:$color-warning; }.product-row { display:flex; align-items:center; gap:$space-3; padding:$space-3 0; border-bottom:1px solid rgba(225,228,230,.72); }.product-row image { width:64px; height:64px; border-radius:$radius-md; background:$color-group-bg; }.product-row > view { display:flex; flex:1; flex-direction:column; gap:3px; }.product-row text:first-child { font-size:16px; font-weight:600; }.product-row text:not(:first-child) { color:$color-text-secondary; font-size:13px; }.product-row text:last-child { color:$color-accent; font-size:15px; font-weight:700; }.money-row,.plain-row { display:flex; align-items:center; justify-content:space-between; gap:$space-3; padding-top:$space-3; color:$color-text-secondary; font-size:14px; }.money-row text:last-child,.plain-row text:last-child { color:$color-text-primary; }.money-hero { display:flex; align-items:baseline; flex-wrap:wrap; gap:$space-2; margin-top:$space-3; padding:$space-3; border-radius:$radius-md; background:$color-group-bg; }.money-hero text:first-child { color:$color-text-secondary; font-size:13px; }.money-hero text:nth-child(2) { flex:1; color:$color-accent; font-size:27px; font-weight:700; }.money-hero :deep(.status-tag) { min-height:22px; padding:0 6px; border-radius:999px; font-size:12px; } textarea { width:100%; min-height:64px; margin-top:$space-3; padding:$space-3; border-radius:$radius-md; background:$color-group-bg; font-size:14px; line-height:20px; }.remark-save { display:flex; width:96px; height:36px; align-items:center; justify-content:center; margin:$space-3 0 0 auto; border-radius:$radius-md; background:$color-primary-light; color:$color-primary; font-size:13px; font-weight:600; }
.merchant-status > view { flex-wrap:wrap; }.merchant-status > text,.info-block,.plain-row text:last-child { overflow-wrap:anywhere; }.plain-row { align-items:flex-start; }.plain-row text:first-child { flex:none; }.plain-row text:last-child { min-width:0; }.product-row image { flex:none; }.product-row > view { min-width:0; }textarea { box-sizing:border-box; font-size:15px; }.waiting-note { display:block; padding-top:12px; color:$color-text-secondary; font-size:15px; line-height:24px; }.operation-error { color:$color-error; font-size:15px; line-height:24px; }
</style>
<style scoped lang="scss">.after-sale-record { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding-top:12px; font-size:14px; line-height:22px; overflow-wrap:anywhere; }</style>