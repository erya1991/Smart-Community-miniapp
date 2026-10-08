<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import { usePageResource } from '@/composables/usePageResource'
import { residentMallService } from '@/services/mall'
import { openSubPage } from '@/utils/navigation'

const selecting = ref(false)
const { status, data, errorMessage, load } = usePageResource(residentMallService.getAddresses)
const empty = computed(() => data.value?.length === 0)
const edit = (id?: string) => openSubPage(`/pages/member/address-edit/index${id ? `?id=${id}` : ''}`)
const setDefault = async (id: string) => { await residentMallService.setDefaultAddress(id); uni.showToast({ title: '已设为默认地址', icon: 'success' }); load() }
const remove = (id: string) => uni.showModal({ title: '删除地址', content: '删除后不会影响已创建订单中的地址快照。', success: async ({ confirm }) => { if (confirm) { await residentMallService.deleteAddress(id); uni.showToast({ title: '地址已删除', icon: 'success' }); load() } } })
const choose = async (id: string) => {
  if (!selecting.value) return
  await setDefault(id)
  uni.navigateBack()
}
onLoad((options) => { selecting.value = options?.select === '1'; load() })
onShow(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary :with-bottom-action="true" @retry="load">
    <template #navbar><AppNavbar :title="selecting ? '选择收货地址' : '收货地址'" centered show-back /></template>
    <view class="stack address-page">
      <view class="address-tip"><AppIcon name="verified" :size="18" /><text>配送订单会保存本次地址快照，后续修改不会影响历史订单。</text></view>
      <BaseCard v-for="address in data" :key="address.id" class="address-card" :class="{ 'address-card--selecting': selecting }" :padded="false" @click="choose(address.id)">
        <view class="address-card__body"><view class="address-card__head"><text>{{ address.name }}</text><text>{{ address.mobile }}</text><text v-if="address.isDefault" class="default-tag">默认</text><text class="address-label">{{ address.label }}</text></view><text class="address-card__detail">{{ address.region }}{{ address.detail }}</text></view>
        <view class="address-card__actions"><text class="address-card__default" :class="{ 'address-card__default--active': address.isDefault }" @click.stop="setDefault(address.id)">{{ address.isDefault ? '✓ 默认地址' : '设为默认' }}</text><view><text @click.stop="edit(address.id)">编辑</text><text @click.stop="remove(address.id)">删除</text></view></view>
      </BaseCard>
      <view v-if="empty" class="address-empty">暂无收货地址，请先新增地址。</view>
    </view>
    <BottomActionBar><AppButton @click="edit()">新增收货地址</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.address-page { gap: $space-3; }.address-tip { display:flex; align-items:flex-start; gap:$space-2; padding:$space-3; border-radius:$radius-card; background:$color-primary-light; color:$color-text-secondary; font-size:13px; line-height:20px; }.address-card { overflow:hidden; }.address-card--selecting { border-color:rgba(27,77,83,.34); }.address-card__body { padding:$space-4; }.address-card__head { display:flex; align-items:center; flex-wrap:wrap; gap:$space-2; }.address-card__head text:first-child { font-size:17px; font-weight:700; }.address-card__head text:nth-child(2) { color:$color-text-secondary; font-size:14px; }.default-tag,.address-label { padding:2px 6px; border-radius:$radius-sm; font-size:11px; }.default-tag { background:$color-primary-light; color:$color-primary; }.address-label { background:$color-group-bg; color:$color-text-secondary; }.address-card__detail { display:block; margin-top:$space-2; font-size:15px; line-height:22px; }.address-card__actions { display:flex; min-height:48px; align-items:center; justify-content:space-between; padding:0 $space-4; border-top:1px solid rgba(225,228,230,.72); color:$color-text-secondary; font-size:13px; }.address-card__actions > view { display:flex; align-items:center; gap:$space-4; color:$color-primary; }.address-card__default { min-height:40px; padding-top:12px; }.address-card__default--active { color:$color-primary; font-weight:600; }.address-empty { padding:$space-8 0; color:$color-text-secondary; text-align:center; }
</style>
