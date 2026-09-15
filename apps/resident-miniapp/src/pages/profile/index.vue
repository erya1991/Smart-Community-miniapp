<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { openPage } from '@/utils/navigation'
import { residentTabItems } from '@/config/navigation'
import type { ProfileItemSummary } from '@/types/app'

type ProfileItem = ProfileItemSummary

const { status, data, errorMessage, load } = usePageResource(appAdapter.getResidentProfile)
const showUnavailable = ref(false)
const handleEntry = (item: ProfileItem) => {
  if (item.available && item.path) {
    openPage(item.path)
    return
  }
  showUnavailable.value = true
}

onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="个人中心" centered show-back /></template>
    <view class="stack profile-stack">
      <BaseCard class="profile-identity" @click="showUnavailable = true">
        <view class="profile-identity__decor" />
        <view class="profile-identity__main">
          <view class="profile-summary__avatar"><AppIcon name="user" :size="34" /></view>
          <view class="profile-summary__copy">
            <view class="profile-summary__title"><text class="profile-summary__name">{{ data!.member.name }}</text><text class="profile-summary__role">{{ data!.member.role }}</text></view>
            <view class="profile-summary__mobile"><AppIcon name="message" :size="14" /><text>{{ data!.member.mobile }}</text></view>
            <view class="profile-summary__location"><AppIcon name="location" :size="13" /><text>{{ data!.member.projectName }}</text></view>
          </view>
          <view class="profile-identity__arrow"><AppIcon name="chevron-right" :size="17" /></view>
        </view>
      </BaseCard>

      <template v-for="group in data!.groups" :key="group.title">
        <BaseCard v-if="group.type === 'orders'" class="profile-orders">
          <SectionHeader title="我的订单" action-text="全部订单" @action="showUnavailable = true" />
          <view class="profile-order-grid">
            <view v-for="item in group.items" :key="item.label" class="profile-order-entry" hover-class="profile-entry--pressed" @click="handleEntry(item)">
              <view class="profile-order-icon-wrap"><IconContainer :icon="item.icon" size="sm" /><text v-if="item.badge" class="profile-order-badge">{{ item.badge }}</text></view>
              <text>{{ item.label }}</text>
            </view>
          </view>
        </BaseCard>

        <BaseCard v-else-if="group.type === 'service'" class="profile-service" hover-class="profile-card--pressed" @click="handleEntry(group.items[0])">
          <view class="profile-service__icon"><IconContainer :icon="group.items[0].icon" size="sm" /></view>
          <view class="profile-service__copy"><text class="profile-service__title">我的服务</text><text class="profile-service__description">{{ group.items[0].description }}</text></view>
          <view class="profile-service__action">{{ group.items[0].actionText }} <AppIcon name="chevron-right" :size="13" /></view>
        </BaseCard>

        <BaseCard v-else-if="group.type === 'tiles'" class="profile-tiles">
          <SectionHeader :title="group.title" />
          <view class="profile-tile-grid">
            <view v-for="item in group.items" :key="item.label" class="profile-tile" hover-class="profile-entry--pressed" @click="handleEntry(item)">
              <IconContainer :icon="item.icon" :tone="item.tone || 'teal'" size="sm" />
              <view class="profile-tile__copy"><text class="profile-tile__label">{{ item.label }}</text><text class="profile-tile__description">{{ item.description }}</text></view>
            </view>
          </view>
        </BaseCard>

        <BaseCard v-else-if="group.type === 'list'" class="profile-list" :padded="false">
          <view v-for="item in group.items" :key="item.label" class="profile-list__row" hover-class="profile-list__row--pressed" @click="handleEntry(item)">
            <IconContainer :icon="item.icon" :tone="item.tone || 'teal'" size="sm" />
            <text class="profile-list__label">{{ item.label }}</text>
            <text v-if="item.value" class="profile-list__value">{{ item.value }}</text>
            <view v-if="item.badge === 'dot'" class="profile-list__dot" />
            <AppIcon name="chevron-right" :size="15" />
          </view>
        </BaseCard>
      </template>

      <view class="profile-footer">大光路智慧社区便民服务</view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/profile/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.profile-stack { gap: $space-3; }
