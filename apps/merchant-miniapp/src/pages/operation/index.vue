<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import AppIcon from '@/components/AppIcon.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantTabItems } from '@/config/navigation'
import { merchantProductService } from '@/services/product'
import { formatMoneyFromFen, openSubPage } from '@/utils/navigation'
import { auditLabel, goodsStock } from '@/features/supply/rules'
import type { SupplyGoods } from '@/features/supply/types'

const keyword = ref('')
const activeFilter = ref('全部')
const busy = ref(false)
const actionError = ref('')
const { status, data, errorMessage, load, refresh } = usePageResource(async () => {
  const [goods, qualification, categories] = await Promise.all([merchantProductService.getProducts(), merchantProductService.getQualification(), merchantProductService.getCategories()])
  return { goods, qualification, categories }
})
const matches = (product: SupplyGoods, label: string) => {
  if (label === '全部') return true
  if (label === '售罄') return goodsStock(product) === 0
  if (label === '销售中') return product.marketEnable === 'UPPER'
  if (label === '已下架') return product.marketEnable === 'DOWN' && product.auditStatus === 'PASS'
  return auditLabel(product) === label
}
const filters = computed(() => ['全部','待审核','已驳回','销售中','已下架','售罄','草稿'].map(label => ({ label, count:(data.value?.goods || []).filter(goods => matches(goods, label)).length })))
const categoryName = (id: string) => data.value?.categories.find(category => category.id === id)?.name || '待选类目'
const products = computed(() => (data.value?.goods || []).filter(product => (product.goodsName + categoryName(product.categoryId)).includes(keyword.value.trim()) && matches(product, activeFilter.value)))
const priceRange = (product: SupplyGoods) => {
  const prices = product.skuList.map(sku => sku.price)
  const min = Math.min(...prices), max = Math.max(...prices)
  return min === max ? formatMoneyFromFen(min) : formatMoneyFromFen(min) + '–' + formatMoneyFromFen(max)
}
const auditTone = (goods: SupplyGoods) => goods.draft ? 'disabled' : goods.auditStatus === 'PASS' ? 'success' : goods.auditStatus === 'REFUSE' ? 'error' : 'pending'
const edit = (product?: SupplyGoods, intent = '') => openSubPage('/pages/product/editor/index' + (product?.id ? '?id=' + encodeURIComponent(product.id) + (intent ? '&intent=' + intent : '') : ''))
const perform = async (action: () => Promise<unknown>, success: string) => {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try { await action(); uni.showToast({ title:success, icon:'success' }); await refresh() }
  catch (error) { actionError.value = error instanceof Error ? error.message : '操作失败，请重试' }
  finally { busy.value = false }
}
const sale = (product: SupplyGoods, action: 'up' | 'down') => perform(() => merchantProductService.changeSaleStatus(product.id!, action), action === 'up' ? '商品已上架' : '商品已下架')
const submit = (product: SupplyGoods) => perform(() => merchantProductService.submit(product), '已提交平台审核')
const reset = () => { keyword.value = ''; activeFilter.value = '全部' }
onLoad(options => { const labels: Record<string,string> = { pending:'待审核', rejected:'已驳回', active:'销售中', down:'已下架', soldout:'售罄', draft:'草稿' }; activeFilter.value = labels[String(options?.filter || '')] || '全部'; load() })
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" @retry="load">
    <template #navbar><AppNavbar title="经营" compact show-user /></template>
    <view v-if="data" class="stack operation-stack">
      <view class="operation-tools"><text class="operation-title">商品管理</text><view class="operation-add-hit" hover-class="operation-add-hit--pressed" @click="edit()"><view class="operation-add"><AppIcon name="plus" :size="17" /><text>新增商品</text></view></view></view>
      <view v-if="!data.qualification.tradeReady" class="qualification-inline" @click="openSubPage('/pages/qualification/status/index')"><text>{{ data.qualification.baseBusinessReady ? '可准备商品；正式交易暂不可用' : '经营基础资格待完善' }}</text><text>查看原因 ›</text></view>
      <view v-if="actionError" class="action-error"><text>{{ actionError }}</text><view @click="openSubPage('/pages/qualification/status/index')">查看经营资格 ›</view></view>
      <view class="operation-query"><SearchBar v-model="keyword" class="operation-search" placeholder="搜索商品名称或类目" clearable /><scroll-view scroll-x :show-scrollbar="false" class="filter-scroll"><view class="filter-list"><view v-for="filter in filters" :key="filter.label" class="filter-chip-hit" @click="activeFilter = filter.label"><text class="filter-chip" :class="{ 'filter-chip--active': filter.label === activeFilter, 'filter-chip--danger': filter.label === '已驳回' }">{{ filter.label }} ({{ filter.count }})</text></view></view></scroll-view></view>
      <view class="product-list">
        <BaseCard v-for="product in products" :key="product.id" class="product-card" :padded="false">
          <view class="product-row" @click="edit(product)"><view class="product-row__image"><image :src="product.goodsImage" mode="aspectFill" /><text class="product-row__category">{{ categoryName(product.categoryId) }}</text></view><view class="product-row__main"><text class="product-row__name">{{ product.goodsName || '未命名草稿' }}</text><text class="product-row__description">{{ product.sellingPoint || '商品资料待完善' }}</text><view class="product-row__tags"><StatusTag :tone="auditTone(product)">{{ auditLabel(product) }}</StatusTag><StatusTag :tone="product.marketEnable === 'UPPER' ? 'success' : 'disabled'">{{ product.marketEnable === 'UPPER' ? '销售中' : product.auditStatus === 'PASS' ? '已下架' : '未上架' }}</StatusTag><StatusTag v-if="goodsStock(product) === 0" tone="error">售罄</StatusTag></view></view></view>
          <text v-if="product.auditStatus === 'TOBEAUDITED'" class="product-status-note">平台审核中，关键资料只读</text>
          <text v-if="product.authMessage" class="product-status-note product-status-note--error">{{ product.forceOffShelf ? '平台强制下架：' : '驳回原因：' }}{{ product.authMessage }}</text>
          <view class="product-metrics"><text class="price">¥{{ priceRange(product) }}<text class="product-unit"> /{{ product.unit || '件' }}</text></text><text :class="{ 'stock--empty': goodsStock(product) === 0 }">库存 {{ goodsStock(product) }} 件</text><text v-if="product.skuList.length > 1">{{ product.skuList.length }} 个 SKU</text></view>
          <view class="product-actions">
            <button v-if="product.auditStatus === 'TOBEAUDITED'" class="compact-button" @click.stop="edit(product)"><text>查看</text></button>
            <template v-else-if="product.auditStatus === 'REFUSE'"><button class="compact-button" @click.stop="edit(product)"><text>查看原因</text></button><button class="compact-button compact-button--primary" @click.stop="edit(product, 'resubmit')"><text>修改后重提</text></button></template>
            <template v-else-if="product.draft"><button class="compact-button" @click.stop="edit(product)"><text>编辑</text></button><button class="compact-button compact-button--primary" :disabled="busy || !data.qualification.baseBusinessReady" @click.stop="submit(product)"><text>提交审核</text></button></template>
            <template v-else><button class="compact-button" @click.stop="edit(product, goodsStock(product) === 0 ? 'stock' : '')"><text>{{ goodsStock(product) === 0 ? '编辑库存' : '编辑' }}</text></button><button v-if="product.marketEnable === 'UPPER'" class="compact-button compact-button--danger" :disabled="busy" @click.stop="sale(product, 'down')"><text>下架</text></button><button v-else-if="goodsStock(product) > 0" class="compact-button compact-button--primary" :disabled="busy || !data.qualification.tradeReady || product.forceOffShelf" @click.stop="sale(product, 'up')"><text>上架</text></button></template>
          </view>
        </BaseCard>
      </view>
      <view v-if="!products.length" class="operation-empty"><text>暂无匹配商品</text><view class="empty-reset" @click="reset">查看全部商品</view></view>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/operation/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.operation-stack { gap:$space-2; }
