<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
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
const showUnavailable = ref(false)
const quickActions = [
  { label: '发布商品', description: '极速上架', icon: 'plus', tone: 'teal' as const },
  { label: '扫码核销', description: '到店自提', icon: 'qr', tone: 'teal' as const, active: true },
  { label: '查看订单', description: '流水查询', icon: 'order', tone: 'blue' as const },
]
const unavailable = () => { showUnavailable.value = true }
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="工作台" large show-user /></template>
    <view class="stack workbench-stack">
      <MerchantInfoCard :name="data!.merchant.name" :store-name="data!.merchant.storeName" :project-name="projectName" :status="data!.merchant.operationStatus" :business-hours="data!.merchant.businessHours" @click="unavailable" />

      <BaseCard class="todo-section">
        <view class="section-row"><SectionHeader title="待办事项" /><view class="todo-heading"><text>{{ data!.todoTotal }}件待处理</text><view class="section-action" @click="unavailable">全部待办 <text>›</text></view></view></view>
        <view class="todo-grid">
          <view v-for="todo in data!.todos" :key="todo.label" class="todo-card" :class="{ 'todo-card--urgent': todo.label === '待备货' }" hover-class="todo-card--pressed" @click="unavailable">
            <view class="todo-card__top"><text class="todo-card__label">{{ todo.label }}</text><text v-if="todo.label === '待备货'" class="todo-card__urgent">加急</text><view v-else-if="todo.label === '待审核商品'" class="todo-card__symbol">✓</view><view v-else class="todo-card__dot" /></view>
            <view class="todo-card__bottom"><text class="todo-card__value">{{ todo.value }}</text><text class="todo-card__description">{{ todo.description }}</text></view>
          </view>
          <view class="todo-card todo-card--after-sales" hover-class="todo-card--pressed" @click="unavailable">
            <view class="todo-card__after-icon"><IconContainer icon="recycle" tone="orange" size="sm" /></view>
            <view class="todo-card__after-copy"><text class="todo-card__label">售后待处理</text><text class="todo-card__description">{{ data!.afterSales.description }}</text></view>
            <view class="todo-card__after-count"><text>{{ data!.afterSales.value }}</text><text>单</text></view>
          </view>
        </view>
      </BaseCard>

      <view class="workbench-actions"><view class="section-row section-row--plain"><SectionHeader title="快捷操作" /><text class="section-note">常用高频</text></view><view class="action-grid"><view v-for="action in quickActions" :key="action.label" class="action-card" :class="{ 'action-card--active': action.active }" hover-class="action-card--pressed" @click="unavailable"><IconContainer :icon="action.icon" :tone="action.tone" /><text class="action-card__label">{{ action.label }}</text><text class="action-card__description">{{ action.description }}</text></view></view></view>

      <BaseCard>
        <view class="section-row"><SectionHeader title="今日经营" /><text class="section-note">截至 17:30</text></view>
        <view class="summary-grid"><view><text class="summary-label">今日订单</text><text class="summary-number">{{ data!.today.orderCount }}<text class="summary-unit"> 单</text></text></view><view><text class="summary-label">今日成交</text><text class="summary-number summary-number--primary">¥{{ formatMoneyFromFen(data!.today.amount) }}</text></view></view>
      </BaseCard>

      <BaseCard>
        <view class="section-row"><SectionHeader title="资金摘要" /><view class="section-action" @click="unavailable">查看资金明细 <text>›</text></view></view>
        <view class="fund-grid"><view><text class="summary-label">待分账</text><text class="fund-number">¥{{ formatMoneyFromFen(data!.funds.pending) }}</text></view><view><text class="summary-label">已分账</text><text class="fund-number fund-number--primary">¥{{ formatMoneyFromFen(data!.funds.completed) }}</text></view></view>
      </BaseCard>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/workbench/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.workbench-stack { gap: $space-4; }
