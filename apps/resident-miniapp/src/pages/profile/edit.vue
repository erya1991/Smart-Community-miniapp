<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import FormField from '@/components/FormField.vue'
import { useResidentContext } from '@/stores/member'

const { state, loadProfile, saveProfile, changeAvatar, profileBasicOnly } = useResidentContext()
const nickname = ref('')
const originalNickname = ref('')
const version = ref<number | null>(null)
const nicknameError = ref('')
const localNotice = ref('')
const avatarFailed = ref(false)
const dirty = computed(() => nickname.value !== originalNickname.value)
const outdated = computed(() => version.value !== null && state.profile && version.value !== state.profile.version)

const fillLatestProfile = () => {
  if (!state.profile) return
  nickname.value = state.profile.nickname || ''
  originalNickname.value = nickname.value
  version.value = state.profile.version
  nicknameError.value = ''
}
const readProfile = async () => {
  await loadProfile()
  if (!dirty.value) fillLatestProfile()
}
const useLatestProfile = async () => {
  await loadProfile()
  if (!state.error && state.profile) {
    fillLatestProfile()
    localNotice.value = '已读取最新资料，请确认后再修改。'
  }
}
const confirmReload = () => {
  if (!dirty.value) { void useLatestProfile(); return }
  uni.showModal({
    title: '读取最新资料',
    content: '当前未保存的昵称将被最新资料替换。',
    confirmText: '读取最新',
    success: (result) => { if (result.confirm) void useLatestProfile() },
  })
}
const saveNickname = async () => {
  if (!state.authenticated || !state.profile || version.value === null || state.busy || state.loading) return
  localNotice.value = ''
  const value = nickname.value.normalize('NFKC').trim()
  if (Array.from(value).length < 1 || Array.from(value).length > 32 || !/^[\p{L}\p{N} _·.\-]+$/u.test(value)) {
    nicknameError.value = '请输入 1—32 个字，可使用文字、数字、空格及 _ · . -。'
    return
  }
  nicknameError.value = ''
  if (outdated.value) { localNotice.value = '资料已经更新，请先读取最新资料再确认修改。'; return }
  await saveProfile({ version: version.value, nickname: value })
  if (!state.error && state.profile) fillLatestProfile()
}
const selectAvatar = async () => {
  if (profileBasicOnly || state.busy || state.loading) return
  localNotice.value = ''
  if (dirty.value) { localNotice.value = '请先保存昵称或读取最新资料，再更换头像。'; return }
  if (outdated.value) { localNotice.value = '资料已经更新，请先读取最新资料再更换头像。'; return }
  await changeAvatar()
  if (!state.error && state.profile) fillLatestProfile()
}
const returnToProfile = () => {
  if (getCurrentPages().length > 1) uni.navigateBack({ delta: 1 })
  else uni.redirectTo({ url: '/pages/profile/index' })
}

watch(() => state.profile?.avatar, () => { avatarFailed.value = false })
watch(() => state.authenticated, (authenticated) => {
  if (!authenticated) {
    nickname.value = ''
    originalNickname.value = ''
    version.value = null
    nicknameError.value = ''
    localNotice.value = ''
  }
})
onShow(() => { void readProfile() })
</script>

