<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
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
const auditTone = (value: string) => value === '已通过' ? 'success' : value === '已驳回' ? 'error' : 'pending'
const saleLabel = (value: string, auditStatus: string) => auditStatus === '已驳回' ? '无法销售' : value === '销售中' ? '在售中' : value === '已下架' ? '已手动下架' : value
const saleTone = (value: string) => value === '销售中' ? 'success' : 'disabled'
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="经营" compact show-user /></template>
    <view class="stack operation-stack">
      <view class="operation-tools">
        <view class="operation-tabs"><text class="operation-tab operation-tab--active">商品</text><view class="operation-tab operation-tab--muted">服务 <StatusTag tone="disabled">后续开放</StatusTag></view></view>
        <view class="operation-add-hit" hover-class="operation-add-hit--pressed" @click="unavailable"><view class="operation-add"><AppIcon name="plus" :size="17" /><text>新增商品</text></view></view>
      </view>
      <view class="operation-query"><SearchBar v-model="keyword" class="operation-search" placeholder="搜索商品名称" /><scroll-view scroll-x :show-scrollbar="false" class="filter-scroll"><view class="filter-list"><view v-for="filter in data!.filters" :key="filter.label" class="filter-chip-hit" hover-class="filter-chip-hit--pressed" @click="activeFilter = filter.label"><text class="filter-chip" :class="{ 'filter-chip--active': filter.label === activeFilter, 'filter-chip--danger': filter.label === '已驳回' }">{{ filter.label }} ({{ filter.count }})</text></view></view></scroll-view></view>

      <view class="product-list">
        <BaseCard v-for="product in products" :key="product.id" class="product-card" :padded="false" @click="unavailable">
          <view class="product-row">
            <view class="product-row__image"><image :src="product.image" mode="aspectFill" /><text class="product-row__category">{{ product.category }}</text></view>
            <view class="product-row__main"><text class="product-row__name">{{ product.name }}</text><text class="product-row__description">{{ product.category }} · {{ product.description }}</text><view class="product-row__tags"><StatusTag :tone="auditTone(product.auditStatus)">{{ product.auditStatus }}</StatusTag><StatusTag :tone="saleTone(product.saleStatus)">{{ saleLabel(product.saleStatus, product.auditStatus) }}</StatusTag></view></view>
          </view>
          <text v-if="product.auditStatus === '待审核'" class="product-status-note">平台审核中，请留意审核结果</text>
          <text v-else-if="product.auditStatus === '已驳回'" class="product-status-note product-status-note--error">审核未通过：{{ product.rejectionReason }}</text>
          <view class="product-footer"><view class="product-row__meta"><text class="price" :class="{ 'price--muted': product.saleStatus === '已下架' || product.auditStatus === '已驳回' }">¥{{ formatMoneyFromFen(product.price) }}<text class="product-row__unit"> /{{ product.unit }}</text></text><text :class="{ 'stock--empty': product.stock === 0 }">{{ product.stock === 0 ? '库存 0 件' : `库存 ${product.stock} 件` }}</text></view><view class="product-actions"><view class="action-hit" hover-class="action-hit--pressed" @click.stop="unavailable"><view class="quiet-action">{{ product.auditStatus === '已驳回' ? '查看原因' : '编辑' }}</view></view><view v-if="product.auditStatus === '已驳回'" class="action-hit" hover-class="action-hit--pressed" @click.stop="unavailable"><view class="primary-action primary-action--accent">修改后重提</view></view><view v-else-if="product.saleStatus === '销售中'" class="action-hit" hover-class="action-hit--pressed" @click.stop="unavailable"><view class="primary-action primary-action--danger">下架</view></view><view v-else-if="product.saleStatus === '已下架'" class="action-hit" hover-class="action-hit--pressed" @click.stop="unavailable"><view class="primary-action">重新上架</view></view></view></view>
        </BaseCard>
      </view>
      <view v-if="!products.length" class="operation-empty">暂无匹配商品</view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/operation/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.operation-stack { gap: $space-2; }
