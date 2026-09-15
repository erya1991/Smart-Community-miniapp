<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import QuickEntryGrid from '@/components/QuickEntryGrid.vue'
import SearchBar from '@/components/SearchBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { residentTabItems } from '@/config/navigation'

const keyword = ref('')
const { status, data, errorMessage, load } = usePageResource(appAdapter.getResidentEntries)
const groupDefinitions = [
  { title: '生活缴费', ids: ['property', 'parking'] },
  { title: '我的社区', ids: ['my-house', 'house', 'my-car'] },
  { title: '社区服务', ids: ['cleaning', 'repair', 'elderly', 'more-service'] },
  { title: '邻里生活', ids: ['idle', 'help'] },
  { title: '购物消费', ids: ['mall'] },
]
const groups = computed(() => groupDefinitions.map((group) => ({ ...group, items: (data.value || []).filter((item) => group.ids.includes(item.id) && item.label.includes(keyword.value.trim())) })))

onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="智慧社区平台" show-brand /></template>
    <view class="service-page stack">
      <view class="service-heading">
        <text class="service-heading__title">服务</text>
        <text class="service-heading__subtitle">社区生活服务，一站找到</text>
      </view>
      <SearchBar v-model="keyword" placeholder="搜索服务或功能" />
      <BaseCard v-for="group in groups" :key="group.title" class="service-group">
        <SectionHeader :title="group.title" />
        <QuickEntryGrid v-if="group.items.length" :items="group.items" :columns="4" compact />
        <text v-else class="group-empty">没有匹配的入口</text>
      </BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/service/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.service-page { gap: $space-3; }
.service-heading { padding: $space-1 2px $space-2; }
.service-heading__title { display: block; font-size: 24px; line-height: 34px; font-weight: 800; letter-spacing: -0.5px; }
.service-heading__subtitle { display: block; margin-top: 2px; color: $color-text-secondary; font-size: 14px; }
.service-group { margin-top: $space-1; }
.group-empty { display: block; padding: $space-4 0; color: $color-text-secondary; font-size: 14px; text-align: center; }
</style>
