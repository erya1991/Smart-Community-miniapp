<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { formatMoneyFromFen } from '@/utils/navigation'
import AppIcon from '@/components/AppIcon.vue'
import { merchantTabItems } from '@/config/navigation'

const keyword = ref('')
const activeFilter = ref('全部')
const showUnavailable = ref(false)
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantProducts)
const products = computed(() => (data.value?.products || []).filter((product) => {
  const matchesKeyword = product.name.includes(keyword.value.trim())
  const matchesFilter = activeFilter.value === '全部'
    || (activeFilter.value === '销售中' && product.saleStatus === '销售中')
    || (activeFilter.value === '待审核' && product.auditStatus === '待审核')
    || (activeFilter.value === '已驳回' && product.auditStatus === '已驳回')
    || (activeFilter.value === '已下架' && product.saleStatus === '已下架')
  return matchesKeyword && matchesFilter
}))
const unavailable = () => { showUnavailable.value = true }
const auditTone = (status: string) => status === '已通过' ? 'success' : status === '已驳回' ? 'error' : 'pending'
const saleLabel = (status: string, auditStatus: string) => auditStatus === '已驳回' ? '无法销售' : status === '销售中' ? '在售中' : status === '已下架' ? '已手动下架' : status
const saleTone = (status: string) => status === '销售中' ? 'success' : 'disabled'
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="经营" large show-user /></template>
    <view class="stack operation-stack">
      <view class="operation-head"><view class="operation-tabs"><text class="operation-tab operation-tab--active">商品</text><view class="operation-tab operation-tab--muted">服务 <StatusTag tone="disabled">后续开放</StatusTag></view></view><AppButton class="operation-add" @click="unavailable"><view class="operation-add__copy"><AppIcon name="plus" :size="18" /><text>新增商品</text></view></AppButton></view>
      <SearchBar v-model="keyword" placeholder="搜索商品名称" />
      <scroll-view scroll-x :show-scrollbar="false" class="filter-scroll"><view class="filter-list"><text v-for="filter in data!.filters" :key="filter.label" class="filter-chip" :class="{ 'filter-chip--active': filter.label === activeFilter, 'filter-chip--danger': filter.label === '已驳回' }" @click="activeFilter = filter.label">{{ filter.label }} ({{ filter.count }})</text></view></scroll-view>

      <view class="product-list">
        <BaseCard v-for="product in products" :key="product.id" class="product-card">
          <view class="product-row">
            <view class="product-row__image"><image :src="product.image" mode="aspectFill" /><text class="product-row__category">{{ product.category }}</text><view v-if="product.auditStatus === '已驳回'" class="product-row__mask"><AppIcon name="verified" :size="24" /></view></view>
            <view class="product-row__main"><text class="product-row__name">{{ product.name }}</text><text class="product-row__description">{{ product.description }}</text><view class="product-row__tags"><StatusTag :tone="auditTone(product.auditStatus)">{{ product.auditStatus }}</StatusTag><StatusTag :tone="saleTone(product.saleStatus)">{{ saleLabel(product.saleStatus, product.auditStatus) }}</StatusTag></view><view class="product-row__meta"><text class="price" :class="{ 'price--muted': product.saleStatus === '已下架' || product.auditStatus === '已驳回' }">¥{{ formatMoneyFromFen(product.price) }}<text class="product-row__unit"> /{{ product.unit }}</text></text><text :class="{ 'stock--empty': product.stock === 0 }">{{ product.stock === 0 ? '库存 0 件' : `库存 ${product.stock} 件` }}</text></view></view>
          </view>

          <view v-if="product.auditStatus === '待审核'" class="product-notice"><AppIcon name="bell" :size="16" /><text>平台审核中，请留意审核结果</text><view class="product-notice__action" @click="unavailable">查看</view></view>
          <view v-else-if="product.auditStatus === '已驳回'" class="product-rejection"><AppIcon name="verified" :size="18" /><view><text class="product-rejection__title">平台审核未通过：</text><text>{{ product.rejectionReason }}</text></view></view>
          <view class="product-actions"><view class="quiet-action" hover-class="quiet-action--pressed" @click="unavailable"><AppIcon name="edit" :size="17" /><text>{{ product.auditStatus === '已驳回' ? '查看原因' : '编辑' }}</text></view><view v-if="product.auditStatus === '已驳回'" class="primary-action primary-action--accent" hover-class="primary-action--pressed" @click="unavailable"><AppIcon name="recycle" :size="17" /><text>修改后重提</text></view><view v-else-if="product.saleStatus === '销售中'" class="primary-action primary-action--danger" hover-class="primary-action--pressed" @click="unavailable"><AppIcon name="recycle" :size="17" /><text>下架</text></view><view v-else-if="product.saleStatus === '已下架'" class="primary-action" hover-class="primary-action--pressed" @click="unavailable"><AppIcon name="plus" :size="17" /><text>重新上架</text></view></view>
        </BaseCard>
      </view>
      <view v-if="!products.length" class="operation-empty">暂无匹配商品</view>
      <view class="merchant-help" hover-class="quiet-action--pressed" @click="unavailable"><AppIcon name="services" :size="32" /><text class="merchant-help__title">商户帮助</text><text>如有商品上架与审核疑问，可点击查看《平台商品管理规则》。</text></view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/operation/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.operation-stack { gap: $space-3; }
