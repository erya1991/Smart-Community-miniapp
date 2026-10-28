<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import IconContainer from '@/components/IconContainer.vue'
import { useMerchantContext } from '../stores/merchant-context'
import {stage1Enabled} from '../adapters/stage1-http'
const openApplication=()=>uni.navigateTo({url:'/pages/onboarding/application/index'})

const { state, isWechat, loginMerchant, loadIdentity, logout } = useMerchantContext()
const showApplicationExplanation = ref(false)
const identity = computed(() => state.identity)
const title = computed(() => {
  if (state.busy) return state.activity === 'logout' ? '正在退出登录' : '正在验证微信身份'
  if (state.loading) return '正在核实当前身份'
  if (identity.value?.identity === 'APPLICANT') return '已完成个人身份认证'
  if (identity.value?.identity === 'STORE') return identity.value.storeName
  if (state.errorCode === 'PROOF_SOURCE_PENDING') return '经营身份暂待核验'
  if (['RELATION_CONFLICT', 'IDENTITY_CONFLICT'].includes(state.errorCode)) return '身份关系需要确认'
  if (['SESSION_REJECTED', 'SESSION_REQUIRED', 'DENIED'].includes(state.errorCode)) return '登录或授权已失效'
  if (state.error) return '登录服务暂不可用'
  return '登录您的商户身份'
})
const label = computed(() => identity.value?.identity === 'STORE'
  ? identity.value.role === 'OWNER' ? '负责人' : '工作人员'
  : identity.value?.identity === 'APPLICANT' ? '申请人 · 受限身份' : '未登录')
const reading = computed(() => state.loading || state.busy)
</script>

<template>
  <BaseCard class="merchant-identity-panel">
    <view class="merchant-identity-panel__header">
      <IconContainer icon="shop" size="lg" />
      <view class="merchant-identity-panel__copy">
        <text class="merchant-identity-panel__title">{{ title }}</text>
        <StatusTag :tone="identity ? 'success' : state.error ? 'error' : 'disabled'">{{ reading ? '正在核实' : label }}</StatusTag>
      </view>
    </view>

    <view v-if="identity?.identity === 'APPLICANT'" class="merchant-identity-panel__details">
      <text class="merchant-identity-panel__body">当前尚无可使用的经营身份。</text>
      <text class="merchant-identity-panel__hint">{{stage1Enabled?'可以填写入驻申请，或接受负责人发送的工作人员邀请。':'您可以查看本人身份和申请开店入口说明，当前不会创建店铺或工作人员授权。'}}</text>
      <AppButton variant="secondary" :disabled="reading" @click="stage1Enabled?openApplication():showApplicationExplanation = true">申请开店</AppButton>
      <text v-if="showApplicationExplanation" class="merchant-identity-panel__hint">申请服务尚未开放，当前不会提交入驻申请。</text>
    </view>
    <view v-else-if="identity?.identity === 'STORE'" class="merchant-identity-panel__details">
      <view class="merchant-identity-panel__row"><text>当前角色</text><text>{{ identity.role === 'OWNER' ? '负责人' : '工作人员' }}</text></view>
      <view class="merchant-identity-panel__row"><text>当前店铺</text><text>{{ identity.storeName }}</text></view>
      <text class="merchant-identity-panel__hint">{{stage1Enabled?'店铺及身份已由服务端核实，经营操作仍按当前授权逐项校验。':'当前店铺与角色已由服务端核实。本页仅提供身份查看，经营功能尚未开放。'}}</text>
    </view>
    <view v-else class="merchant-identity-panel__details">
      <text class="merchant-identity-panel__body">使用商户小程序微信身份登录，读取本人或已授权的当前店铺。</text>
      <text v-if="!isWechat" class="merchant-identity-panel__hint">请在微信小程序中使用微信登录，网页预览不能完成身份认证。</text>
    </view>

    <view v-if="state.error" class="merchant-identity-panel__feedback merchant-identity-panel__feedback--error" role="alert"><text>{{ state.error }}</text></view>
    <view v-if="state.notice" class="merchant-identity-panel__feedback"><text>{{ state.notice }}</text></view>

    <view class="merchant-identity-panel__actions">
      <AppButton v-if="!state.authenticated" :disabled="!isWechat || reading" :loading="state.activity === 'login'" @click="loginMerchant">{{ state.error ? '重新微信登录' : '微信登录' }}</AppButton>
      <AppButton v-if="state.sessionAvailable" variant="secondary" :disabled="reading" :loading="state.loading" @click="loadIdentity">重新核实身份</AppButton>
      <AppButton v-if="state.sessionAvailable || state.activity === 'login'" variant="quiet" :disabled="state.activity === 'logout'" @click="logout">退出本设备登录</AppButton>
    </view>
  </BaseCard>
</template>

<style scoped lang="scss">
.merchant-identity-panel { min-width: 0; }
.merchant-identity-panel__header { display: flex; align-items: center; gap: $space-3; min-height: 72px; }
.merchant-identity-panel__copy { flex: 1; min-width: 0; }
.merchant-identity-panel__title { display: block; margin-bottom: $space-2; color: $color-text-primary; font-size: 17px; font-weight: 700; line-height: 1.6; overflow-wrap: anywhere; }
.merchant-identity-panel__details { display: flex; flex-direction: column; gap: $space-3; margin-top: $space-3; }
.merchant-identity-panel__body { color: $color-text-primary; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
.merchant-identity-panel__hint { color: $color-text-secondary; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.merchant-identity-panel__row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: $space-2; min-height: 44px; padding: $space-2 0; border-bottom: 1px solid $color-border; font-size: 15px; }
.merchant-identity-panel__row > text:first-child { flex: none; color: $color-text-secondary; }
.merchant-identity-panel__row > text:last-child { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
.merchant-identity-panel__feedback { margin-top: $space-3; padding: $space-3; border-radius: $radius-sm; background: $color-primary-light; color: $color-primary; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
.merchant-identity-panel__feedback--error { background: $color-error-light; color: $color-error; }
.merchant-identity-panel__actions { display: flex; flex-direction: column; gap: $space-3; margin-top: $space-4; }
</style>
