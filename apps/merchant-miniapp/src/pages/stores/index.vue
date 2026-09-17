<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { useMerchantContext } from '@/stores/merchant-context'
import { openSubPage } from '@/utils/navigation'
import type { EntityStatus } from '@/types/merchant-cooperation'

const { permissions } = useMerchantContext()
const { status, data, errorMessage, load } = usePageResource(merchantCooperationService.listStores)
const changeStatus = async (id: string, next: EntityStatus) => {
  if (!permissions.value.canDisable) return
  const { confirm } = await uni.showModal({ title: next === 'disabled' ? '停用门店？' : '恢复门店？', content: next === 'disabled' ? '停用后不再用于新经营或履约，历史业务不受影响。' : '恢复后可重新参与后续经营与履约选择。' })
  if (!confirm) return
  try { await merchantCooperationService.setStoreStatus(id, next); await load(); uni.showToast({ title: next === 'disabled' ? '已停用' : '已恢复', icon: 'success' }) }
  catch (error) { uni.showModal({ title: '操作失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="门店列表" centered show-back /></template>
    <view class="operational-head"><view><text class="operational-head__title">所属主体门店</text><text class="operational-head__note">门店是经营和履约场所，不独立取得主体资格</text></view><view v-if="permissions.canCreate" class="head-action"><AppButton @click="openSubPage('/pages/stores/editor/index')">新增门店</AppButton></view></view>
    <view v-if="data" class="operational-list">
      <BaseCard v-for="store in data" :key="store.id" class="object-card">
        <view class="object-card__heading"><view><view class="object-card__title-row"><text class="object-card__title">{{ store.name }}</text><text v-if="store.isPrimary" class="primary-label">首店</text></view><text class="object-card__subtitle">{{ store.address }}</text></view><StatusTag :tone="store.status === 'active' ? 'success' : 'disabled'">{{ store.status === 'active' ? '正常' : '停用' }}</StatusTag></view>
        <view class="object-card__facts"><text>{{ store.contactName }} · {{ store.contactMobileMasked }}</text><text>营业时间 {{ store.businessHours || '未设置' }}</text></view>
        <view class="object-card__actions"><view v-if="permissions.canEdit" class="compact-action" @click="openSubPage(`/pages/stores/editor/index?id=${store.id}`)">编辑</view><view v-if="permissions.canDisable" class="compact-action" :class="{ 'compact-action--danger': store.status === 'active' }" @click="changeStatus(store.id, store.status === 'active' ? 'disabled' : 'active')">{{ store.status === 'active' ? '停用' : '恢复' }}</view></view>
      </BaseCard>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.operational-head { display: flex; align-items: center; justify-content: space-between; gap: $space-3; }.operational-head__title,.operational-head__note { display:block; }.operational-head__title { font-size:18px;font-weight:700; }.operational-head__note{margin-top:2px;color:$color-text-secondary;font-size:12px}.head-action{width:112px;flex:none}.head-action :deep(.app-button){height:40px;font-size:14px}.operational-list{display:flex;flex-direction:column;gap:$space-3;margin-top:$space-3}.object-card__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:$space-3}.object-card__title-row{display:flex;align-items:center;flex-wrap:wrap;gap:$space-2}.object-card__title{font-size:16px;font-weight:700}.primary-label{padding:1px 6px;border-radius:$radius-sm;background:$color-primary-light;color:$color-primary;font-size:11px}.object-card__subtitle{display:block;margin-top:2px;color:$color-text-secondary;font-size:13px}.object-card__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:$space-2;margin-top:$space-3;padding:$space-2 $space-3;border-radius:$radius-md;background:$color-group-bg;color:$color-text-secondary;font-size:13px}.object-card__actions{display:flex;justify-content:flex-end;gap:$space-2;margin-top:$space-2}.compact-action{display:flex;min-width:72px;min-height:44px;align-items:center;justify-content:center;color:$color-primary;font-size:14px;font-weight:600}.compact-action--danger{color:$color-error}
</style>
