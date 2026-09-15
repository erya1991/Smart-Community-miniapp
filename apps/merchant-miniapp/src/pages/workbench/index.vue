<script setup lang="ts">
import { computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import MerchantInfoCard from '@/components/MerchantInfoCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { useProjectStore } from '@/stores/project'
import { formatMoneyFromFen } from '@/utils/navigation'
import IconContainer from '@/components/IconContainer.vue'
import { merchantTabItems } from '@/config/navigation'

const projectStore = useProjectStore()
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantWorkbench)
const projectName = computed(() => projectStore.currentProject.value?.name || '请选择项目')
const unavailable = () => uni.showToast({ title: '阶段 02 开放', icon: 'none' })
const quickActions = [
  { label: '发布商品', icon: 'plus', tone: 'teal' as const },
  { label: '扫码核销', icon: 'qr', tone: 'orange' as const },
  { label: '查看订单', icon: 'order', tone: 'blue' as const },
]
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="商户工作台" show-brand /></template>
    <view class="stack">
      <MerchantInfoCard :name="data!.merchant.name" :store-name="data!.merchant.storeName" :project-name="projectName" :status="data!.merchant.operationStatus" />
      <BaseCard><SectionHeader title="待办事项" action-text="全部待办" @action="unavailable" /><view class="todo-grid"><view v-for="todo in data!.todos" :key="todo.label" class="todo-card"><text class="todo-card__label">{{ todo.label }}</text><text class="todo-card__value">{{ todo.value }}</text><text class="todo-card__description">{{ todo.description }}</text></view></view></BaseCard>
      <view><SectionHeader title="快捷操作" /><view class="action-grid"><view v-for="action in quickActions" :key="action.label" class="action-card" hover-class="action-card--pressed" @click="unavailable"><IconContainer :icon="action.icon" :tone="action.tone" /><text>{{ action.label }}</text></view></view></view>
      <BaseCard><SectionHeader title="今日经营" /><view class="summary-grid"><view><text class="summary-label">今日订单</text><text class="summary-number">{{ data!.today.orderCount }}<text class="summary-unit"> 单</text></text></view><view><text class="summary-label">今日成交</text><text class="summary-number summary-number--primary">¥{{ formatMoneyFromFen(data!.today.amount) }}</text></view></view></BaseCard>
      <BaseCard><SectionHeader title="资金摘要" /><view class="summary-grid"><view><text class="summary-label">待分账</text><text class="fund-number">¥{{ formatMoneyFromFen(data!.funds.pending) }}</text></view><view><text class="summary-label">已分账</text><text class="fund-number fund-number--primary">¥{{ formatMoneyFromFen(data!.funds.completed) }}</text></view></view><text class="mock-note">仅为统一业务状态 Mock，不作为财务结算凭证</text></BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/workbench/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.todo-grid, .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-3; }
.todo-card { display: flex; min-height: 118px; justify-content: space-between; flex-direction: column; padding: $space-3; border-radius: $radius-md; background: $color-group-bg; }
.todo-card__label { font-size: 16px; font-weight: 600; }
.todo-card__value { font-size: 30px; font-weight: 700; line-height: 36px; }
.todo-card__description, .summary-label, .mock-note { color: $color-text-secondary; font-size: 13px; }
.action-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: $space-3; }
.action-card { display: flex; min-height: 108px; align-items: center; justify-content: center; flex-direction: column; gap: $space-2; border: 1px solid $color-border; border-radius: $radius-card; background: #fff; color: $color-text-primary; font-size: 15px; font-weight: 600; }
.action-card--pressed { opacity: 0.72; }
.summary-grid > view { padding: $space-3; border-radius: $radius-md; background: $color-group-bg; text-align: center; }
.summary-label, .summary-number, .fund-number { display: block; }
.summary-number { margin-top: $space-2; font-size: 28px; font-weight: 700; }
.summary-number--primary, .fund-number--primary { color: $color-primary; }
.summary-unit { font-size: 13px; }
.fund-number { margin-top: $space-2; font-size: 20px; font-weight: 700; }
.mock-note { display: block; margin-top: $space-3; text-align: center; }
</style>
