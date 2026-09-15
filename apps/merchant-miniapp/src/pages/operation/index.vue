<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { appAdapter } from '@/adapters/mock'
import { usePageResource } from '@/composables/usePageResource'
import { formatMoneyFromFen } from '@/utils/navigation'
import AppIcon from '@/components/AppIcon.vue'
import { merchantTabItems } from '@/config/navigation'

const keyword = ref('')
const { status, data, errorMessage, load } = usePageResource(appAdapter.getMerchantProducts)
const products = computed(() => (data.value || []).filter((product) => product.name.includes(keyword.value.trim())))
const unavailable = () => uni.showToast({ title: '商品详情在阶段 03 开放', icon: 'none' })
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="经营" /></template>
    <view class="stack">
      <view class="operation-head"><view class="operation-tabs"><text class="operation-tab operation-tab--active">商品</text><text class="operation-tab">服务</text><StatusTag tone="disabled">后续开放</StatusTag></view><AppButton class="operation-add" @click="unavailable"><view class="operation-add__copy"><AppIcon name="plus" :size="18" /><text>新增商品</text></view></AppButton></view>
      <SearchBar v-model="keyword" placeholder="搜索商品名称" />
      <scroll-view scroll-x :show-scrollbar="false" class="filter-scroll"><view class="filter-list"><text v-for="filter in ['全部', '销售中', '待审核', '已驳回', '已下架']" :key="filter" class="filter-chip" :class="{ 'filter-chip--active': filter === '全部' }">{{ filter }}</text></view></scroll-view>
      <BaseCard v-for="product in products" :key="product.id">
        <view class="product-row"><view class="product-row__image"><image :src="product.image" mode="aspectFill" /></view><view class="product-row__main"><text class="product-row__name">{{ product.name }}</text><view class="product-row__tags"><StatusTag :tone="product.auditStatus === '已通过' ? 'success' : product.auditStatus === '已驳回' ? 'error' : 'pending'">{{ product.auditStatus }}</StatusTag><StatusTag :tone="product.saleStatus === '销售中' ? 'success' : 'disabled'">{{ product.saleStatus }}</StatusTag></view><view class="product-row__meta"><text class="price">¥{{ formatMoneyFromFen(product.price) }}</text><text>库存 {{ product.stock }} 件</text></view></view></view>
        <view class="product-actions"><view class="quiet-action" hover-class="quiet-action--pressed" @click="unavailable"><AppIcon name="edit" :size="17" /><text>查看/编辑</text></view></view>
      </BaseCard>
      <view v-if="!products.length" class="operation-empty">暂无匹配商品</view>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/operation/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.operation-head { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: $space-2; }
.operation-tabs { display: flex; min-height: $touch-target-min; align-items: center; gap: $space-3; }
.operation-add { width: 124px; flex: none; }
.operation-add__copy { display: flex; align-items: center; justify-content: center; gap: $space-1; }
.operation-tab { color: $color-text-secondary; font-size: 19px; }
.operation-tab--active { padding-bottom: $space-1; border-bottom: 3px solid $color-primary; color: $color-primary; font-weight: 700; }
.filter-scroll { white-space: nowrap; scrollbar-width: none; }
.filter-scroll::-webkit-scrollbar { display: none; }
.filter-list { display: flex; gap: $space-2; }
.filter-chip { display: inline-flex; min-height: $touch-target-min; align-items: center; padding: 0 $space-4; border-radius: 999px; background: #fff; color: $color-text-secondary; white-space: nowrap; }
.filter-chip--active { background: $color-primary; color: #fff; }
.product-row { display: flex; gap: $space-3; }
.product-row__image { display: flex; width: 96px; height: 96px; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; border-radius: $radius-md; background: #d9e8d7; }
.product-row__image image { width: 100%; height: 100%; }
.product-row__main { flex: 1; min-width: 0; }
.product-row__name { display: block; font-size: 16px; font-weight: 600; }
.product-row__tags { display: flex; flex-wrap: wrap; gap: $space-1; margin-top: $space-2; }
.product-row__meta { display: flex; align-items: flex-end; justify-content: space-between; margin-top: $space-2; color: $color-text-secondary; font-size: 13px; }
.product-actions { display: flex; justify-content: flex-end; margin-top: $space-3; }
.quiet-action { display: flex; min-width: 112px; min-height: 42px; align-items: center; justify-content: center; gap: $space-1; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; font-size: 14px; }
.quiet-action--pressed { opacity: 0.72; }
.operation-empty { padding: $space-8 0; color: $color-text-secondary; text-align: center; }
</style>
