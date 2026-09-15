<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
import { merchantTabItems } from '@/config/navigation'

const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantProfile)
const unavailable = () => uni.showToast({ title: '阶段 02 开放', icon: 'none' })
const itemIcons: Record<string, string> = {
  基本资料: 'user',
  门店: 'store',
  人员: 'neighbor',
  资质: 'verified',
  合作状态: 'services',
  经营资格: 'verified',
  消息: 'bell',
  设置: 'settings',
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="我的" /></template>
    <view class="stack">
      <BaseCard><view class="merchant-profile"><IconContainer icon="shop" size="lg" /><view class="merchant-profile__copy"><text class="merchant-profile__name">{{ data!.merchant.name }}</text><text class="merchant-profile__role">{{ data!.merchant.role }}</text></view><StatusTag tone="success">经营正常</StatusTag></view></BaseCard>
      <BaseCard v-for="group in data!.groups" :key="group.title"><SectionHeader :title="group.title" /><view v-for="item in group.items" :key="item" class="merchant-entry" hover-class="merchant-entry--pressed" @click="unavailable"><IconContainer :icon="itemIcons[item] || 'more'" size="sm" /><text class="merchant-entry__label">{{ item }}</text><AppIcon name="chevron-right" :size="18" /></view></BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/profile/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.merchant-profile { display: flex; align-items: center; gap: $space-3; }
.merchant-profile__copy { flex: 1; }
.merchant-profile__name, .merchant-profile__role { display: block; }
.merchant-profile__name { font-size: 19px; font-weight: 700; }
.merchant-profile__role { color: $color-text-secondary; font-size: 13px; }
.merchant-entry { display: flex; width: 100%; min-height: 56px; align-items: center; gap: $space-3; border-top: 1px solid $color-border; background: transparent; color: $color-text-primary; font-size: 15px; text-align: left; }
.merchant-entry__label { flex: 1; }
.merchant-entry--pressed { opacity: 0.72; }
</style>