.operation-head { display: flex; min-height: 48px; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: $space-2; }
.operation-tabs { display: flex; min-height: $touch-target-min; align-items: center; gap: $space-4; }
.operation-add { width: 124px; flex: none; }
.operation-add__copy { display: flex; align-items: center; justify-content: center; gap: $space-1; }
.operation-tab { color: $color-text-secondary; font-size: 20px; }
.operation-tab--active { position: relative; padding-bottom: $space-2; color: $color-primary; font-weight: 700; }
.operation-tab--active::after { position: absolute; right: 0; bottom: 0; left: 0; width: 40px; height: 3px; margin: auto; border-radius: 999px; background: $color-primary; content: ''; }
.operation-tab--muted { display: flex; align-items: center; gap: $space-2; color: $color-text-secondary; }
.operation-tab--muted :deep(.status-tag) { font-size: 12px; }
.filter-scroll { width: calc(100% + #{$page-gutter * 2}); margin-left: -$page-gutter; white-space: nowrap; scrollbar-width: none; }
.filter-scroll::-webkit-scrollbar { display: none; }
.filter-list { display: flex; gap: $space-3; padding: $space-1 $page-gutter $space-2; }
.filter-chip { display: inline-flex; min-height: 44px; min-width: 88px; align-items: center; justify-content: center; padding: 0 $space-3; border-radius: 999px; background: $color-card-bg; color: $color-text-secondary; font-size: 14px; font-weight: 600; text-align: center; white-space: nowrap; }
.filter-chip--active { background: $color-primary; color: #fff; }
.filter-chip--danger { color: $color-accent; }
.product-list { display: flex; flex-direction: column; gap: $space-3; }
.product-card { padding: $space-3; }
.product-row { display: flex; gap: $space-3; }
.product-row__image { position: relative; display: flex; width: 96px; height: 96px; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: $radius-md; background: $color-group-bg; }
.product-row__image image { width: 100%; height: 100%; }
.product-row__category { position: absolute; bottom: 4px; left: 4px; padding: 2px 6px; border-radius: 4px; background: rgba(27, 77, 83, 0.82); color: #fff; font-size: 10px; line-height: 16px; }
.product-row__mask { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(25, 28, 30, 0.28); }
.product-row__mask :deep(.app-icon) { filter: brightness(0) invert(1); }
.product-row__main { flex: 1; min-width: 0; }
.product-row__name, .product-row__description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-row__name { font-size: 16px; font-weight: 600; }
.product-row__description { margin-top: 2px; color: $color-text-secondary; font-size: 13px; }
.product-row__tags { display: flex; flex-wrap: wrap; gap: $space-1; margin-top: $space-2; }
.product-row__tags :deep(.status-tag) { min-height: 25px; border-radius: 999px; }
.product-row__meta { display: flex; align-items: flex-end; justify-content: space-between; margin-top: $space-2; color: $color-text-secondary; font-size: 13px; }
.price { color: $color-accent; font-size: 22px; font-weight: 700; }
.price--muted { color: $color-text-secondary; }
.product-row__unit { color: $color-text-secondary; font-size: 13px; font-weight: 400; }
.stock--empty { color: #b42420; font-weight: 600; }
.product-actions { display: flex; justify-content: flex-end; gap: $space-2; margin-top: $space-3; }
.quiet-action, .primary-action { display: flex; min-width: 96px; min-height: 44px; align-items: center; justify-content: center; gap: $space-1; padding: 0 $space-3; border-radius: $radius-md; font-size: 15px; font-weight: 600; }
.quiet-action { background: $color-group-bg; color: $color-text-primary; }
.quiet-action--pressed, .primary-action--pressed { opacity: 0.72; }
.primary-action { background: $color-primary; color: #fff; }
.primary-action--danger { background: rgba(255, 218, 214, 0.65); color: #b42420; }
.primary-action--accent { background: $color-accent; color: #fff; }
.product-notice, .product-rejection { display: flex; align-items: center; gap: $space-2; margin-top: $space-3; padding: $space-3; border-radius: $radius-md; color: $color-text-secondary; font-size: 13px; }
.product-notice { background: $color-group-bg; }
.product-notice__action { margin-left: auto; display: flex; min-height: 44px; align-items: center; padding: 0 $space-3; border-radius: $radius-md; background: rgba(225, 228, 230, 0.72); color: $color-text-primary; font-weight: 600; }
.product-rejection { align-items: flex-start; background: rgba(255, 218, 214, 0.42); color: $color-text-secondary; line-height: 22px; }
.product-rejection :deep(.app-icon) { flex: none; filter: saturate(1.25); }
.product-rejection__title { display: block; color: #b42420; font-weight: 600; }
.operation-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
.merchant-help { display: flex; align-items: center; flex-direction: column; gap: $space-2; margin-top: $space-1; padding: $space-6 $space-4; border-radius: $radius-card; background: $color-group-bg; color: $color-text-secondary; font-size: 13px; line-height: 21px; text-align: center; }
.merchant-help__title { color: $color-text-primary; font-size: 17px; font-weight: 600; }
</style>
