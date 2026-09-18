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
const { status, data, errorMessage, load } = usePageResource(merchantCooperationService.listStaff)
const roleLabel = { owner: '负责人', worker: '工作人员', service: '服务人员' }
const changeStatus = async (id: string, next: EntityStatus) => {
  const { confirm } = await uni.showModal({ title: next === 'disabled' ? '停用人员？' : '恢复人员？', content: next === 'disabled' ? '停用后该人员立即失去商户端权限。' : '恢复后按当前角色和门店范围重新获得权限。' })
  if (!confirm) return
  try { await merchantCooperationService.setStaffStatus(id, next); await load(); uni.showToast({ title: next === 'disabled' ? '已停用' : '已恢复', icon: 'success' }) }
  catch (error) { uni.showModal({ title: '无法完成操作', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
}
const transferOwner = async (id: string, name: string) => {
  const { confirm } = await uni.showModal({ title: '转交负责人？', content: `确认将负责人转交给${name}？转交后你的角色将调整为工作人员。` })
  if (!confirm) return
  try { await merchantCooperationService.transferOwner(id); await load(); uni.showToast({ title: '已完成转交', icon: 'success' }) }
  catch (error) { uni.showModal({ title: '转交失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="商户人员" centered show-back /></template>
    <view class="operational-head"><view><text class="operational-head__title">人员与权限范围</text><text class="operational-head__note">普通工作人员仅能查看本人身份与门店范围</text></view><view v-if="permissions.canCreate" class="head-action"><AppButton size="compact" @click="openSubPage('/pages/staff/editor/index')">邀请人员</AppButton></view></view>
    <view v-if="data" class="operational-list">
      <BaseCard v-for="person in data" :key="person.id" class="object-card"><view class="object-card__heading"><view><view class="object-card__title-row"><text class="object-card__title">{{ person.memberName }}</text><text class="role-label">{{ roleLabel[person.role] }}</text></view><text class="object-card__subtitle">{{ person.mobileMasked }} · {{ person.joinedAt }} 加入</text></view><StatusTag :tone="person.status === 'active' ? 'success' : 'disabled'">{{ person.status === 'active' ? '在职' : '停用' }}</StatusTag></view><view class="scope-row"><text>门店范围</text><text>{{ person.storeScopeLabel }}</text></view><view v-if="permissions.canEdit" class="object-card__actions"><view class="compact-action" hover-class="compact-action--pressed" @click="openSubPage(`/pages/staff/editor/index?id=${person.id}`)">编辑</view><view v-if="permissions.canTransferOwner && person.role !== 'owner' && person.status === 'active'" class="compact-action" hover-class="compact-action--pressed" @click="transferOwner(person.id, person.memberName)">转交负责人</view><view v-if="permissions.canDisable" class="compact-action" :class="{ 'compact-action--danger': person.status === 'active' }" hover-class="compact-action--pressed" @click="changeStatus(person.id, person.status === 'active' ? 'disabled' : 'active')">{{ person.status === 'active' ? '停用' : '恢复' }}</view></view></BaseCard>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.operational-head{display:flex;align-items:center;justify-content:space-between;gap:$space-3}.operational-head__title,.operational-head__note{display:block}.operational-head__title{font-size:18px;font-weight:700}.operational-head__note{margin-top:2px;color:$color-text-secondary;font-size:12px}.head-action{display:flex;min-width:96px;min-height:44px;align-items:center;justify-content:flex-end;flex:none}.operational-list{display:flex;flex-direction:column;gap:$space-3;margin-top:$space-3}.object-card__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:$space-3}.object-card__title-row{display:flex;align-items:center;gap:$space-2}.object-card__title{font-size:16px;font-weight:700}.role-label{padding:1px 6px;border-radius:$radius-sm;background:$color-primary-light;color:$color-primary;font-size:11px}.object-card__subtitle{display:block;margin-top:2px;color:$color-text-secondary;font-size:13px}.scope-row{display:flex;align-items:flex-start;justify-content:space-between;gap:$space-3;margin-top:$space-3;padding:$space-2 $space-3;border-radius:$radius-md;background:$color-group-bg;font-size:13px}.scope-row text:first-child{color:$color-text-secondary}.scope-row text:last-child{text-align:right}.object-card__actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:$space-1;margin-top:$space-2}.compact-action{display:flex;min-width:64px;min-height:44px;align-items:center;justify-content:center;padding:0 $space-2;color:$color-primary;font-size:13px;font-weight:600}.compact-action--pressed{opacity:.64}.compact-action--danger{color:$color-error}
</style>
