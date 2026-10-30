<script setup lang="ts">
import { ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import BaseCard from '@/components/BaseCard.vue'
import FeatureUnavailable from '@/components/FeatureUnavailable.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import IconContainer from '@/components/IconContainer.vue'
import { stage2Enabled } from '@/adapters/stage2-http'
import { appAdapter } from '@/adapters/mock'
import { openPage, openSubPage } from '@/utils/navigation'
import { residentTabItems } from '@/config/navigation'
import { useResidentContext } from '@/stores/member'
import type { ProfileGroupSummary, ProfileItemSummary } from '@/types/app'

type ProfileItem = ProfileItemSummary

const { state, loadProfile, loginBasic, authorizePhone, logout, confirmExistingLink, isWechat } = useResidentContext()
const groups = ref<ProfileGroupSummary[]>([])
const navigationError = ref(false)
const avatarFailed = ref(false)
const showUnavailable = ref(false)
const loadNavigation = async () => {
  navigationError.value = false
  try {
    // Keep the existing demonstration navigation, never its mock member or personal facts.
    const navigation = await appAdapter.getResidentProfile()
    groups.value = navigation.groups.map((group) => ({
      title: group.title,
      type: group.type,
      items: group.items.map(({ label, icon, actionText, tone, path, available }) => ({ label, icon, actionText, tone, path, available })),
    }))
    if (stage2Enabled) groups.value = [{ title: '我的交易', type: 'list', items: [{ label: '待处理交易与原提交', icon: 'order', path: '/pages/mall/pending/index', available: true }] }, ...groups.value.filter(g => g.type !== 'orders')]
  } catch {
    navigationError.value = true
  }
}
const handleEntry = (item: ProfileItem) => {
  if (item.available && item.path) {
    openPage(stage2Enabled && item.path.startsWith('/pages/mall/order-') ? '/pages/mall/pending/index' : item.path)
    return
  }
  showUnavailable.value = true
}
const editProfile = () => {
  if (state.authenticated && state.profile && !state.busy) openSubPage('/pages/profile/edit')
}
const phoneAuthorized = (event: { detail?: { code?: string; errMsg?: string } }) => {
  const detail = event.detail
  const cancelled = !detail?.errMsg || /deny|cancel/i.test(detail.errMsg)
  void authorizePhone(detail?.code, cancelled ? 'cancelled' : 'failed')
}
const reviewExistingLink = () => {
  uni.showModal({
    title: '关联已有账号',
    content: '关联前需要核验旧账号归属。继续后仅查看核验状态，不会更改当前账号或历史资料。',
    confirmText: '继续查看',
    success: (result) => { if (result.confirm) void confirmExistingLink() },
  })
}
const confirmLogout = () => {
  uni.showModal({
    title: '退出本设备登录',
    content: '退出后，查看或修改本人资料需要重新微信登录。',
    confirmText: '退出登录',
    success: (result) => { if (result.confirm) void logout() },
  })
}

watch(() => state.profile?.avatar, () => { avatarFailed.value = false })
onLoad(loadNavigation)
onShow(() => { void loadProfile() })
</script>

<template>
  <AppPage>
    <template #navbar><AppNavbar title="我的" centered /></template>
    <view class="stack profile-stack">
      <BaseCard class="profile-identity">
        <view class="profile-identity__decor" />
        <view class="profile-identity__main" :aria-label="state.authenticated ? '编辑本人资料' : '微信登录'" @click="editProfile">
          <view class="profile-summary__avatar">
            <image v-if="state.authenticated && state.profile?.avatar && !avatarFailed" class="profile-summary__image" :src="state.profile.avatar" mode="aspectFill" @error="avatarFailed = true" />
            <AppIcon v-else name="user" :size="34" />
          </view>
          <view class="profile-summary__copy">
            <view class="profile-summary__title">
              <text class="profile-summary__name">{{ state.authenticated ? (state.profile?.nickname || '我的资料') : '欢迎来到大光路' }}</text>
              <text v-if="state.authenticated" class="profile-summary__role">住户账号</text>
            </view>
            <view v-if="state.authenticated && state.profile" class="profile-summary__mobile"><AppIcon name="message" :size="14" /><text>{{ state.profile.phoneBound ? state.profile.maskedMobile : '手机号未绑定' }}</text></view>
            <text v-else class="profile-summary__hint">{{ state.authenticated ? '本人资料暂未获取' : '登录后查看和管理本人资料' }}</text>
            <text v-if="state.loading" class="profile-summary__hint" role="status">正在读取本人资料…</text>
            <text v-else-if="state.authenticated && state.profile" class="profile-summary__hint">点击编辑昵称与头像</text>
          </view>
          <view v-if="state.authenticated && state.profile" class="profile-identity__arrow"><AppIcon name="chevron-right" :size="17" /></view>
        </view>
        <view v-if="!state.authenticated" class="profile-actions">
          <!-- #ifdef MP-WEIXIN -->
          <button class="profile-button profile-button--primary" open-type="getPhoneNumber" :disabled="state.busy || state.loading" :loading="state.busy" @getphonenumber="phoneAuthorized">微信手机号快捷登录</button>
          <button class="profile-button profile-button--secondary" :disabled="state.busy || state.loading" @click="loginBasic">暂不绑定手机号，使用微信基本登录</button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <button class="profile-button profile-button--primary" disabled>微信手机号快捷登录</button>
          <button class="profile-button profile-button--secondary" disabled>微信基本登录</button>
          <!-- #endif -->
          <text class="profile-note">手机号由您主动授权；不绑定也可使用基本登录。</text>
        </view>
        <view v-else-if="state.profile" class="profile-phone-action">
          <!-- #ifdef MP-WEIXIN -->
          <button class="profile-button profile-button--secondary" open-type="getPhoneNumber" :disabled="state.busy || state.loading" :loading="state.busy" @getphonenumber="phoneAuthorized">{{ state.profile.phoneBound ? '更换微信手机号' : '绑定微信手机号' }}</button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <button class="profile-button profile-button--secondary" disabled>请在微信小程序中授权手机号</button>
          <!-- #endif -->
        </view>
        <text v-if="!isWechat" class="profile-note">当前环境不支持微信登录和手机号授权，请在微信小程序中使用。</text>
      </BaseCard>

      <view v-if="state.error" class="profile-feedback profile-feedback--error" role="alert">
        <text>{{ state.error }}</text>
        <button v-if="state.authenticated" class="profile-button profile-button--quiet" :disabled="state.busy || state.loading" @click="loadProfile">重新读取本人资料</button>
      </view>
      <view v-if="state.notice" class="profile-feedback" role="status">{{ state.notice }}</view>
      <BaseCard v-if="state.linkRequired" class="profile-link">
        <text class="profile-link__title">关联已有账号</text>
        <text class="profile-note">该手机号需要先核验已有账号归属。当前账号与资料保持不变，您可以继续使用基本登录。</text>
        <button class="profile-button profile-button--secondary" :disabled="state.busy" @click="reviewExistingLink">查看关联条件</button>
      </BaseCard>
      <button v-if="state.authenticated" class="profile-button profile-button--quiet" :disabled="state.busy" @click="confirmLogout">退出本设备登录</button>

      <view class="profile-demo-note">{{ stage2Enabled ? '待处理交易可找回尚未完成或需要核验的模拟交易；其他社区服务为演示入口。' : '以下订单、服务和社区入口为演示功能，不展示本人的真实业务记录。' }}</view>
      <view v-if="navigationError" class="profile-feedback profile-feedback--error">
        <text>演示入口加载失败，不影响本人资料。</text>
        <button class="profile-button profile-button--quiet" @click="loadNavigation">重试入口</button>
      </view>
      <template v-for="group in groups" :key="group.title">
        <BaseCard v-if="group.type === 'orders'" class="profile-orders">
          <SectionHeader title="我的订单" action-text="全部订单" @action="openPage('/pages/mall/order-list/index')" />
          <view class="profile-order-grid">
            <view v-for="item in group.items" :key="item.label" class="profile-order-entry" hover-class="profile-entry--pressed" @click="handleEntry(item)">
              <view class="profile-order-icon-wrap"><IconContainer :icon="item.icon" size="sm" /></view>
              <text>{{ item.label }}</text>
            </view>
          </view>
        </BaseCard>

        <BaseCard v-else-if="group.type === 'service'" class="profile-service" hover-class="profile-card--pressed" @click="handleEntry(group.items[0])">
          <view class="profile-service__icon"><IconContainer :icon="group.items[0].icon" size="sm" /></view>
          <view class="profile-service__copy"><text class="profile-service__title">我的服务</text><text class="profile-service__description">服务功能演示入口</text></view>
          <view class="profile-service__action">{{ group.items[0].actionText }} <AppIcon name="chevron-right" :size="13" /></view>
        </BaseCard>

        <BaseCard v-else-if="group.type === 'tiles'" class="profile-tiles">
          <SectionHeader :title="group.title" />
          <view class="profile-tile-grid">
            <view v-for="item in group.items" :key="item.label" class="profile-tile" hover-class="profile-entry--pressed" @click="handleEntry(item)">
              <IconContainer :icon="item.icon" :tone="item.tone || 'teal'" size="sm" />
              <view class="profile-tile__copy"><text class="profile-tile__label">{{ item.label }}</text><text class="profile-tile__description">功能演示入口</text></view>
            </view>
          </view>
        </BaseCard>

        <BaseCard v-else-if="group.type === 'list'" class="profile-list" :padded="false">
          <view v-for="item in group.items" :key="item.label" class="profile-list__row" hover-class="profile-list__row--pressed" @click="handleEntry(item)">
            <IconContainer :icon="item.icon" :tone="item.tone || 'teal'" size="sm" />
            <text class="profile-list__label">{{ item.label }}</text>
            <AppIcon name="chevron-right" :size="15" />
          </view>
        </BaseCard>
      </template>

      <view class="profile-footer">大光路智慧社区便民服务</view>
    </view>
    <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
    <template #tabbar><AppTabbar :items="residentTabItems" active-path="/pages/profile/index" /></template>
  </AppPage>
</template>

<style scoped lang="scss">
.profile-stack { gap: $space-3; }
.profile-identity { position: relative; overflow: hidden; }
.profile-identity__decor { position: absolute; top: -32px; right: -30px; width: 112px; height: 112px; border-radius: 50%; background: rgba(27, 77, 83, 0.05); }
.profile-identity__main { position: relative; display: flex; min-height: 104px; align-items: center; gap: $space-3; }
.profile-summary__avatar { display: flex; width: 64px; height: 64px; flex: none; align-items: center; justify-content: center; border: 2px solid #c8d7d9; border-radius: 50%; background: $color-primary-light; color: $color-primary; }
.profile-summary__copy { flex: 1; min-width: 0; }
.profile-summary__title { display: flex; align-items: center; flex-wrap: wrap; gap: $space-2; }
.profile-summary__name { overflow-wrap: anywhere; font-size: 19px; font-weight: 700; }
.profile-summary__role { padding: 2px $space-2; border-radius: 999px; background: $color-primary-light; color: $color-primary; font-size: 12px; }
.profile-summary__mobile, .profile-summary__location { display: flex; align-items: center; gap: 4px; margin-top: $space-1; color: $color-text-secondary; font-size: 14px; }
.profile-summary__mobile image { opacity: 0.76; }
.profile-summary__location { width: fit-content; padding: 2px $space-2; border-radius: $radius-sm; background: $color-primary-light; color: $color-primary; font-size: 13px; }
.profile-identity__arrow { display: flex; width: 44px; height: 44px; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: $color-group-bg; }
.profile-summary__avatar { overflow: hidden; }
.profile-summary__image { width: 100%; height: 100%; }
.profile-summary__hint { display: block; margin-top: $space-1; color: $color-text-secondary; font-size: 14px; line-height: 1.5; }
.profile-actions, .profile-link { display: flex; flex-direction: column; gap: $space-2; }
.profile-phone-action { margin-top: $space-2; }
.profile-button { box-sizing: border-box; display: flex; width: 100%; min-height: 48px; align-items: center; justify-content: center; margin: 0; padding: $space-3; border: 1px solid transparent; border-radius: $radius-md; font-size: 15px; font-weight: 600; line-height: 1.5; white-space: normal; }
.profile-button::after { border: 0; }
.profile-button--primary { background: $color-primary; color: #fff; }
.profile-button--secondary { border-color: $color-primary; background: #fff; color: $color-primary; }
.profile-button--quiet { background: $color-primary-light; color: $color-primary; }
.profile-button[disabled] { opacity: 0.5; }
.profile-note { display: block; margin-top: $space-2; color: $color-text-secondary; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.profile-feedback { display: flex; flex-direction: column; gap: $space-2; padding: $space-3; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; font-size: 15px; line-height: 1.6; overflow-wrap: anywhere; }
.profile-feedback--error { background: $color-error-light; color: $color-error; }
.profile-link__title { font-size: 17px; font-weight: 600; }
.profile-demo-note { padding: $space-2 0; color: $color-text-secondary; font-size: 13px; line-height: 1.6; }
.profile-orders :deep(.section-header), .profile-tiles :deep(.section-header) { min-height: 40px; border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.profile-orders :deep(.section-header__title), .profile-tiles :deep(.section-header__title) { font-size: 17px; font-weight: 600; }
.profile-order-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: $space-1; padding-top: $space-3; }
.profile-order-entry { position: relative; display: flex; min-width: 0; min-height: 82px; align-items: center; flex-direction: column; gap: $space-1; padding: $space-1 0; color: $color-text-primary; font-size: 12px; text-align: center; }
.profile-order-icon-wrap { position: relative; }
.profile-service { display: flex; min-height: 96px; align-items: center; gap: $space-3; }
.profile-service__copy { flex: 1; min-width: 0; }
.profile-service__title, .profile-service__description { display: block; }
.profile-service__title { font-size: 17px; font-weight: 600; }
.profile-service__description { margin-top: 2px; color: $color-text-secondary; font-size: 13px; }
.profile-service__action { display: flex; min-height: 36px; align-items: center; gap: 2px; padding: 0 $space-2; border-radius: $radius-md; background: rgba(234, 242, 243, 0.72); color: $color-primary; font-size: 13px; font-weight: 500; }
.profile-tile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: $space-2; padding-top: $space-3; }
.profile-tile { display: flex; min-width: 0; align-items: center; gap: $space-2; padding: $space-3; border-radius: $radius-md; background: $color-group-bg; }
.profile-tile__copy { min-width: 0; }
.profile-tile__label, .profile-tile__description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-tile__label { font-size: 14px; font-weight: 600; }
.profile-tile__description { margin-top: 2px; color: $color-text-secondary; font-size: 12px; }
.profile-list__row { display: flex; min-height: 60px; align-items: center; gap: $space-3; padding: $space-2 $space-4; border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.profile-list__row:last-child { border-bottom: 0; }
.profile-list__row--pressed, .profile-entry--pressed, .profile-card--pressed { opacity: 0.72; }
.profile-list__label { flex: 1; min-width: 0; font-size: 15px; }
.profile-footer { padding: $space-2 0 $space-3; color: $color-text-disabled; font-size: 12px; text-align: center; }
</style>
