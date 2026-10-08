<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import QualificationStatusCard from '@/components/QualificationStatusCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import SupplyDemoPanel from '@/features/supply/SupplyDemoPanel.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantSupplyService } from '@/services/supply'
import { openSubPage } from '@/utils/navigation'

const { status, data, errorMessage, load, refresh } = usePageResource(merchantSupplyService.getQualification)
const storeAuditLabel = (state: string) => ({ APPLY:'未提交', APPLYING:'审核中', REFUSED:'已驳回', OPEN:'已通过', CLOSED:'已通过' }[state] || '待完善')
const agreementLabel = (state: string) => ({ active:'有效', missing:'未建立', expired:'已失效', terminated:'已终止' }[state] || '待完善')
onLoad(load)
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="合作与经营资格" centered show-back /></template>
    <view v-if="data" class="stack qualification-page">
      <BaseCard class="merchant-summary"><text class="merchant-summary__name">{{ data.storeName }}</text><text class="merchant-summary__subject">{{ data.subjectName }}</text><text class="merchant-summary__time">最近核对 {{ data.checkedAt }}</text></BaseCard>
      <QualificationStatusCard title="商户状态" :status="data.storeEnabled ? '店铺已启用' : '待完善'" :tone="data.storeEnabled ? 'success' : 'pending'" description="入驻审核与店铺启用分别展示">
        <view class="check-list">
          <view class="check-item"><text>商户审核</text><StatusTag :tone="['OPEN','CLOSED'].includes(data.storeStatus) ? 'success' : data.storeStatus === 'REFUSED' ? 'error' : 'pending'">{{ storeAuditLabel(data.storeStatus) }}</StatusTag></view>
          <view class="check-item"><text>店铺启用状态</text><StatusTag :tone="data.storeEnabled ? 'success' : 'error'">{{ data.storeEnabled ? '已启用' : '未启用 / 已停用' }}</StatusTag></view>
          <view class="check-item"><text>必要经营资质</text><StatusTag :tone="data.necessaryQualificationsValid ? 'success' : 'error'">{{ data.necessaryQualificationsValid ? '有效' : '已失效' }}</StatusTag></view>
        </view>
      </QualificationStatusCard>
      <QualificationStatusCard title="合作状态" :status="agreementLabel(data.agreement.status)" :tone="data.agreement.status === 'active' ? 'success' : 'pending'" description="协议由平台维护，商户查看生效结果">
        <view class="check-list"><view class="check-item"><text>合作协议</text><text>{{ data.agreement.status === 'missing' ? '待平台建立' : data.agreement.name }}</text></view><view class="check-item"><text>生效时间</text><text>{{ data.agreement.startsAt || '—' }}</text></view><view class="check-item"><text>失效时间</text><text>{{ data.agreement.endsAt || '—' }}</text></view></view>
        <AppButton variant="quiet" :disabled="!data.agreement.attachment" @click="openSubPage('/pages/cooperation/status/index')">查看协议</AppButton>
      </QualificationStatusCard>
      <QualificationStatusCard title="正式交易条件" :status="data.tradeReady ? '已满足' : '待完善'" :tone="data.tradeReady ? 'success' : 'pending'" description="支付和分账关系不影响已通过的商户审核结果">
        <view class="check-list"><view class="check-item"><text>支付接入状态</text><StatusTag :tone="data.paymentStatus === 'ready' ? 'success' : 'pending'">{{ data.paymentStatus === 'ready' ? '可用' : '待配置' }}</StatusTag></view><view class="check-item"><text>分账接入状态</text><StatusTag :tone="data.profitSharingStatus === 'ready' ? 'success' : data.profitSharingStatus === 'exception' ? 'error' : 'pending'">{{ data.profitSharingStatus === 'ready' ? '可用' : data.profitSharingStatus === 'exception' ? '异常' : '待配置' }}</StatusTag></view></view>
      </QualificationStatusCard>
      <BaseCard class="conclusion-card"><text class="conclusion-title">系统结论</text><view class="check-item"><text>经营基础资格</text><StatusTag :tone="data.baseBusinessReady ? 'success' : 'error'">{{ data.baseBusinessReady ? 'READY · 可维护商品' : '待完善' }}</StatusTag></view><view class="check-item"><text>正式交易资格</text><StatusTag :tone="data.tradeReady ? 'success' : 'pending'">{{ data.tradeReady ? 'READY · 可正式交易' : '待完善' }}</StatusTag></view>
        <view v-if="data.tradeReasons.length" class="reason-block"><text class="reason-title">未满足条件</text><text v-for="reason in data.tradeReasons" :key="reason">• {{ reason }}</text></view>
        <text class="qualification-help">{{ data.baseBusinessReady ? '可新增、编辑商品并提交审核；正式交易资格满足后才能上架。' : '请按上述原因完善条件后维护商品；历史业务资料继续保留。' }}</text>
        <AppButton v-if="data.baseBusinessReady" @click="openSubPage('/pages/operation/index')">进入商品管理</AppButton><AppButton v-else variant="quiet" @click="openSubPage('/pages/onboarding/result/index')">查看入驻审核结果</AppButton>
      </BaseCard>
      <SupplyDemoPanel mode="qualification" @changed="refresh" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.qualification-page { gap:$space-3; }
.merchant-summary { background:$color-primary-light; }
.merchant-summary__name,.merchant-summary__subject,.merchant-summary__time { display:block; }
.merchant-summary__name { font-size:19px; font-weight:700; }
.merchant-summary__subject { margin-top:$space-1; color:$color-text-secondary; font-size:14px; }
.merchant-summary__time { margin-top:$space-2; color:$color-text-secondary; font-size:12px; }
.check-list { margin-bottom:$space-2; }
.check-item { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:$space-3; padding:$space-2 0; border-bottom:1px solid $color-border; font-size:14px; }
.check-item > text:first-child { flex:none; color:$color-text-secondary; }
.check-item > text:last-child { min-width:0; text-align:right; overflow-wrap:anywhere; }
.conclusion-title { display:block; font-size:17px; font-weight:700; }
.reason-block { display:flex; flex-direction:column; gap:$space-1; margin-top:$space-3; padding:$space-3; border-radius:$radius-md; background:$color-warning-light; color:$color-warning; font-size:14px; line-height:22px; }
.reason-title { font-weight:600; }
.qualification-help { display:block; margin:$space-3 0; color:$color-text-secondary; font-size:13px; line-height:20px; }
</style>
