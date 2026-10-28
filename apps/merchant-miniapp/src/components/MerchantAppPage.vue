<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
// Preserve the existing Merchant layout locally: the MP compiler cannot emit components outside src.
import SharedAppPage from './MerchantPageLayout.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import type { PageStatus } from '@/types/app'
import { merchantTabItems } from '@/config/navigation'
import { merchantIdentityPage, merchantOwnPagePath, merchantRestrictedTitle, merchantTabPath, MERCHANT_PROFILE_PATH } from '../services/merchant-route-guard'
import {stage1Enabled,useStage1} from '../services/stage1'
import {stage1PageAllowed} from '../services/stage1-route-guard'

withDefaults(defineProps<{
  status?: PageStatus
  stateMessage?: string
  secondary?: boolean
  withBottomAction?: boolean
}>(), { status: 'ready', stateMessage: '', secondary: false, withBottomAction: false })
const emit = defineEmits<{ retry: [] }>()
const component = getCurrentInstance()
const ownPath = ref('')
const business=useStage1()
const identityPage = computed(() => merchantIdentityPage(ownPath.value)||stage1Enabled&&stage1PageAllowed(ownPath.value,business.identity.state.identity?.identity,business.authority.context))
const tabPath = computed(() => merchantTabPath(ownPath.value))
const restrictedTitle = computed(() => merchantRestrictedTitle(ownPath.value))

function identifyPage() {
  // Capture only our confirmed page owner; transition timing cannot substitute a foreground safe page.
  if (ownPath.value) return
  ownPath.value = merchantOwnPagePath(component)
}
identifyPage()
onMounted(identifyPage)
onShow(identifyPage)
onShow(()=>{if(stage1Enabled)void business.refreshAuthority()})
const showIdentity = () => uni.redirectTo({ url: MERCHANT_PROFILE_PATH })
</script>

<template>
  <SharedAppPage v-if="identityPage" :status="status" :state-message="stateMessage" :secondary="secondary" :with-bottom-action="withBottomAction" @retry="emit('retry')">
    <template #navbar><slot name="navbar" /></template>
    <slot />
    <template #tabbar><slot name="tabbar" /></template>
  </SharedAppPage>
  <SharedAppPage v-else status="ready">
    <template #navbar><AppNavbar :title="restrictedTitle" compact /></template>
    <view class="merchant-scope-limit">
      <BaseCard>
        <text class="merchant-scope-limit__title">{{stage1Enabled?(business.authority.loading?'正在核对经营权限':'当前页面不可用'):'经营功能尚未开放'}}</text>
        <text class="merchant-scope-limit__copy">{{stage1Enabled?(business.authority.error||'请核对当前登录及页面所需权限。'):'当前可使用商户微信登录、查看本人身份及退出登录。'}}</text>
        <text v-if="!stage1Enabled" class="merchant-scope-limit__copy">开店申请、店铺管理和订单处理将在后续开放，当前店铺身份不代表这些操作已获授权。</text>
        <view class="merchant-scope-limit__action"><AppButton @click="showIdentity">查看我的身份</AppButton></view>
      </BaseCard>
    </view>
    <template #tabbar><AppTabbar :items="merchantTabItems" :active-path="tabPath" /></template>
  </SharedAppPage>
</template>

<style scoped lang="scss">
.merchant-scope-limit { padding: $space-4; padding-bottom: calc(env(safe-area-inset-bottom) + #{$tabbar-height} + #{$space-4}); }
.merchant-scope-limit__title { display: block; color: $color-text-primary; font-size: 17px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.merchant-scope-limit__copy { display: block; margin-top: $space-3; color: $color-text-secondary; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.merchant-scope-limit__action { margin-top: $space-4; }
.merchant-scope-limit__action :deep(.app-button) { min-height: $touch-target-min; height: auto; padding-top: $space-3; padding-bottom: $space-3; line-height: 1.5; white-space: normal; }
</style>
