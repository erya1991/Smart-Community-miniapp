<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import IconContainer from '@/components/IconContainer.vue'
import ProductCard from '@/components/ProductCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentTabItems } from '@/config/navigation'
import { residentMallService } from '@/services/mall'
import { useCatalogCart } from '@/features/mall/useCatalogCart'
import CatalogActionFeedback from '@/features/mall/CatalogActionFeedback.vue'
import { openSubPage } from '@/utils/navigation'
import type { ProductSummary } from '../../../../../packages/common/types/app'
import type { ResidentMallProductSummary } from '../../../../../packages/common/types/mall'

const keyword = ref('')
const { status, data, errorMessage, load, refresh } = usePageResource(residentMallService.getHome)
const { actionMessage, addCart } = useCatalogCart(async () => {
  if (data.value) data.value = { ...data.value, cartCount: await residentMallService.getCartCount() }
})

const openProduct = (product: ProductSummary | ResidentMallProductSummary) => openSubPage(`/pages/mall/detail/index?id=${encodeURIComponent(product.id)}`)
const openCategory = (categoryId: string) => openSubPage(`/pages/mall/list/index?categoryId=${encodeURIComponent(categoryId)}`)
const openSearch = () => openSubPage(`/pages/mall/list/index?keyword=${encodeURIComponent(keyword.value.trim())}`)

onLoad(load)
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="社区商城" show-brand brand-icon="store" /></template>
    <view class="stack mall-stack">
      <view class="mall-community-row">
        <view class="mall-community"><AppIcon name="location" :size="20" /><text>{{ data!.communityName }}</text></view>
        <view class="mall-cart" aria-label="购物车" hover-class="mall-cart--pressed" @click="openSubPage('/pages/mall/cart/index')"><AppIcon name="cart" :size="22" /><text v-if="data!.cartCount" class="mall-cart__badge">{{ data!.cartCount > 99 ? '99+' : data!.cartCount }}</text></view>
      </view>
      <view class="mall-search"><SearchBar v-model="keyword" clearable placeholder="搜索商品或商户" @confirm="openSearch" /><button class="mall-search__submit" hover-class="mall-search__submit--pressed" @click="openSearch">搜索</button></view>
      <view class="category-panel"><scroll-view class="category-scroll" scroll-x :show-scrollbar="false"><view class="category-list"><view v-for="category in data!.categories" :key="category.id" class="category" hover-class="category--pressed" @click="openCategory(category.id)"><IconContainer :icon="category.icon" size="md" /><text>{{ category.name }}</text></view></view></scroll-view></view>
      <view class="supply-tip"><view class="supply-tip__bar" /><AppIcon name="store" :size="18" /><text>社区周边商户直供 · 新鲜便捷</text></view>
      <view class="mall-products"><SectionHeader title="社区精选" subtitle="周边直供 · 邻里好物" action-text="全部商品" @action="openSubPage('/pages/mall/list/index')" /><CatalogActionFeedback :message="actionMessage" @retry="actionMessage = ''; load()" /><view v-if="data!.products.length" class="two-column-grid"><ProductCard v-for="product in data!.products" :key="product.id" :product="product" @open="openProduct" @add="addCart" /></view><view v-else class="mall-empty">暂无在售商品，请稍后再来看看。</view></view>
      <view class="mall-footer"><view class="mall-footer__brand"><AppIcon name="verified" :size="16" /><text>大光路智慧社区便民服务</text></view><text>社区好物 · 方便日常生活</text></view>
    </view>
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/mall/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.mall-stack { gap: $space-3; }
.mall-community-row { display: flex; align-items: center; justify-content: space-between; gap: $space-2; }
.mall-community { display: flex; min-width: 0; min-height: $touch-target-min; align-items: center; gap: $space-2; padding: 0 $space-3; border-radius: 999px; background: $color-group-bg; color: $color-text-primary; font-size: 18px; font-weight: 600; }
.mall-cart { position: relative; display: flex; width: $touch-target-min; height: $touch-target-min; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.06); color: $color-primary; }
.mall-cart--pressed, .category--pressed, .mall-search__submit--pressed { opacity: 0.72; }
.mall-cart__badge { position: absolute; top: -2px; right: -2px; display: flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0 4px; border-radius: 999px; background: $color-accent; color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; }
.mall-search { display: flex; align-items: center; gap: $space-2; }.mall-search :deep(.search-bar) { min-width: 0; flex: 1; }
.mall-search__submit { display: flex; min-width: 56px; height: 48px; align-items: center; justify-content: center; margin: 0; padding: 0 $space-2; border-radius: $radius-md; background: $color-primary; color: #fff; font-size: 15px; font-weight: 500; }.mall-search__submit::after { border: 0; }
.category-panel { padding: $space-2; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-card; background: $color-card-bg; box-shadow: 0 2px 8px rgba(27, 77, 83, 0.03); }
.category-scroll { width: 100%; white-space: nowrap; }.category-list { display: flex; gap: $space-3; justify-content: space-between; }.category { display: inline-flex; width: 62px; min-height: 76px; align-items: center; flex-direction: column; justify-content: center; gap: $space-1; color: $color-text-primary; font-size: 13px; font-weight: 500; }
.supply-tip { display: flex; align-items: center; gap: $space-2; padding: $space-3; border: 1px solid rgba(225, 228, 230, 0.72); border-radius: $radius-md; background: $color-group-bg; color: $color-text-secondary; font-size: 14px; }.supply-tip__bar { width: 4px; height: 18px; border-radius: 999px; background: $color-primary; }
.mall-products { margin-top: $space-1; }.mall-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
.mall-footer { display: flex; align-items: center; flex-direction: column; gap: $space-1; padding: $space-8 0 $space-3; color: $color-text-disabled; font-size: 12px; text-align: center; }.mall-footer__brand { display: flex; align-items: center; gap: 4px; color: $color-primary; font-size: 14px; font-weight: 600; }
</style>