.profile-identity { position: relative; overflow: hidden; }
.profile-identity__decor { position: absolute; top: -32px; right: -30px; width: 112px; height: 112px; border-radius: 50%; background: rgba(27, 77, 83, 0.05); }
.profile-identity__main { position: relative; display: flex; min-height: 104px; align-items: center; gap: $space-3; }
.profile-summary__avatar { display: flex; width: 64px; height: 64px; flex: none; align-items: center; justify-content: center; border: 2px solid #c8d7d9; border-radius: 50%; background: $color-primary-light; color: $color-primary; }
.profile-summary__copy { flex: 1; min-width: 0; }
.profile-summary__title { display: flex; align-items: center; gap: $space-2; }
.profile-summary__name { font-size: 19px; font-weight: 700; }
.profile-summary__role { padding: 2px $space-2; border-radius: 999px; background: $color-primary-light; color: $color-primary; font-size: 12px; }
.profile-summary__mobile, .profile-summary__location { display: flex; align-items: center; gap: 4px; margin-top: $space-1; color: $color-text-secondary; font-size: 14px; }
.profile-summary__mobile image { opacity: 0.76; }
.profile-summary__location { width: fit-content; padding: 2px $space-2; border-radius: $radius-sm; background: $color-primary-light; color: $color-primary; font-size: 13px; }
.profile-identity__arrow { display: flex; width: 36px; height: 36px; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: $color-group-bg; }
.profile-orders :deep(.section-header), .profile-tiles :deep(.section-header) { min-height: 40px; border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.profile-orders :deep(.section-header__title), .profile-tiles :deep(.section-header__title) { font-size: 17px; font-weight: 600; }
.profile-order-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: $space-1; padding-top: $space-3; }
.profile-order-entry { position: relative; display: flex; min-width: 0; min-height: 82px; align-items: center; flex-direction: column; gap: $space-1; padding: $space-1 0; color: $color-text-primary; font-size: 12px; text-align: center; }
.profile-order-icon-wrap { position: relative; }
.profile-order-badge { position: absolute; top: -5px; right: -6px; display: flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0 4px; border-radius: 999px; background: $color-accent; color: #fff; font-size: 10px; font-weight: 700; }
.profile-service { display: flex; min-height: 96px; align-items: center; gap: $space-3; }
.profile-service__copy { flex: 1; min-width: 0; }
.profile-service__title, .profile-service__description { display: block; }
.profile-service__title { font-size: 17px; font-weight: 600; }
.profile-service__description { margin-top: 2px; color: $color-text-secondary; font-size: 13px; }
.profile-service__action { display: flex; min-height: 36px; align-items: center; gap: 2px; padding: 0 $space-2; border-radius: $radius-md; background: rgba(234, 242, 243, 0.72); color: $color-primary; font-size: 13px; font-weight: 500; }
.profile-tile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-2; padding-top: $space-3; }
.profile-tile { display: flex; min-width: 0; align-items: center; gap: $space-2; padding: $space-3; border-radius: $radius-md; background: $color-group-bg; }
.profile-tile__copy { min-width: 0; }
.profile-tile__label, .profile-tile__description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-tile__label { font-size: 14px; font-weight: 600; }
.profile-tile__description { margin-top: 2px; color: $color-text-secondary; font-size: 12px; }
.profile-list__row { display: flex; min-height: 60px; align-items: center; gap: $space-3; padding: $space-2 $space-4; border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.profile-list__row:last-child { border-bottom: 0; }
.profile-list__row--pressed, .profile-entry--pressed, .profile-card--pressed { opacity: 0.72; }
.profile-list__label { flex: 1; min-width: 0; font-size: 15px; }
.profile-list__value { max-width: 150px; overflow: hidden; color: $color-text-secondary; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.profile-list__dot { width: 8px; height: 8px; border-radius: 50%; background: $color-accent; }
.profile-footer { padding: $space-2 0 $space-3; color: $color-text-disabled; font-size: 12px; text-align: center; }
</style>
