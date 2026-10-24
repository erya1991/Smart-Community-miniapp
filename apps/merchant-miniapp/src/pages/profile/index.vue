<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import MerchantIdentityPanel from '../../components/MerchantIdentityPanel.vue'
import { merchantTabItems } from '@/config/navigation'
import { useMerchantContext } from '@/stores/merchant-context'

const { loadIdentity } = useMerchantContext()
onShow(loadIdentity)
</script>

<template>
  <AppPage>
    <template #navbar><AppNavbar title="我的" centered /></template>
    <view class="stack merchant-profile-stack">
      <MerchantIdentityPanel />
      <BaseCard class="merchant-profile-scope">
        <SectionHeader title="商户服务" />
        <text>店铺资料、工作人员及经营资格服务尚未开放，当前仅查看已核实的身份。</text>
      </BaseCard>
      <view class="merchant-profile-footer">大光路智慧社区商户服务</view>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/profile/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.merchant-profile-stack { gap: $space-3; }
.merchant-profile-scope > text { display: block; color: $color-text-secondary; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
.merchant-profile-footer { padding: $space-2 0 $space-3; color: $color-text-secondary; font-size: 13px; text-align: center; }
</style>
