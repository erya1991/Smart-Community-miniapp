<script setup lang="ts">
import { computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import ResultState from '@/components/ResultState.vue'
import StatusTag from '@/components/StatusTag.vue'
import SupplyDemoPanel from '@/features/supply/SupplyDemoPanel.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantSupplyService } from '@/services/supply'
import { openSubPage } from '@/utils/navigation'

const { status, data, errorMessage, load, refresh } = usePageResource(merchantSupplyService.getApplication)
const result = computed(() => {
  const state = data.value?.application.storeStatus
  if (state === 'OPEN') return { tone:'success' as const, title:'商户审核已通过', description:'还需完成合作及正式交易条件后方可开展正式交易。', label:'查看经营资格', path:'/pages/qualification/status/index' }
  if (state === 'REFUSED') return { tone:'error' as const, title:'入驻申请已驳回', description:data.value?.application.rejectionReason || '请根据审核意见修改并重新提交。', label:'修改并重新提交', path:'/pages/onboarding/application/index' }
  if (state === 'APPLYING') return { tone:'pending' as const, title:'平台审核中', description:'申请资料已锁定，请留意审核结果通知。', label:'查看申请资料', path:'/pages/onboarding/application/index' }
  return { tone:'pending' as const, title:state === 'CLOSED' ? '店铺已停用' : '申请尚未提交', description:state === 'CLOSED' ? '请查看经营资格原因并联系平台。' : '完成入驻资料后提交平台审核。', label:state === 'CLOSED' ? '查看经营资格' : '继续填写申请', path:state === 'CLOSED' ? '/pages/qualification/status/index' : '/pages/onboarding/application/index' }
})
onLoad(load)
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="入驻审核结果" centered show-back /></template>
    <view v-if="data" class="stack result-page">
      <ResultState :tone="result.tone" :title="result.title" :description="result.description"><view class="result-actions"><AppButton @click="openSubPage(result.path)">{{ result.label }}</AppButton><AppButton v-if="data.application.storeStatus !== 'OPEN'" variant="quiet" @click="openSubPage('/pages/qualification/status/index')">查看经营资格</AppButton></view></ResultState>
      <BaseCard><view class="result-detail"><view><text>当前店铺</text><text>{{ data.application.storeName }}</text></view><view><text>审核状态</text><StatusTag :tone="result.tone">{{ { APPLY:'草稿', APPLYING:'审核中', REFUSED:'已驳回', OPEN:'已通过', CLOSED:'已停用' }[data.application.storeStatus] }}</StatusTag></view><view v-if="data.application.submittedAt"><text>最近提交</text><text>{{ data.application.submittedAt }}</text></view><view v-if="data.application.reviewedAt"><text>审核时间</text><text>{{ data.application.reviewedAt }}</text></view></view></BaseCard>
      <BaseCard><text class="history-title">提交与审核记录</text><view class="history"><view v-for="item in data.history" :key="item.id" class="history__item"><view class="history__dot" :class="'history__dot--' + item.tone" /><view><view class="history__heading"><text>{{ item.title }}</text><text>{{ item.occurredAt }}</text></view><text class="history__description">{{ item.description }}</text></view></view></view></BaseCard>
      <SupplyDemoPanel mode="application" :application-status="data.application.storeStatus" @changed="refresh" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.result-page { gap: $space-3; }
.result-actions { display: flex; flex-direction: column; gap: $space-2; width: 100%; margin-top: $space-4; }
.result-detail > view { display: flex; min-height: 48px; align-items: flex-start; justify-content: space-between; gap: $space-3; padding: $space-2 0; border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.result-detail > view:last-child { border-bottom: 0; }
.result-detail > view > text:first-child { flex: none; color: $color-text-secondary; }
.result-detail > view > text:last-child { text-align: right; }
.history-title { display: block; font-size: 17px; font-weight: 700; }
.history { margin-top: $space-3; }
.history__item { position: relative; display: grid; grid-template-columns: 16px 1fr; gap: $space-2; padding-bottom: $space-4; }
.history__item:not(:last-child)::after { position: absolute; top: 14px; bottom: 0; left: 5px; width: 2px; background: $color-border; content: ''; }
.history__dot { z-index: 1; width: 12px; height: 12px; margin-top: 6px; border-radius: 50%; background: $color-text-disabled; }
.history__dot--success { background: $color-success; }.history__dot--pending { background: $color-warning; }.history__dot--error { background: $color-error; }
.history__heading { display: flex; justify-content: space-between; gap: $space-2; font-weight: 600; }.history__heading text:last-child { color: $color-text-secondary; font-size: 12px; font-weight: 400; }
.history__description { display: block; margin-top: 2px; color: $color-text-secondary; font-size: 13px; }
</style>
