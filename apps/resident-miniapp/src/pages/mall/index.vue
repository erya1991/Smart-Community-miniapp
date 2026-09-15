<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import ProductCard from '@/components/ProductCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { useProjectStore } from '@/stores/project'
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
import { residentTabItems } from '@/config/navigation'

const keyword = ref('')
const projectStore = useProjectStore()
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMallHome)
const projectName = computed(() => projectStore.currentProject.value?.name || '请选择社区')
const products = computed(() => (data.value?.products || []).filter((item) => `${item.name}${item.merchantName}`.includes(keyword.value.trim())))
const categoryIcons: Record<string, string> = { 生鲜果蔬: 'leaf', 米面粮油: 'grain', 生活日用: 'household', 熟食餐饮: 'food', 社区精选: 'verified' }

onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="智慧社区平台" show-brand /></template>
    <view class="stack">
      <view class="mall-project"><view class="mall-project__name"><AppIcon name="location" :size="20" /><text>{{ projectName }}</text></view><view class="mall-project__cart"><AppIcon name="cart" :size="22" /></view></view>
      <SearchBar v-model="keyword" placeholder="搜索社区商品或商户" />
      <scroll-view class="category-scroll" scroll-x :show-scrollbar="false"><view class="category-list"><view v-for="category in data!.categories" :key="category" class="category"><IconContainer :icon="categoryIcons[category] || 'store'" size="md" /><text>{{ category }}</text></view></view></scroll-view>
      <view class="supply-tip"><AppIcon name="verified" :size="18" /><text>当前项目可售商品 · Mock 展示</text></view>
      <view><SectionHeader title="社区精选" /><view v-if="products.length" class="two-column-grid"><ProductCard v-for="product in products" :key="product.id" :product="product" /></view><view v-else class="mall-empty">暂无匹配商品</view></view>
    </view>
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/mall/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.mall-project { display: flex; min-height: $touch-target-min; align-items: center; justify-content: space-between; color: $color-primary; font-weight: 600; }
.mall-project__name { display: flex; align-items: center; gap: $space-2; }
.mall-project__cart { display: flex; width: $touch-target-min; height: $touch-target-min; align-items: center; justify-content: center; border-radius: 50%; background: $color-group-bg; }
.category-scroll { width: 100%; white-space: nowrap; }
.category-list { display: flex; gap: $space-3; }
.category { display: inline-flex; width: 64px; align-items: center; flex-direction: column; gap: $space-1; font-size: 13px; }
.supply-tip { display: flex; align-items: center; gap: $space-2; padding: $space-3; border-radius: $radius-md; background: $color-warm-bg; color: $color-text-secondary; font-size: 13px; }
.mall-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
</style>
