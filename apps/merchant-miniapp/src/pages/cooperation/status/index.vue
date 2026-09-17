<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BaseCard from '@/components/BaseCard.vue'
import QualificationStatusCard from '@/components/QualificationStatusCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantCooperationService } from '@/services/merchant-cooperation'

const { status, data, errorMessage, load } = usePageResource(merchantCooperationService.getCooperationStatus)
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary @retry="load">
    <template #navbar><AppNavbar title="合作状态" centered show-back /></template>
    <view v-if="data" class="stack cooperation-page"><view class="project-summary"><text>当前项目</text><text>{{ data.project.name }}</text><StatusTag tone="success">{{ data.project.status }}</StatusTag></view><QualificationStatusCard title="合作协议" :status="data.agreement.status" tone="success" description="商户端仅可查看，不可修改协议"><view class="detail-list"><view><text>协议名称</text><text>{{ data.agreement.name }}</text></view><view><text>协议编号</text><text>{{ data.agreement.no }}</text></view><view><text>有效期</text><text>{{ data.agreement.period }}</text></view><view><text>合作范围</text><text>{{ data.agreement.scope }}</text></view></view></QualificationStatusCard><QualificationStatusCard title="项目合作" :status="data.cooperation.status" tone="success" description="项目合作与其他项目相互独立"><view class="detail-list"><view><text>合作期限</text><text>{{ data.cooperation.period }}</text></view><view v-if="data.cooperation.reason"><text>状态原因</text><text>{{ data.cooperation.reason }}</text></view></view></QualificationStatusCard><BaseCard><view class="authorization-title"><text>经营授权</text><text>按业务分别授权</text></view><view v-for="authorization in data.authorizations" :key="authorization.id" class="authorization-item"><view class="authorization-item__heading"><text>{{ authorization.businessType }}</text><StatusTag :tone="authorization.status === '有效' ? 'success' : 'pending'">{{ authorization.status }}</StatusTag></view><text>授权类目：{{ authorization.categories.join('、') }}</text><text>门店范围：{{ authorization.storeScope }}</text><text>授权期限：{{ authorization.period }}</text></view></BaseCard><view class="readonly-note">协议、项目合作与经营授权由平台维护；如状态或范围有疑问，请联系平台运营人员。</view></view>
  </AppPage>
</template>

<style scoped lang="scss">
.cooperation-page{gap:$space-3}.project-summary{display:flex;align-items:center;flex-wrap:wrap;gap:$space-2;padding:$space-4;border-radius:$radius-card;background:$color-primary-light}.project-summary text:first-child{color:$color-text-secondary;font-size:13px}.project-summary text:nth-child(2){flex:1;color:$color-primary;font-size:17px;font-weight:700}.detail-list>view{display:flex;min-height:44px;align-items:flex-start;justify-content:space-between;gap:$space-3;border-bottom:1px solid rgba(225,228,230,.72)}.detail-list>view:last-child{border:0}.detail-list text{padding:$space-2 0}.detail-list text:first-child{flex:none;color:$color-text-secondary}.detail-list text:last-child{text-align:right}.authorization-title{display:flex;align-items:center;justify-content:space-between;font-size:18px;font-weight:700}.authorization-title text:last-child{color:$color-text-secondary;font-size:12px;font-weight:400}.authorization-item{margin-top:$space-3;padding:$space-3;border-radius:$radius-md;background:$color-group-bg}.authorization-item__heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:$space-2;font-weight:700}.authorization-item>text{display:block;margin-top:2px;color:$color-text-secondary;font-size:13px}.readonly-note{padding:$space-3;border-radius:$radius-md;background:$color-warning-light;color:$color-warning;font-size:13px}
</style>
