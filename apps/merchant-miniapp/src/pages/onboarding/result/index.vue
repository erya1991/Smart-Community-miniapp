<script setup lang="ts">
import { computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import ResultState from '@/components/ResultState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { openSubPage } from '@/utils/navigation'

const { status, data, errorMessage, load } = usePageResource(merchantCooperationService.getApplication)
const result = computed(() => {
  const value = data.value?.application.status
  if (value === 'approved') return { tone: 'success' as const, title: '入驻审核已通过', description: '已形成正式经营主体，可继续查看和维护商户资料。' }
  if (value === 'rejected') return { tone: 'error' as const, title: '申请需要修改', description: data.value?.application.rejectionReason || '请根据审核意见修改资料后重新提交。' }
  if (value === 'pending') return { tone: 'pending' as const, title: '平台审核中', description: '申请资料已锁定，请留意审核结果通知。' }
  return { tone: 'pending' as const, title: '申请尚未提交', description: '请完成入驻资料后提交平台审核。' }
})
const primaryAction = () => {
  if (data.value?.application.status === 'approved') openSubPage('/pages/profile/basic/index')
  else openSubPage('/pages/onboarding/application/index')
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="审核结果" centered show-back /></template>
    <view v-if="data" class="stack result-page">
      <ResultState :tone="result.tone" :title="result.title" :description="result.description"><view class="result-actions"><AppButton @click="primaryAction">{{ data.application.status === 'approved' ? '进入商户资料' : data.application.status === 'rejected' ? '修改资料' : '查看申请资料' }}</AppButton></view></ResultState>
      <BaseCard><view class="result-detail"><view><text>当前状态</text><StatusTag :tone="result.tone === 'success' ? 'success' : result.tone === 'error' ? 'error' : 'pending'">{{ { draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已驳回' }[data.application.status] }}</StatusTag></view><view v-if="data.application.submittedAt"><text>最近提交</text><text>{{ data.application.submittedAt }}</text></view><view v-if="data.application.reviewedAt"><text>审核时间</text><text>{{ data.application.reviewedAt }}</text></view><view v-if="data.application.reviewOpinion"><text>审核意见</text><text>{{ data.application.reviewOpinion }}</text></view></view></BaseCard>
      <BaseCard><text class="history-title">提交与审核记录</text><view class="history"><view v-for="item in data.history" :key="item.id" class="history__item"><view class="history__dot" :class="`history__dot--${item.tone}`" /><view><view class="history__heading"><text>{{ item.title }}</text><text>{{ item.occurredAt }}</text></view><text class="history__description">{{ item.description }}</text></view></view></view></BaseCard>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.result-page { gap: $space-3; }
.result-actions { width: 100%; margin-top: $space-4; }
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
