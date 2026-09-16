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
import AppIcon from '@/components/AppIcon.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { useProjectStore } from '@/stores/project'
import { formatMoneyFromFen } from '@/utils/navigation'
import { merchantTabItems } from '@/config/navigation'

const projectStore = useProjectStore()
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantWorkbench)
const projectName = computed(() => projectStore.currentProject.value?.name || '请选择项目')
const showUnavailable = ref(false)
const quickActions = [
  { label: '发布商品', icon: 'plus' },
  { label: '扫码核销', icon: 'qr', active: true },
  { label: '查看订单', icon: 'order' },
]
const unavailable = () => { showUnavailable.value = true }
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="工作台" compact show-user /></template>
    <view class="stack workbench-stack">
      <MerchantInfoCard compact :name="data!.merchant.name" :store-name="data!.merchant.storeName" :project-name="projectName" :status="data!.merchant.operationStatus" :business-hours="data!.merchant.businessHours" @click="unavailable" />

      <BaseCard class="todo-section" :padded="false">
        <view class="section-row"><SectionHeader title="待办事项" /><view class="todo-heading"><text>{{ data!.todoTotal }}件待处理</text><view class="section-action" @click="unavailable">全部待办 ›</view></view></view>
        <view class="todo-grid">
          <view v-for="todo in data!.todos" :key="todo.label" class="todo-card" :class="{ 'todo-card--urgent': todo.label === '待备货' }" hover-class="todo-card--pressed" @click="unavailable">
            <view class="todo-card__top"><text class="todo-card__label">{{ todo.label }}</text><text v-if="todo.label === '待备货'" class="todo-card__urgent">加急</text><view v-else class="todo-card__dot" /></view>
            <view class="todo-card__bottom"><text class="todo-card__value">{{ todo.value }}</text><text class="todo-card__description">{{ todo.description }}</text></view>
          </view>
          <view class="todo-card todo-card--after-sales" hover-class="todo-card--pressed" @click="unavailable">
            <view class="todo-card__after-icon"><AppIcon name="recycle" :size="22" /></view>
            <view class="todo-card__after-copy"><text class="todo-card__label">售后待处理</text><text class="todo-card__description">{{ data!.afterSales.description }}</text></view>
            <view class="todo-card__after-count"><text>{{ data!.afterSales.value }}</text><text>单</text></view>
          </view>
        </view>
      </BaseCard>

      <view class="workbench-actions">
        <view class="section-row section-row--plain"><SectionHeader title="快捷操作" /><text class="section-note">常用高频</text></view>
        <view class="action-grid"><view v-for="action in quickActions" :key="action.label" class="action-card" :class="{ 'action-card--active': action.active }" hover-class="action-card--pressed" @click="unavailable"><view class="action-card__icon"><AppIcon :name="action.icon" :size="28" /></view><text class="action-card__label">{{ action.label }}</text></view></view>
      </view>

      <BaseCard class="overview-section" :padded="false">
        <view class="section-row"><SectionHeader title="经营概览" /><view class="overview-tools"><text class="section-note">截至 17:30</text><view class="section-action" @click="unavailable">资金明细 ›</view></view></view>
        <view class="overview-grid">
          <view class="overview-item"><text class="overview-label">今日订单</text><text class="overview-value">{{ data!.today.orderCount }}<text class="overview-unit"> 单</text></text></view>
          <view class="overview-item"><text class="overview-label">今日成交</text><text class="overview-value overview-value--primary">¥{{ formatMoneyFromFen(data!.today.amount) }}</text></view>
          <view class="overview-item"><text class="overview-label">待分账</text><text class="overview-value">¥{{ formatMoneyFromFen(data!.funds.pending) }}</text></view>
          <view class="overview-item"><text class="overview-label">已分账</text><text class="overview-value overview-value--primary">¥{{ formatMoneyFromFen(data!.funds.completed) }}</text></view>
        </view>
      </BaseCard>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/workbench/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.workbench-stack { gap: $space-3; }
