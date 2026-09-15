<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
import { merchantTabItems } from '@/config/navigation'

const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantProfile)
const showUnavailable = ref(false)
const unavailable = () => { showUnavailable.value = true }
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="我的" centered show-back /></template>
    <view class="stack merchant-profile-stack">
      <BaseCard class="merchant-identity" hover-class="merchant-card--pressed" @click="unavailable">
        <view class="merchant-identity__main"><IconContainer icon="shop" size="lg" /><view class="merchant-identity__copy"><view class="merchant-identity__title"><text class="merchant-identity__name">{{ data!.merchant.name }}</text><StatusTag tone="success">经营正常</StatusTag></view><text class="merchant-identity__store">{{ data!.merchant.storeName }} · {{ data!.merchant.role }}</text><view class="merchant-identity__project"><AppIcon name="location" :size="13" />{{ data!.merchant.projectName }}</view></view><view class="merchant-identity__arrow"><AppIcon name="chevron-right" :size="16" /></view></view>
      </BaseCard>

      <BaseCard class="qualification-card" hover-class="merchant-card--pressed" @click="unavailable">
        <SectionHeader title="经营资格" action-text="查看详情" @action="unavailable" />
        <view class="qualification-summary"><text>业务经营资格</text><StatusTag tone="success">{{ data!.qualification.businessStatus }}</StatusTag></view>
        <view class="qualification-summary"><text>正式交易资格</text><StatusTag tone="pending">{{ data!.qualification.transactionStatus }}</StatusTag></view>
      </BaseCard>

      <BaseCard v-for="group in data!.groups" :key="group.title" class="merchant-group">
        <SectionHeader :title="group.title" />
        <view v-for="item in group.items" :key="item.label" class="merchant-entry" hover-class="merchant-entry--pressed" @click="unavailable"><IconContainer :icon="item.icon" :tone="item.tone || 'teal'" size="sm" /><view class="merchant-entry__copy"><text class="merchant-entry__label">{{ item.label }}</text><text class="merchant-entry__description">{{ item.description }}</text></view><AppIcon name="chevron-right" :size="16" /></view>
      </BaseCard>

      <view class="merchant-profile-footer">大光路智慧社区商户服务</view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/profile/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.merchant-profile-stack { gap: $space-3; }
.merchant-identity { position: relative; }
.merchant-card--pressed, .merchant-entry--pressed { opacity: 0.72; }
.merchant-identity__main { display: flex; min-height: 104px; align-items: center; gap: $space-3; }
.merchant-identity__copy { flex: 1; min-width: 0; }
.merchant-identity__title { display: flex; align-items: center; gap: $space-2; }
.merchant-identity__name { font-size: 19px; font-weight: 700; }
.merchant-identity__store { display: block; margin-top: $space-1; color: $color-text-secondary; font-size: 14px; }
.merchant-identity__project { display: flex; align-items: center; gap: 4px; width: fit-content; margin-top: $space-1; padding: 2px $space-2; border-radius: $radius-sm; background: $color-primary-light; color: $color-primary; font-size: 12px; }
.merchant-identity__arrow { display: flex; width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: 50%; background: $color-group-bg; }
.qualification-card :deep(.section-header), .merchant-group :deep(.section-header) { min-height: 40px; }
.qualification-card :deep(.section-header__title), .merchant-group :deep(.section-header__title) { font-size: 17px; font-weight: 600; }
.qualification-summary { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: $space-2; min-height: 44px; color: $color-text-secondary; font-size: 14px; }
.merchant-entry { display: flex; min-height: 60px; align-items: center; gap: $space-3; border-top: 1px solid rgba(225, 228, 230, 0.72); color: $color-text-primary; }
.merchant-entry__copy { flex: 1; min-width: 0; }
.merchant-entry__label, .merchant-entry__description { display: block; }
.merchant-entry__label { font-size: 15px; font-weight: 600; }
.merchant-entry__description { margin-top: 2px; color: $color-text-secondary; font-size: 12px; }
.merchant-profile-footer { padding: $space-2 0 $space-3; color: $color-text-disabled; font-size: 12px; text-align: center; }
</style>