.operation-tools { display:flex; min-height:44px; align-items:center; justify-content:space-between; gap:$space-2; }
.operation-title { color:$color-primary; font-size:17px; font-weight:600; }
.operation-add-hit { display:flex; min-height:44px; align-items:center; flex:none; }
.operation-add-hit--pressed { opacity:.72; }
.operation-add { display:flex; height:36px; align-items:center; gap:$space-1; padding:0 $space-3; border-radius:$radius-md; background:$color-primary; color:#fff; font-size:14px; font-weight:600; }
.qualification-inline { display:flex; min-height:44px; align-items:center; justify-content:space-between; gap:$space-2; color:$color-warning; font-size:13px; }
.qualification-inline text:last-child { flex:none; color:$color-primary; }
.action-error { padding:$space-3; border-radius:$radius-md; background:$color-error-light; color:$color-error; font-size:14px; }
.action-error > view { display:flex; min-height:44px; align-items:center; color:$color-primary; }
.operation-query { display:flex; flex-direction:column; gap:$space-1; }
.operation-search { height:44px !important; padding:0 $space-3 !important; }
.filter-scroll { width:calc(100% + #{$page-gutter * 2}); margin-left:-$page-gutter; white-space:nowrap; }
.filter-list { display:flex; gap:$space-2; padding:0 $page-gutter; }
.filter-chip-hit { display:inline-flex; min-height:44px; align-items:center; flex:none; }
.filter-chip { display:inline-flex; height:36px; align-items:center; padding:0 $space-3; border-radius:999px; background:$color-card-bg; color:$color-text-secondary; font-size:14px; font-weight:600; white-space:nowrap; }
.filter-chip--active { background:$color-primary; color:#fff; }
.filter-chip--danger { color:$color-accent; }
.product-list { display:flex; flex-direction:column; gap:$space-2; }
.product-card { padding:$space-3; }
.product-row { display:flex; gap:$space-3; }
.product-row__image { position:relative; width:80px; height:80px; flex:none; overflow:hidden; border-radius:$radius-md; background:$color-group-bg; }
.product-row__image image { width:100%; height:100%; }
.product-row__category { position:absolute; right:3px; bottom:3px; left:3px; overflow:hidden; padding:1px 4px; border-radius:4px; background:rgba(27,77,83,.82); color:#fff; font-size:10px; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
.product-row__main { flex:1; min-width:0; }
.product-row__name { display:-webkit-box; overflow:hidden; font-size:16px; font-weight:600; line-height:22px; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.product-row__description { display:block; overflow:hidden; margin-top:2px; color:$color-text-secondary; font-size:13px; line-height:18px; text-overflow:ellipsis; white-space:nowrap; }
.product-row__tags { display:flex; flex-wrap:wrap; gap:$space-1; margin-top:$space-1; }
.product-row__tags :deep(.status-tag) { min-height:22px; padding:0 6px; font-size:12px; }
.product-status-note { display:block; overflow:hidden; margin-top:$space-2; color:$color-text-secondary; font-size:12px; line-height:18px; text-overflow:ellipsis; white-space:nowrap; }
.product-status-note--error { color:$color-error; }
.product-metrics { display:flex; flex-wrap:wrap; align-items:baseline; gap:$space-2; margin-top:$space-2; color:$color-text-secondary; font-size:13px; }
.price { color:$color-accent; font-size:18px; font-weight:700; }
.product-unit { color:$color-text-secondary; font-size:12px; font-weight:400; }
.stock--empty { color:$color-error; font-weight:600; }
.product-actions { display:flex; justify-content:flex-end; gap:$space-2; margin-top:$space-1; }
.compact-button { display:flex; height:44px; min-width:64px; align-items:center; justify-content:center; margin:0; padding:0; border:0; background:transparent; font-size:14px; line-height:20px; }
.compact-button::after { border:0; }
.compact-button > text { display:flex; height:36px; align-items:center; justify-content:center; padding:0 $space-3; border-radius:$radius-md; background:$color-group-bg; color:$color-text-primary; font-weight:600; }
.compact-button--primary > text { background:$color-primary; color:#fff; }
.compact-button--danger > text { background:$color-error-light; color:$color-error; }
.compact-button[disabled] { opacity:.5; }
.operation-empty { padding:$space-8 0; text-align:center; color:$color-text-secondary; }
.empty-reset { display:flex; min-height:44px; align-items:center; justify-content:center; color:$color-primary; }
</style>
