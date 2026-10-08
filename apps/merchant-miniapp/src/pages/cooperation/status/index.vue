<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import AppButton from '@/components/AppButton.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantSupplyService } from '@/services/supply'

const { status, data, errorMessage, load, refresh } = usePageResource(merchantSupplyService.getQualification)
const preview = () => uni.showModal({ title:'协议附件（Mock）', content:'当前附件为原型示例，展示协议摘要；真实协议文件需在接口接入时由平台提供。', showCancel:false })
onLoad(load)
onShow(() => { if (data.value) refresh() })
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="合作协议详情" centered show-back /></template>
    <view v-if="data" class="stack agreement-page">
      <BaseCard><text class="agreement-title">{{ data.agreement.name }}</text><text class="agreement-store">{{ data.storeName }}</text><StatusTag :tone="data.agreement.status === 'active' ? 'success' : 'pending'">{{ { active:'有效', missing:'未建立', expired:'已失效', terminated:'已终止' }[data.agreement.status] }}</StatusTag></BaseCard>
      <BaseCard><view class="agreement-row"><text>协议编号</text><text>{{ data.agreement.status === 'missing' ? '—' : data.agreement.no }}</text></view><view class="agreement-row"><text>协议版本</text><text>{{ data.agreement.version }}</text></view><view class="agreement-row"><text>生效时间</text><text>{{ data.agreement.startsAt || '—' }}</text></view><view class="agreement-row"><text>失效时间</text><text>{{ data.agreement.endsAt || '—' }}</text></view><view class="agreement-row"><text>经营范围</text><text>{{ data.agreement.scope }}</text></view></BaseCard>
      <BaseCard><text class="agreement-heading">合作约定摘要</text><text class="agreement-copy">{{ data.agreement.commissionSummary }}</text><text class="agreement-copy">{{ data.agreement.afterSaleSummary }}</text><text class="agreement-copy">本页只读；协议变更由平台维护。</text></BaseCard>
      <BaseCard><text class="agreement-heading">协议附件</text><text class="agreement-copy">{{ data.agreement.attachment || '暂无附件，请联系平台' }}</text><AppButton v-if="data.agreement.attachment" variant="quiet" @click="preview">查看附件说明</AppButton></BaseCard>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.agreement-page { gap:$space-3; }
.agreement-title { display:block; font-size:19px; font-weight:700; }
.agreement-store { display:block; margin:$space-2 0; color:$color-text-secondary; font-size:14px; }
.agreement-row { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:$space-3; padding:$space-2 0; border-bottom:1px solid $color-border; font-size:14px; }
.agreement-row text:first-child { flex:none; color:$color-text-secondary; }
.agreement-row text:last-child { text-align:right; overflow-wrap:anywhere; }
.agreement-heading { display:block; font-size:17px; font-weight:600; }
.agreement-copy { display:block; margin:$space-3 0; font-size:14px; line-height:22px; color:$color-text-secondary; }
</style>