<template>
  <AppPage secondary>
    <template #navbar><AppNavbar title="编辑本人资料" centered show-back /></template>
    <view class="stack profile-edit">
      <view v-if="state.loading" class="profile-edit__feedback" role="status">正在读取本人资料…</view>
      <view v-if="state.error || nicknameError" class="profile-edit__feedback profile-edit__feedback--error" role="alert">{{ nicknameError || state.error }}</view>
      <view v-if="state.notice" class="profile-edit__feedback" role="status">{{ state.notice }}</view>
      <view v-if="localNotice" class="profile-edit__feedback" role="status">{{ localNotice }}</view>

      <BaseCard v-if="!state.authenticated">
        <text class="profile-edit__title">请先登录</text>
        <text class="profile-edit__hint">登录后才能查看和修改本人资料。</text>
        <button class="profile-edit__button profile-edit__button--primary" @click="returnToProfile">返回我的，使用微信登录</button>
      </BaseCard>
      <BaseCard v-else-if="!state.profile">
        <text class="profile-edit__title">本人资料暂未获取</text>
        <text class="profile-edit__hint">请检查网络后重试。</text>
        <button class="profile-edit__button profile-edit__button--primary" :disabled="state.busy || state.loading" @click="readProfile">重试读取资料</button>
      </BaseCard>
      <template v-else>
        <BaseCard class="profile-edit__avatar-card">
          <view class="profile-edit__avatar-row">
            <view class="profile-edit__avatar">
              <image v-if="state.profile.avatar && !avatarFailed" :src="state.profile.avatar" mode="aspectFill" @error="avatarFailed = true" />
              <AppIcon v-else name="user" :size="34" />
            </view>
            <view class="profile-edit__avatar-copy">
              <text class="profile-edit__title">我的头像</text>
              <text class="profile-edit__hint">{{ profileBasicOnly ? '当前测试版暂不支持更换头像。' : '仅支持 JPEG / PNG，大小不超过 2 MiB。' }}</text>
            </view>
          </view>
          <button v-if="!profileBasicOnly" class="profile-edit__button profile-edit__button--secondary" :disabled="state.busy || state.loading" @click="selectAvatar">选择图片并保存头像</button>
          <text v-if="!profileBasicOnly" class="profile-edit__hint">上传与保存成功后才会更新头像。服务暂不可用时，原头像保持不变。</text>
        </BaseCard>

        <BaseCard>
          <FormField label="昵称" required hint="1—32 个字" :error="nicknameError">
            <input v-model="nickname" maxlength="64" placeholder="请输入昵称" :disabled="state.busy || state.loading" :cursor-spacing="24" confirm-type="done" @input="nicknameError = ''" />
          </FormField>
          <text class="profile-edit__hint">文字、数字、空格及 _ · . -；内容以服务端校验为准。</text>
        </BaseCard>

        <view v-if="outdated" class="profile-edit__feedback profile-edit__feedback--error">资料已经更新。请读取最新资料，再确认您的修改。</view>
        <button class="profile-edit__button profile-edit__button--primary" :disabled="state.busy || state.loading || !dirty || !!outdated || version === null" :loading="state.busy" @click="saveNickname">保存昵称</button>
        <button class="profile-edit__button profile-edit__button--secondary" :disabled="state.busy || state.loading" @click="confirmReload">读取最新资料</button>
      </template>
      <button class="profile-edit__button profile-edit__button--quiet" @click="returnToProfile">返回我的</button>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.profile-edit { gap: $space-3; }
.profile-edit__title { display: block; color: $color-text-primary; font-size: 17px; font-weight: 600; line-height: 1.5; }
.profile-edit__hint { display: block; margin-top: $space-2; color: $color-text-secondary; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.profile-edit__avatar-row { display: flex; align-items: center; gap: $space-3; }
.profile-edit__avatar { display: flex; width: 64px; height: 64px; flex: none; align-items: center; justify-content: center; overflow: hidden; border: 2px solid #c8d7d9; border-radius: 50%; background: $color-primary-light; }
.profile-edit__avatar image { width: 100%; height: 100%; }
.profile-edit__avatar-copy { flex: 1; min-width: 0; }
.profile-edit__button { box-sizing: border-box; display: flex; width: 100%; min-height: 48px; align-items: center; justify-content: center; margin: 0; padding: $space-3; border: 1px solid transparent; border-radius: $radius-md; font-size: 16px; font-weight: 600; line-height: 1.5; white-space: normal; }
.profile-edit__button::after { border: 0; }
.profile-edit__avatar-card .profile-edit__button { margin-top: $space-3; }
.profile-edit__button--primary { background: $color-primary; color: #fff; }
.profile-edit__button--secondary { border-color: $color-primary; background: #fff; color: $color-primary; }
.profile-edit__button--quiet { background: $color-primary-light; color: $color-primary; }
.profile-edit__button[disabled] { opacity: 0.5; }
.profile-edit__feedback { padding: $space-3; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; font-size: 15px; line-height: 1.6; overflow-wrap: anywhere; }
.profile-edit__feedback--error { background: $color-error-light; color: $color-error; }
</style>
