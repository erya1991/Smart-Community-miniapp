<script setup lang="ts">
import { computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import ProductCard from '@/components/ProductCard.vue'
import QuickEntryGrid from '@/components/QuickEntryGrid.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { useProjectStore } from '@/stores/project'
import { openPage } from '@/utils/navigation'
import AppIcon from '@/components/AppIcon.vue'
import { residentTabItems } from '@/config/navigation'

const projectStore = useProjectStore()
const { status, data, errorMessage, load } = usePageResource(appAdapter.getResidentHome)
const projectName = computed(() => projectStore.currentProject.value?.name || '请选择社区')

onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="智慧社区平台" show-brand /></template>
    <view class="stack">
      <view class="project-row"><AppIcon name="location" :size="19" /><text class="project-row__name">{{ projectName }}</text><text class="project-row__chevron">⌄</text><view class="project-row__notice"><AppIcon name="bell" :size="20" /></view></view>
      <view class="hero"><image class="hero__image" src="/static/images/home/hero-community-life.png" mode="aspectFill" /><view class="hero__shade" /><view class="hero__copy"><text class="hero__title">家门口的社区生活服务</text><text class="hero__subtitle">购物与便民入口，一站找到</text></view></view>
      <BaseCard class="home-entry-card"><QuickEntryGrid class="home-entry-grid" :items="data!.entries" /></BaseCard>
      <view><SectionHeader title="便民服务" action-text="更多" @action="openPage('/pages/service/index')" /><view class="stack"><ServiceCard v-for="service in data!.services" :key="service.id" :service="service" /></view></view>
      <view><SectionHeader title="社区好物" action-text="进入商城" @action="openPage('/pages/mall/index')" /><view class="two-column-grid"><ProductCard v-for="product in data!.products" :key="product.id" variant="home" :product="product" /></view></view>
      <text class="page-footer">大光路智慧社区便民服务</text>
    </view>
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/home/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.project-row { display: flex; min-height: 48px; align-items: center; gap: $space-2; }
.project-row__name { flex: 1; color: $color-text-primary; font-size: 16px; font-weight: 600; line-height: 22px; }
.project-row__chevron { color: $color-text-secondary; }
.project-row__notice { display: flex; min-width: $touch-target-min; min-height: $touch-target-min; align-items: center; justify-content: center; border-radius: 50%; background: rgba(242, 244, 246, 0.76); color: $color-text-secondary; font-size: 12px; opacity: 0.9; }
.hero { position: relative; display: flex; height: 146px; justify-content: flex-end; flex-direction: column; overflow: hidden; border-radius: $radius-lg; color: #fff; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04); }
.hero__image, .hero__shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero__image { object-position: center 55%; }
.hero__shade { background: linear-gradient(180deg, rgba(12, 42, 45, 0.08) 0%, rgba(12, 42, 45, 0.78) 100%); }
.hero__copy { position: relative; padding: $space-4; }
.hero__title, .hero__subtitle { display: block; }
.hero__title { font-size: 17px; font-weight: 600; line-height: 24px; }
.hero__subtitle { margin-top: $space-1; color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 400; line-height: 20px; }
.home-entry-card { border-color: rgba(225, 228, 230, 0.64); border-radius: 14px; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04); }
:deep(.home-entry-grid .entry) { min-height: 72px; }
:deep(.home-entry-grid .entry__label) { overflow: hidden; max-width: 100%; margin-top: 8px; font-size: 14px; font-weight: 400; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
:deep(.home-entry-grid .icon-container) { width: 48px; height: 48px; }
:deep(.section-header__title) { font-size: 19px; font-weight: 600; }
:deep(.section-header__action) { font-weight: 400; }
.page-footer { padding: $space-5 0; color: $color-text-disabled; font-size: 13px; text-align: center; }
</style>
