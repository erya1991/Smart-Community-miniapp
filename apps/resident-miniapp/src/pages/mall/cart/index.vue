<script setup lang="ts">
import {accessRequired} from '../../../../../../packages/common/utils/commercePresentation'
import Stage2Notice from '@/features/mall/Stage2Notice.vue'
import { stage2Mall } from '@/services/stage2-mall'
import { stage2Enabled, stage2Owner } from '@/adapters/stage2-http'
import { computed, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'
import type { CartMerchantGroup } from '../../../../../../packages/common/types/mall'

const { status, data, errorMessage, load } = usePageResource(residentMallService.getCart)
const actionError = ref('')
const busy = ref(false)
let actionSequence = 0
if (stage2Enabled) watch(stage2Owner, () => { actionSequence++; busy.value = false; actionError.value = '' }, { flush: 'sync' })
const money = (value: number) => (value / 100).toFixed(2)
const validItems = computed(() => data.value?.groups.flatMap((group) => group.items) || [])
const selectedItems = computed(() => validItems.value.filter((item) => item.selected))
const selectedCount = computed(() => selectedItems.value.reduce((sum, item) => sum + item.quantity, 0))
const selectedAmount = computed(() => selectedItems.value.reduce((sum, item) => sum + item.latestPrice * item.quantity, 0))
const allSelected = computed(() => validItems.value.length > 0 && validItems.value.every((item) => item.selected))
const partiallySelected = computed(()=>selectedItems.value.length>0&&!allSelected.value)
const groupPartial = (group: CartMerchantGroup) => group.items.some(i=>i.selected)&&!group.items.every(i=>i.selected)
const groupSelected = (group: CartMerchantGroup) => group.items.every((item) => item.selected)
const act = async (action: () => Promise<unknown>) => {
  if (busy.value) return
  const version = ++actionSequence, owner = stage2Enabled ? stage2Owner() : ''
  const current = () => !stage2Enabled || version === actionSequence && owner === stage2Owner()
  busy.value = true; actionError.value = ''
  try { await action(); if (current()) await load() }
  catch (error) { if (current()) actionError.value = error instanceof Error ? error.message : '操作失败，请重试。' }
  finally { if (current()) busy.value = false }
}
const toggle = (id: string, selected: boolean) => act(() => residentMallService.toggleCartItem(id, selected))
const toggleGroup = (group: CartMerchantGroup) => act(() => Promise.all(group.items.map((item) => residentMallService.toggleCartItem(item.id, !groupSelected(group)))))
const toggleAll = () => act(() => Promise.all(validItems.value.map((item) => residentMallService.toggleCartItem(item.id, !allSelected.value))))
const updateQuantity = (id: string, quantity: number) => act(() => residentMallService.updateCartQuantity(id, quantity))
const clearInvalid = () => {
  if (busy.value || !data.value?.invalidItems.length) return
  const count = data.value.invalidItems.length, owner = stage2Owner(), version = actionSequence
  const removeConfirmed = stage2Enabled ? stage2Mall.invalidRemoval() : residentMallService.clearInvalidCart
  uni.showModal({ title: '清理不可结算商品', content: `将删除当前列出的${count}种失效规格，正常商品保留。`, success: ({ confirm }) => {
    if (confirm && (!stage2Enabled || owner === stage2Owner() && version === actionSequence)) void act(removeConfirmed)
  } })
}
const remove = (id: string) => {
  if (!stage2Enabled) return act(() => residentMallService.removeCartItem(id))
  if (busy.value) return
  const item = [...validItems.value, ...(data.value?.invalidItems || [])].find(item => item.id === id)
  if (!item) return
  const owner = stage2Owner(), version = actionSequence
  try {
    const removeConfirmed = stage2Mall.cartRemoval(id)
    uni.showModal({ title: '移除商品', content: `确定移除“${item.product.name} · ${item.sku.name}”吗？`, success: ({ confirm }) => {
      if (confirm && owner === stage2Owner() && version === actionSequence) void act(removeConfirmed)
    } })
  } catch (error) { actionError.value = error instanceof Error ? error.message : '请刷新购物车后再操作。' }
}
const checkout = () => {
  if (busy.value || !selectedItems.value.length) return
  openSubPage('/pages/mall/confirm/index?cartIds=' + encodeURIComponent(selectedItems.value.map((item) => item.id).join(',')))
}
const empty = computed(() => data.value && !validItems.value.length && !data.value.invalidItems.length)
onLoad(load)
onShow(() => { if (data.value) load() })
</script>

<template>
  <AppPage v-if="stage2Enabled && accessRequired(errorMessage)" status="ready"><template #navbar><AppNavbar title="购物车" centered show-back /></template><Stage2Notice :error="errorMessage"/></AppPage><AppPage v-else :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="购物车" centered show-back /></template>
    <view v-if="data" class="stack cart-page"><Stage2Notice v-if="stage2Enabled" />
      <view class="cart-tip"><AppIcon name="verified" :size="19" /><text>社区便民直供：按商户分别履约，所选商品统一结算。</text></view>
      <view v-if="actionError" class="stack"><text class="action-error">{{ actionError }}</text><AppButton variant="secondary" :disabled="busy" @click="actionError = ''; load()">重新读取购物车</AppButton></view>
      <BaseCard v-for="group in data.groups" :key="group.storeId">
        <view class="merchant-head">
          <button class="check-hit" :aria-label="'选择' + group.merchantName + '全部商品'" :disabled="busy" @click="toggleGroup(group)"><view class="check" :class="{ active: groupSelected(group) }">{{ groupSelected(group) ? '✓' : groupPartial(group) ? '−' : '' }}</view></button>
          <AppIcon name="store" :size="20" /><text>{{ group.storeName || group.merchantName }}</text>
        </view>
        <view v-for="item in group.items" :key="item.id" class="cart-item">
          <button class="check-hit" :aria-label="'选择' + item.product.name" :disabled="busy" @click="toggle(item.id, !item.selected)"><view class="check" :class="{ active: item.selected }">{{ item.selected ? '✓' : '' }}</view></button>
          <image :src="item.sku.image || item.product.mainImage" mode="aspectFill" />
          <view class="item-main"><text class="product-name">{{ item.product.name }}</text><text class="spec">规格：{{ item.sku.name }}</text><text v-if="item.invalidReason" class="action-error">{{ item.invalidReason }}</text>
            <view class="price-quantity"><text class="cart-price">¥{{ money(item.latestPrice) }}</text><view class="quantity"><button :disabled="busy || item.quantity <= 1" aria-label="减少数量" @click="updateQuantity(item.id, item.quantity - 1)">−</button><text>{{ item.quantity }}</text><button :disabled="busy || item.quantity >= Math.min(99,item.sku.availableStock)" aria-label="增加数量" @click="updateQuantity(item.id, item.quantity + 1)">+</button></view></view>
            <button class="remove" :disabled="busy" @click="remove(item.id)">移除</button>
          </view>
        </view>
      </BaseCard>
      <BaseCard v-if="data.invalidItems.length">
        <view class="invalid-head"><text>不可结算商品（{{ data.invalidItems.length }}）</text><button class="remove" :disabled="busy" @click="clearInvalid">一键清空</button></view>
        <view v-for="item in data.invalidItems" :key="item.id" class="invalid-item"><image :src="item.product.mainImage" mode="aspectFill" /><view><text class="product-name">{{ item.product.name }}</text><text class="spec">{{ item.sku.name }} · {{ item.quantity }}件</text><text class="action-error">{{ item.invalidReason }}</text><button v-if="stage2Enabled && item.status === 'stock-insufficient'" class="remove" :disabled="busy" @click="updateQuantity(item.id, item.sku.availableStock)">改为{{ item.sku.availableStock }}件</button><button v-else-if="stage2Enabled && item.product.id" class="remove" :disabled="busy" @click="openSubPage('/pages/mall/detail/index?id=' + encodeURIComponent(item.product.id))">重新选择商品与规格</button></view><button class="remove" :disabled="busy" @click="remove(item.id)">移除</button></view>
      </BaseCard>
      <view v-if="empty" class="empty">购物车还是空的，去商城看看吧</view>
      <text class="cart-footer">大光路智慧社区 · 邻里直供 安心便民</text>
    </view>
    <BottomActionBar v-if="data"><button class="all-check" :disabled="busy || !validItems.length" @click="toggleAll"><view class="check" :class="{ active: allSelected }">{{ allSelected ? '✓' : partiallySelected ? '−' : '' }}</view><text>全选</text></button><view class="cart-total"><text>已选 {{ selectedCount }} 件 · 商品预估</text><text>¥{{ money(selectedAmount) }}</text></view><AppButton :disabled="busy || !selectedCount" @click="checkout">结算</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.cart-page { gap:$space-3; }.cart-tip { display:flex; gap:$space-2; padding:$space-3; border-radius:$radius-card; background:$color-primary-light; color:$color-primary; font-size:15px; line-height:23px; }
button { margin:0; padding:0; background:transparent; font-size:15px; line-height:normal; }button::after { border:none; }button[disabled] { opacity:.45; }
.merchant-head { display:flex; align-items:center; gap:6px; padding-bottom:8px; border-bottom:1px solid $color-border; }.merchant-head > text { flex:1; min-width:0; font-size:17px; font-weight:600; line-height:25px; }
.check-hit { display:flex; flex:none; width:44px; min-height:44px; align-items:center; justify-content:center; }.check { display:flex; width:24px; height:24px; flex:none; align-items:center; justify-content:center; border:1px solid $color-border; border-radius:50%; color:#fff; }.check.active { background:$color-primary; border-color:$color-primary; }
.cart-item { display:flex; align-items:flex-start; gap:6px; padding:12px 0; border-bottom:1px solid $color-border; }.cart-item > image,.invalid-item > image { width:64px; height:76px; flex:none; border-radius:$radius-md; }.item-main { min-width:0; flex:1; }.product-name { display:block; font-size:16px; font-weight:600; line-height:24px; overflow-wrap:anywhere; }.spec { display:block; font-size:13px; color:$color-text-secondary; line-height:20px; }
.price-quantity { display:flex; align-items:center; flex-wrap:wrap; justify-content:space-between; gap:4px; }.cart-price { font-size:18px; font-weight:700; color:$color-accent; }.quantity { display:flex; align-items:center; border:1px solid $color-border; border-radius:$radius-md; }.quantity button { display:flex; width:44px; height:44px; align-items:center; justify-content:center; font-size:22px; }.quantity text { min-width:20px; text-align:center; }
.remove { display:flex; min-width:44px; min-height:44px; align-items:center; justify-content:center; color:$color-primary; font-size:14px; }.item-main > .remove { margin-left:auto; }.invalid-head { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; font-size:16px; font-weight:600; }.invalid-item { display:flex; align-items:center; gap:8px; padding-top:12px; }.invalid-item > view { flex:1; min-width:0; }.invalid-item image { opacity:.6; filter:grayscale(1); }.action-error { display:block; color:$color-error; font-size:14px; line-height:22px; }
.empty { padding:32px 0; text-align:center; color:$color-text-secondary; }.cart-footer { text-align:center; font-size:13px; color:$color-text-secondary; padding:16px 0; }.all-check { display:flex; align-items:center; gap:4px; min-height:48px; flex:none; color:$color-text-primary; }.cart-total { display:flex; flex-direction:column; justify-content:center; min-width:0; flex:1; font-size:13px; }.cart-total text:last-child { overflow-wrap:anywhere;word-break:break-all;line-height:24px;font-size:20px; color:$color-accent; font-weight:700; }.cart-total + :deep(.app-button) { flex:0 0 86px; }
</style>