.section-row { display: flex; align-items: center; justify-content: space-between; }
.section-row--plain :deep(.section-header) { min-height: 40px; }
.section-note { color: $color-text-secondary; font-size: 13px; font-weight: 600; }
.section-action { display: flex; min-height: $touch-target-min; align-items: center; color: $color-primary; font-size: 14px; font-weight: 600; }
.section-action text { margin-left: 3px; font-size: 20px; line-height: 1; }
.todo-heading { display: flex; align-items: center; gap: $space-2; }
.todo-heading > text { padding: 2px $space-2; border-radius: 999px; background: $color-accent; color: #fff; font-size: 13px; font-weight: 700; }
.todo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-3; }
.todo-card { display: flex; min-height: 118px; justify-content: space-between; flex-direction: column; padding: $space-3; border-radius: $radius-card; background: $color-group-bg; }
.todo-card--urgent { background: rgba(250, 238, 233, 0.72); }
.todo-card--pressed, .action-card--pressed { opacity: 0.72; }
.todo-card__top, .todo-card__bottom { display: flex; align-items: center; justify-content: space-between; gap: $space-2; }
.todo-card__label { font-size: 16px; font-weight: 600; }
.todo-card__value { font-size: 34px; font-weight: 700; line-height: 38px; }
.todo-card--urgent .todo-card__value { color: $color-accent; }
.todo-card__description { overflow: hidden; color: $color-text-secondary; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.todo-card__urgent { padding: 3px $space-2; border-radius: $radius-sm; background: $color-accent; color: #fff; font-size: 13px; font-weight: 700; }
.todo-card__symbol, .todo-card__dot { flex: none; color: $color-text-secondary; font-weight: 700; }
.todo-card__symbol { display: flex; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid $color-text-secondary; border-radius: 50%; font-size: 14px; }
.todo-card__dot { width: 10px; height: 10px; border-radius: 50%; background: $color-primary; }
.todo-card--after-sales { grid-column: 1 / -1; min-height: 80px; align-items: center; flex-direction: row; gap: $space-3; }
.todo-card__after-copy { flex: 1; min-width: 0; }
.todo-card__after-copy .todo-card__label, .todo-card__after-copy .todo-card__description { display: block; }
.todo-card__after-count { display: flex; align-items: baseline; gap: 3px; color: #b42420; }
.todo-card__after-count text:first-child { font-size: 38px; font-weight: 700; }
.todo-card__after-count text:last-child { color: $color-text-primary; font-size: 13px; font-weight: 600; }
.action-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: $space-3; }
.action-card { display: flex; min-height: 118px; align-items: center; justify-content: center; flex-direction: column; gap: 3px; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04); color: $color-text-primary; }
.action-card--active { border-color: $color-primary; background: $color-primary; color: #fff; box-shadow: 0 4px 12px rgba(27, 77, 83, 0.18); }
.action-card--active :deep(.icon-container) { background: rgba(255, 255, 255, 0.12); }
.action-card--active :deep(.app-icon) { filter: brightness(0) invert(1); }
.action-card__label { margin-top: $space-1; font-size: 16px; font-weight: 700; }
.action-card__description { color: $color-text-secondary; font-size: 12px; font-weight: 600; }
.action-card--active .action-card__description { color: #b6d9dc; }
.summary-grid, .fund-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-3; }
.summary-grid > view, .fund-grid { padding: $space-3; border-radius: $radius-card; background: $color-group-bg; text-align: center; }
.summary-label, .summary-number, .fund-number { display: block; }
.summary-label { color: $color-text-secondary; font-size: 13px; }
.summary-number { margin-top: $space-2; font-size: 32px; font-weight: 700; }
.summary-number--primary, .fund-number--primary { color: $color-primary; }
.summary-unit { font-size: 13px; }
.fund-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); text-align: left; }
.fund-number { margin-top: $space-2; font-size: 24px; font-weight: 700; }
</style>
