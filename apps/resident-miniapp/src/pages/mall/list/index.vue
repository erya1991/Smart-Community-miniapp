<script setup lang="ts">
import {accessRequired} from '../../../../../../packages/common/utils/commercePresentation'
import S2CategorySelector from '@/features/mall/S2CategorySelector.vue'
import Stage2Notice from '@/features/mall/Stage2Notice.vue'
import { stage2Mall } from '@/services/stage2-mall'
import { stage2Owner } from '@/adapters/stage2-http'
import { stage2Enabled } from '@/adapters/stage2-http'
import { computed, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import ProductCard from '@/features/mall/ResidentProductCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import { usePageResource } from '@/composables/usePageResource'
import { useCatalogCart } from '@/features/mall/useCatalogCart'
import CatalogActionFeedback from '@/features/mall/CatalogActionFeedback.vue'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'
import { isMallProductSort } from '../../../../../../packages/common/utils/mallCatalog'
import type { MallProductSort, ResidentMallProductSummary } from '../../../../../../packages/common/types/mall'

const keyword = ref('')
const categoryId = ref('')
const legacyCategory = ref('')
const sort = ref<MallProductSort>('default')
const products = ref<ResidentMallProductSummary[]>([])
const page = ref(1), total = ref(0)
const querying = ref(false)
const readComplete = ref(true)
const queryError = ref('')
let queryVersion = 0
const queryProducts = async (more = false) => {
  if (!more) page.value = 1
  const owner = stage2Owner(), targetPage = more ? page.value + 1 : 1
  const version = ++queryVersion
  querying.value = true
  queryError.value = ''
  try {
    const query = { keyword: keyword.value, categoryId: categoryId.value, sort: sort.value }
    const result = stage2Enabled ? await stage2Mall.products(query, targetPage) : { records: await residentMallService.getProducts(query), total: 0, readComplete: true }
    if (version === queryVersion && owner === stage2Owner()) {
      const combined = more ? [...products.value, ...result.records] : result.records
      products.value = [...new Map(combined.map(product => [product.id, product])).values()]
      total.value = stage2Enabled ? result.total : result.records.length
      readComplete.value = (!more || readComplete.value) && result.readComplete !== false
      page.value = targetPage
    }
  } catch (error) {
    if (version === queryVersion && owner === stage2Owner()) { products.value = []; readComplete.value = true; queryError.value = error instanceof Error ? error.message : '商品加载失败，请重试。' }
  } finally { if (version === queryVersion) querying.value = false }
}
const { status, data, errorMessage, load, refresh } = usePageResource(async () => {
  const catalog = await residentMallService.getHome()
  if (legacyCategory.value) { categoryId.value = catalog.categories.find((item) => item.name === legacyCategory.value)?.id || ''; legacyCategory.value = '' }
  await queryProducts()
  return catalog
})
const { actionMessage, addCart } = useCatalogCart()
const categories = computed(() => [{ id: '', name: '全部' }, ...(data.value?.categories || [])])
const priceLabel = computed(() => sort.value === 'price-asc' ? '价格 ↑' : sort.value === 'price-desc' ? '价格 ↓' : '价格')
const togglePrice = () => { sort.value = sort.value === 'price-asc' ? 'price-desc' : 'price-asc' }
const readQuery = (value: unknown) => {
  if (typeof value !== 'string') return ''
  try { return decodeURIComponent(value) } catch { return value }
}
const resetFilters = () => { keyword.value = ''; categoryId.value = ''; sort.value = 'default'; actionMessage.value = '' }
watch(stage2Owner, () => { queryVersion++; products.value = []; total.value = 0; querying.value = false; readComplete.value = true }, { flush: 'sync' })
watch([keyword, categoryId, sort], () => { if (data.value) queryProducts() })
onLoad((options) => {
  keyword.value = readQuery(options?.keyword)
  categoryId.value = readQuery(options?.categoryId)
  if (!categoryId.value) legacyCategory.value = readQuery(options?.category)
  const initialSort = readQuery(options?.sort)
  sort.value = isMallProductSort(initialSort) ? initialSort : 'default'
  load()
})
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage v-if="stage2Enabled && accessRequired(errorMessage)" status="ready"><template #navbar><AppNavbar title="商品列表" centered show-back /></template><Stage2Notice :error="errorMessage"/></AppPage><AppPage v-else :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="商品列表" centered show-back /></template>
    <view class="stack list-page"><Stage2Notice v-if="stage2Enabled" />
      <SearchBar v-model="keyword" clearable placeholder="搜索商品或店铺" @confirm="queryProducts()" />
      <S2CategorySelector v-if="stage2Enabled" :rows="data?.categories||[]" :selected="categoryId" @select="categoryId=$event"/><scroll-view v-else scroll-x :show-scrollbar="false" class="filter-scroll"><view class="filter-list"><view v-for="item in categories" :key="item.id" class="filter-hit" hover-class="filter-hit--pressed" @click="categoryId = item.id"><text class="filter-chip" :class="{ 'filter-chip--active': categoryId === item.id }">{{ item.name }}</text></view></view></scroll-view>
      <view class="sort-list"><view class="sort-hit" :class="{ 'sort-hit--active': sort === 'default' }" @click="sort = 'default'">综合</view><view v-if="!stage2Enabled" class="sort-hit" :class="{ 'sort-hit--active': sort === 'sales' }" @click="sort = 'sales'">销量</view><view class="sort-hit" :class="{ 'sort-hit--active': sort.startsWith('price-') }" @click="togglePrice">{{ priceLabel }}</view></view>
      <view class="list-summary"><text>{{ querying ? '正在查询商品…' : `${readComplete ? '共' : '已核实'} ${total} 件商品` }}</text><view class="cart-link" @click="openSubPage('/pages/mall/cart/index')"><AppIcon name="cart" :size="19" /><text>购物车</text></view></view>
      <CatalogActionFeedback v-if="!readComplete" message="部分商品信息暂未核实，已显示核实可购的商品，请稍后重试。" @retry="queryProducts()" />
      <CatalogActionFeedback :message="queryError || actionMessage" @retry="actionMessage = ''; load()" />
      <view v-if="products.length" class="two-column-grid"><ProductCard v-for="product in products" :key="product.id" :product="product" @open="openSubPage(`/pages/mall/detail/index?id=${encodeURIComponent(product.id)}`)" @add="addCart" /></view>
      <AppButton v-if="stage2Enabled && products.length && products.length < total" :disabled="querying" @click="queryProducts(true)">加载更多</AppButton>
      <view v-if="!products.length && !querying" class="empty"><AppIcon name="search" :size="32" /><text class="empty__title">{{ queryError ? '商品加载失败' : '暂无符合条件的商品' }}</text><text>{{ queryError || (data!.products.length ? '试试其他关键词，或清除分类与搜索条件。' : '当前暂无在售商品，请稍后刷新。') }}</text><AppButton class="empty__action" variant="secondary" @click="queryError || !data!.products.length ? load() : resetFilters()">{{ queryError || !data!.products.length ? '重新加载' : '查看全部商品' }}</AppButton></view>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.list-page { gap: $space-3; }
.filter-scroll { width: calc(100% + #{$page-gutter * 2}); margin-left: -$page-gutter; white-space: nowrap; }
.filter-list { display: inline-flex; gap: $space-2; padding: 0 $page-gutter; }.filter-hit { display: inline-flex; min-height: $touch-target-min; flex: none; align-items: center; }.filter-hit--pressed { opacity: .72; }
.filter-chip { display: flex; height: 34px; align-items: center; padding: 0 $space-3; border-radius: 999px; background: $color-card-bg; color: $color-text-secondary; font-size: 15px; white-space: nowrap; }.filter-chip--active { background: $color-primary; color: #fff; }
.sort-list { display: flex; padding: 0 $space-2; border-radius: $radius-md; background: $color-card-bg; }.sort-hit { display: flex; min-height: $touch-target-min; flex: 1; align-items: center; justify-content: center; color: $color-text-secondary; font-size: 15px; }.sort-hit--active { color: $color-primary; font-weight: 600; }
.list-summary { display: flex; min-height: $touch-target-min; align-items: center; justify-content: space-between; color: $color-text-secondary; font-size: 14px; }.cart-link { display: flex; min-height: $touch-target-min; align-items: center; gap: $space-1; color: $color-primary; font-size: 15px; }
.empty { display: flex; align-items: center; flex-direction: column; gap: $space-3; padding: $space-8 $space-4; color: $color-text-secondary; font-size: 15px; line-height: 24px; text-align: center; }.empty__title { color: $color-text-primary; font-size: 17px; font-weight: 600; }.empty__action { max-width: 180px; margin-top: $space-2; }
</style>
