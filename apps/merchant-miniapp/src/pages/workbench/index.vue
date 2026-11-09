<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import {stage45Api,stage45Enabled} from '@/services/stage45'
import Stage45Entries from '@shared/ui/components/stage45/StoreEntries.vue'
import Stage3Workbench from '../../features/stage3/Workbench.vue'
import {stage3Enabled} from '../../services/stage3'
import Stage1Home from '../../components/stage1/Home.vue'
import {stage1Enabled} from '../../services/stage1'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import MerchantIdentityPanel from '../../components/MerchantIdentityPanel.vue'
import { merchantTabItems } from '@/config/navigation'
import { useMerchantContext } from '@/stores/merchant-context'

const { loadIdentity, state } = useMerchantContext()
onShow(loadIdentity)
</script>

<template>
  <AppPage>
    <template #navbar><AppNavbar title="工作台" compact show-user /></template>
    <view class="stack workbench-stack">
      <MerchantIdentityPanel />
      <Stage3Workbench v-if="stage3Enabled && state.identity?.identity === 'STORE'"/>
      <Stage45Entries v-if="stage45Enabled && state.identity?.identity === 'STORE'" :api="stage45Api"/>
      <Stage1Home v-if="stage1Enabled"/>
      <BaseCard v-if="!stage1Enabled&&!stage3Enabled&&!stage45Enabled" class="workbench-scope">
        <SectionHeader title="经营服务暂未开放" />
        <text>当前仅提供商户身份确认和本设备登录管理。身份核实不代表商品、订单或交易操作已经开放。</text>
      </BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/workbench/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.workbench-stack { gap: $space-3; }
.workbench-scope > text { display: block; color: $color-text-secondary; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
</style>
