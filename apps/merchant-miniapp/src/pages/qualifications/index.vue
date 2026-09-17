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

const { permissions } = useMerchantContext()
const { status, data, errorMessage, load } = usePageResource(merchantCooperationService.listQualifications)
const label = { pending: '待确认', valid: '有效', expiring: '即将到期', expired: '已过期', invalid: '无效' }
const tone = (value: string) => value === 'valid' ? 'success' : ['expired', 'invalid'].includes(value) ? 'error' : 'pending'
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="资质列表" centered show-back /></template>
    <view class="operational-head"><view><text class="operational-head__title">资质证照</text><text class="operational-head__note">未经平台确认的资料不计入有效经营资格</text></view><view v-if="permissions.canCreate" class="head-action"><AppButton @click="openSubPage('/pages/qualifications/editor/index')">新增资质</AppButton></view></view>
    <view v-if="data" class="qualification-list"><BaseCard v-for="item in data" :key="item.id" class="qualification-item"><view class="qualification-item__heading"><view><text class="qualification-item__title">{{ item.type }}</text><text class="qualification-item__holder">{{ item.holderName }} · {{ item.certificateNoMasked }}</text></view><StatusTag :tone="tone(item.status)">{{ label[item.status] }}</StatusTag></view><view class="qualification-item__facts"><view><text>有效期</text><text>{{ item.effectiveDate }} 至 {{ item.expiryDate }}</text></view><view><text>适用业务</text><text>{{ item.businessTypes.join('、') }}</text></view><view><text>适用类目</text><text>{{ item.categories.length ? item.categories.join('、') : '全部授权类目' }}</text></view></view><view v-if="item.reason" class="qualification-reason" :class="{ 'qualification-reason--error': ['expired', 'invalid'].includes(item.status) }">{{ item.reason }}</view><view class="qualification-item__footer"><text>最近更新 {{ item.updatedAt }}</text><view v-if="permissions.canEdit" class="update-action" @click="openSubPage(`/pages/qualifications/editor/index?id=${item.id}`)">{{ ['expired', 'invalid'].includes(item.status) ? '更新并重提' : '查看 / 更新' }}</view></view></BaseCard></view>
  </AppPage>
</template>

<style scoped lang="scss">
.operational-head{display:flex;align-items:center;justify-content:space-between;gap:$space-3}.operational-head__title,.operational-head__note{display:block}.operational-head__title{font-size:18px;font-weight:700}.operational-head__note{margin-top:2px;color:$color-text-secondary;font-size:12px}.head-action{width:112px;flex:none}.head-action :deep(.app-button){height:40px;font-size:14px}.qualification-list{display:flex;flex-direction:column;gap:$space-3;margin-top:$space-3}.qualification-item__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:$space-3}.qualification-item__title,.qualification-item__holder{display:block}.qualification-item__title{font-size:16px;font-weight:700}.qualification-item__holder{margin-top:2px;color:$color-text-secondary;font-size:12px}.qualification-item__facts{margin-top:$space-3;padding:$space-2 $space-3;border-radius:$radius-md;background:$color-group-bg}.qualification-item__facts>view{display:flex;min-height:36px;align-items:center;justify-content:space-between;gap:$space-3;font-size:13px}.qualification-item__facts text:first-child{flex:none;color:$color-text-secondary}.qualification-item__facts text:last-child{text-align:right}.qualification-reason{margin-top:$space-2;padding:$space-2 $space-3;border-radius:$radius-md;background:$color-warning-light;color:$color-warning;font-size:13px}.qualification-reason--error{background:$color-error-light;color:$color-error}.qualification-item__footer{display:flex;min-height:44px;align-items:center;justify-content:space-between;gap:$space-3;margin-top:$space-1;color:$color-text-secondary;font-size:12px}.update-action{display:flex;min-height:44px;align-items:center;color:$color-primary;font-size:14px;font-weight:600}
</style>
