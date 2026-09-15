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
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
import { residentTabItems } from '@/config/navigation'

const keyword = ref('')
const projectStore = useProjectStore()
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMallHome)
const projectName = computed(() => projectStore.currentProject.value?.name || '请选择社区')
const products = computed(() => (data.value?.products || []).filter((item) => `${item.name}${item.merchantName}`.includes(keyword.value.trim())))
const categoryIcons: Record<string, string> = { 生鲜果蔬: 'leaf', 米面粮油: 'grain', 生活日用: 'household', 熟食餐饮: 'food', 社区精选: 'verified' }
const showUnavailable = ref(false)

onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="社区商城" show-brand brand-icon="store" /></template>
    <view class="stack mall-stack">
      <view class="mall-project-row">
        <view class="mall-project" hover-class="mall-project--pressed" @click="showUnavailable = true"><AppIcon name="location" :size="20" /><text>{{ projectName }}</text><AppIcon name="chevron-right" :size="15" /></view>
        <view class="mall-project__cart" hover-class="mall-project__cart--pressed" @click="showUnavailable = true"><AppIcon name="cart" :size="22" /><text class="mall-project__badge">2</text></view>
      </view>
      <SearchBar v-model="keyword" placeholder="搜索社区商品、周边生鲜或日用品…" />
      <view class="category-panel"><scroll-view class="category-scroll" scroll-x :show-scrollbar="false"><view class="category-list"><view v-for="category in data!.categories" :key="category" class="category" hover-class="mall-project--pressed" @click="showUnavailable = true"><IconContainer :icon="categoryIcons[category] || 'store'" size="md" /><text>{{ category }}</text></view></view></scroll-view></view>
      <view class="supply-tip"><view class="supply-tip__bar" /><AppIcon name="store" :size="18" /><text>社区周边商户直供 · 新鲜便捷</text></view>
      <view class="mall-products"><SectionHeader title="社区精选" subtitle="周边直供 · 邻里好物" /><view v-if="products.length" class="two-column-grid"><ProductCard v-for="product in products" :key="product.id" :product="product" /></view><view v-else class="mall-empty">暂无匹配商品</view></view>
      <view class="mall-footer"><view class="mall-footer__brand"><AppIcon name="verified" :size="16" /><text>大光路智慧社区便民服务</text></view><text>社区商户联盟联合保供 · 守护烟火邻里</text></view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/mall/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.mall-stack { gap: $space-3; }
.mall-project-row { display: flex; align-items: center; justify-content: space-between; }
.mall-project { display: flex; min-height: $touch-target-min; align-items: center; gap: $space-2; padding: 0 $space-3; border-radius: 999px; background: $color-group-bg; color: $color-text-primary; font-size: 18px; font-weight: 600; }
.mall-project--pressed { opacity: 0.76; }
.mall-project__cart { position: relative; display: flex; width: $touch-target-min; height: $touch-target-min; align-items: center; justify-content: center; border-radius: 50%; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.06); color: $color-primary; }
.mall-project__cart--pressed { background: $color-group-bg; }
.mall-project__badge { position: absolute; top: -2px; right: -2px; display: flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0 4px; border-radius: 999px; background: $color-primary; color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; }
.category-panel { padding: $space-2; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.03); }
.category-scroll { width: 100%; white-space: nowrap; }
.category-list { display: flex; gap: $space-3; justify-content: space-between; }
.category { display: inline-flex; width: 62px; align-items: center; flex-direction: column; gap: $space-1; color: $color-text-primary; font-size: 13px; font-weight: 500; }
.supply-tip { display: flex; align-items: center; gap: $space-2; padding: $space-3; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-md; background: $color-group-bg; color: $color-text-secondary; font-size: 14px; }
.supply-tip__bar { width: 4px; height: 18px; border-radius: 999px; background: $color-primary; }
.mall-products { margin-top: $space-1; }
.mall-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
.mall-footer { display: flex; align-items: center; flex-direction: column; gap: $space-1; padding: $space-8 0 $space-3; color: $color-text-disabled; font-size: 12px; text-align: center; }
.mall-footer__brand { display: flex; align-items: center; gap: 4px; color: $color-primary; font-size: 14px; font-weight: 600; }
</style>