.section-row { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: $space-2; }
.section-row :deep(.section-header) { min-height: 36px; }
.section-row :deep(.section-header__title) { font-size: 17px; line-height: 24px; }
.section-row :deep(.section-header__accent) { width: 3px; height: 16px; }
.section-row--plain { min-height: 36px; }
.section-note { flex: none; color: $color-text-secondary; font-size: 12px; font-weight: 500; }
.section-action { display: flex; min-height: $touch-target-min; align-items: center; color: $color-primary; font-size: 13px; font-weight: 600; white-space: nowrap; }
.todo-section, .overview-section { padding: $space-3; }
.todo-heading, .overview-tools { display: flex; align-items: center; gap: $space-2; }
.todo-heading > text { padding: 2px $space-2; border-radius: 999px; background: $color-accent; color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; }
.todo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-2; }
.todo-card { display: flex; min-height: 76px; justify-content: space-between; flex-direction: column; padding: $space-3; border-radius: $radius-md; background: $color-group-bg; }
.todo-card--urgent { background: rgba(250, 238, 233, 0.72); }
.todo-card--pressed, .action-card--pressed { opacity: 0.72; }
.todo-card__top, .todo-card__bottom { display: flex; align-items: center; justify-content: space-between; gap: $space-2; }
.todo-card__label { font-size: 15px; font-weight: 600; }
.todo-card__value { font-size: 28px; font-weight: 700; line-height: 30px; }
.todo-card--urgent .todo-card__value { color: $color-accent; }
.todo-card__description { overflow: hidden; color: $color-text-secondary; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.todo-card__urgent { padding: 2px 6px; border-radius: $radius-sm; background: $color-accent; color: #fff; font-size: 11px; font-weight: 700; }
.todo-card__dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: $color-primary; }
.todo-card--after-sales { grid-column: 1 / -1; min-height: 52px; align-items: center; flex-direction: row; gap: $space-2; }
.todo-card__after-icon { display: flex; width: 32px; height: 32px; flex: none; align-items: center; justify-content: center; border-radius: 10px; background: $color-accent-light; }
.todo-card__after-copy { flex: 1; min-width: 0; }
.todo-card__after-copy .todo-card__label, .todo-card__after-copy .todo-card__description { display: block; }
.todo-card__after-count { display: flex; align-items: baseline; gap: 2px; color: $color-error; }
.todo-card__after-count text:first-child { font-size: 28px; font-weight: 700; }
.todo-card__after-count text:last-child { color: $color-text-primary; font-size: 12px; font-weight: 600; }
.action-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: $space-2; }
.action-card { display: flex; min-height: 76px; align-items: center; justify-content: center; flex-direction: column; gap: $space-1; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04); color: $color-text-primary; }
.action-card--active { border-color: $color-primary; background: $color-primary; color: #fff; box-shadow: 0 3px 8px rgba(27, 77, 83, 0.14); }
.action-card__icon { display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 10px; background: $color-primary-light; }
.action-card--active .action-card__icon { background: rgba(255, 255, 255, 0.14); }
.action-card--active :deep(.app-icon) { filter: brightness(0) invert(1); }
.action-card__label { font-size: 14px; font-weight: 600; }
.overview-section { padding-bottom: $space-2; }
.overview-tools { min-width: 0; margin-left: auto; }
.overview-tools .section-action { min-height: 36px; }
.overview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: $space-1; border-top: 1px solid rgba(225, 228, 230, 0.72); }
.overview-item { min-width: 0; padding: $space-2 $space-3 $space-3; }
.overview-item:nth-child(odd) { border-right: 1px solid rgba(225, 228, 230, 0.72); }
.overview-item:nth-child(-n + 2) { border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.overview-label, .overview-value { display: block; }
.overview-label { color: $color-text-secondary; font-size: 13px; }
.overview-value { overflow: hidden; margin-top: 2px; font-size: 22px; font-weight: 700; line-height: 30px; text-overflow: ellipsis; white-space: nowrap; }
.overview-value--primary { color: $color-primary; }
.overview-unit { font-size: 12px; }
</style>