.operation-tools { display: flex; min-width: 0; min-height: $touch-target-min; align-items: center; justify-content: space-between; gap: $space-2; }
.operation-tabs { display: flex; min-width: 0; align-items: center; gap: $space-3; }
.operation-tab { color: $color-text-secondary; font-size: 17px; font-weight: 600; white-space: nowrap; }
.operation-tab--active { position: relative; padding: 9px 0; color: $color-primary; }
.operation-tab--active::after { position: absolute; right: 0; bottom: 3px; left: 0; width: 28px; height: 3px; margin: auto; border-radius: 999px; background: $color-primary; content: ''; }
.operation-tab--muted { display: flex; align-items: center; gap: $space-1; }
.operation-tab--muted :deep(.status-tag) { min-height: 22px; padding: 0 6px; font-size: 11px; }
.operation-add-hit { display: flex; width: auto; min-height: $touch-target-min; align-items: center; flex: none; }
.operation-add-hit--pressed { opacity: 0.72; }
.operation-add { display: flex; height: 36px; align-items: center; justify-content: center; gap: $space-1; padding: 0 $space-3; border-radius: $radius-md; background: $color-primary; color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap; }
.operation-query { display: flex; flex-direction: column; gap: $space-1; }
.operation-search { height: 44px !important; padding: 0 $space-3 !important; }
.filter-scroll { width: calc(100% + #{$page-gutter * 2}); margin-left: -$page-gutter; white-space: nowrap; scrollbar-width: none; }
.filter-scroll::-webkit-scrollbar { display: none; }
.filter-list { display: flex; gap: $space-2; padding: 0 $page-gutter; }
.filter-chip-hit { display: inline-flex; min-height: $touch-target-min; align-items: center; flex: none; }
.filter-chip-hit--pressed { opacity: 0.72; }
.filter-chip { display: inline-flex; height: 36px; align-items: center; justify-content: center; padding: 0 $space-3; border-radius: 999px; background: $color-card-bg; color: $color-text-secondary; font-size: 14px; font-weight: 600; text-align: center; white-space: nowrap; }
.filter-chip--active { background: $color-primary; color: #fff; }
.filter-chip--danger { color: $color-accent; }
.product-list { display: flex; flex-direction: column; gap: 6px; }
.product-card { padding: $space-3; }
.product-row { display: flex; gap: $space-3; }
.product-row__image { position: relative; display: flex; width: 80px; height: 80px; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: $radius-md; background: $color-group-bg; }
.product-row__image image { width: 100%; height: 100%; }
.product-row__category { position: absolute; right: 3px; bottom: 3px; left: 3px; overflow: hidden; padding: 1px 4px; border-radius: 4px; background: rgba(27, 77, 83, 0.82); color: #fff; font-size: 10px; line-height: 15px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.product-row__main { flex: 1; min-width: 0; }
.product-row__name { display: -webkit-box; overflow: hidden; font-size: 16px; font-weight: 600; line-height: 22px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-row__description { display: block; overflow: hidden; margin-top: 2px; color: $color-text-secondary; font-size: 13px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.product-row__tags { display: flex; flex-wrap: wrap; gap: $space-1; margin-top: $space-1; }
.product-row__tags :deep(.status-tag) { min-height: 22px; padding: 0 6px; border-radius: 999px; font-size: 12px; }
.product-footer { display: flex; min-width: 0; min-height: $touch-target-min; align-items: center; justify-content: space-between; gap: $space-2; margin-top: $space-1; }
.product-row__meta { display: flex; min-width: 0; align-items: flex-end; gap: $space-2; color: $color-text-secondary; font-size: 13px; }
.product-row__meta > text { white-space: nowrap; }
.price { color: $color-accent; font-size: 18px; font-weight: 700; line-height: 22px; }
.price--muted { color: $color-text-secondary; }
.product-row__unit { color: $color-text-secondary; font-size: 12px; font-weight: 400; }
.stock--empty { color: $color-error; font-weight: 600; }
.product-status-note { display: block; overflow: hidden; margin-top: $space-2; color: $color-text-secondary; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.product-status-note--error { color: $color-error; }
.product-actions { display: flex; flex: none; justify-content: flex-end; gap: $space-2; }
.action-hit { display: inline-flex; min-height: $touch-target-min; align-items: center; flex: none; }
.action-hit--pressed { opacity: 0.72; }
.quiet-action, .primary-action { display: flex; height: 36px; align-items: center; justify-content: center; padding: 0 $space-2; border-radius: $radius-md; font-size: 14px; font-weight: 600; white-space: nowrap; }
.quiet-action { background: $color-group-bg; color: $color-text-primary; }
.primary-action { background: $color-primary; color: #fff; }
.primary-action--danger { background: rgba(255, 218, 214, 0.65); color: $color-error; }
.primary-action--accent { background: $color-accent; color: #fff; }
.operation-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
</style>
