<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
import { residentTabItems } from '@/config/navigation'

const { status, data, errorMessage, load } = usePageResource(appAdapter.getResidentProfile)
const showUnavailable = () => uni.showToast({ title: '该功能建设中', icon: 'none' })
const itemIcons: Record<string, string> = {
  待支付: 'bill',
  待履约: 'car',
  待自提: 'bag',
  待评价: 'message',
  售后: 'repair',
  预约与服务进度: 'services',
  我的房屋: 'house',
  物业缴费: 'bill',
  我的车辆: 'car',
  停车缴费: 'parking',
  我的闲置: 'recycle',
  我的互助: 'neighbor',
  我的积分: 'points',
  收货地址: 'location',
  消息中心: 'bell',
  意见反馈: 'message',
  设置: 'settings',
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="个人中心" centered /></template>
    <view class="stack">
      <BaseCard><view class="profile-summary"><view class="profile-summary__avatar"><AppIcon name="user" :size="34" /></view><view><text class="profile-summary__name">{{ data!.member.name }} <text class="profile-summary__role">{{ data!.member.role }}</text></text><text class="profile-summary__mobile">{{ data!.member.mobile }}</text></view></view></BaseCard>
      <BaseCard v-for="group in data!.groups" :key="group.title">
        <SectionHeader :title="group.title" />
        <view class="profile-grid" :class="{ 'profile-grid--orders': group.title === '我的订单' }"><view v-for="item in group.items" :key="item" class="profile-entry" hover-class="profile-entry--pressed" @click="showUnavailable"><IconContainer :icon="itemIcons[item] || 'more'" size="sm" /><text>{{ item }}</text></view></view>
      </BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/profile/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.profile-summary { display: flex; align-items: center; gap: $space-4; }
.profile-summary__avatar { display: flex; width: 64px; height: 64px; align-items: center; justify-content: center; border: 2px solid #c8d7d9; border-radius: 50%; background: $color-primary-light; color: $color-primary; font-size: 20px; font-weight: 700; }
.profile-summary__name, .profile-summary__mobile { display: block; }
.profile-summary__name { font-size: 19px; font-weight: 700; }
.profile-summary__role { margin-left: $space-1; color: $color-text-secondary; font-size: 13px; font-weight: 400; }
.profile-summary__mobile { margin-top: $space-1; color: $color-text-secondary; font-size: 14px; }
.profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-2; }
.profile-entry { display: flex; min-height: 64px; align-items: center; gap: $space-2; padding: $space-2; border-radius: $radius-md; background: $color-group-bg; color: $color-text-primary; font-size: 14px; text-align: left; }
.profile-entry--pressed { opacity: 0.72; }
.profile-grid--orders { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: $space-1; }
.profile-grid--orders .profile-entry { min-width: 0; min-height: 82px; flex-direction: column; gap: $space-1; padding: $space-2 0; font-size: 12px; text-align: center; }
</style>
