<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import StatusTag from '@/components/StatusTag.vue'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { useMerchantContext } from '@/stores/merchant-context'
import type { OperatorProfile } from '@/types/merchant-cooperation'
import type { PageStatus } from '@/types/app'

const { permissions } = useMerchantContext()
const status = ref<PageStatus>('loading')
const stateMessage = ref('')
const profile = ref<OperatorProfile | null>(null)
const saving = ref(false)
const canEdit = computed(() => permissions.value.canEdit && profile.value?.status === 'normal')
const load = async () => { status.value = 'loading'; try { profile.value = await merchantCooperationService.getOperatorProfile(); status.value = 'ready' } catch (error) { stateMessage.value = error instanceof Error ? error.message : '资料加载失败'; status.value = 'error' } }
const save = async () => {
  if (!profile.value || !canEdit.value || saving.value) return
  if (!profile.value.contactName.trim() || !/^1\d{10}$/.test(profile.value.contactMobile)) { uni.showModal({ title: '请检查资料', content: '联系人姓名和11位联系手机号不能为空。', showCancel: false }); return }
  saving.value = true
  try { profile.value = await merchantCooperationService.updateOperatorProfile(profile.value); uni.showToast({ title: '资料已保存', icon: 'success' }) }
  catch (error) { uni.showModal({ title: '保存失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
  finally { saving.value = false }
}
onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="stateMessage" secondary :with-bottom-action="canEdit" @retry="load">
    <template #navbar><AppNavbar title="基本资料" centered show-back /></template>
    <view v-if="profile" class="stack basic-page">
      <view class="subject-status"><view><text class="subject-status__name">{{ profile.subjectName }}</text><text class="subject-status__code">主体编码 {{ profile.code }}</text></view><StatusTag :tone="profile.status === 'normal' ? 'success' : 'error'">{{ profile.status === 'normal' ? '正常' : profile.status === 'suspended' ? '暂停' : '退出' }}</StatusTag></view>
      <view v-if="profile.statusReason" class="status-warning">{{ profile.statusReason }}</view>
      <FormSection title="主体核心资料" description="核心法定字段只读，如需变更请联系平台">
        <FormField label="主体类型" readonly><input :value="profile.subjectType" disabled /></FormField>
        <FormField label="主体名称" readonly><input :value="profile.subjectName" disabled /></FormField>
        <FormField label="统一社会信用代码" readonly><input :value="profile.creditCodeMasked" disabled /></FormField>
        <FormField label="法定代表人 / 经营者" readonly><input :value="profile.legalRepresentativeMasked" disabled /></FormField>
        <FormField label="建档时间" readonly><input :value="profile.createdAt" disabled /></FormField>
      </FormSection>
      <FormSection title="联系资料" :description="canEdit ? '商户负责人可维护，修改后同步平台' : '当前账号为只读权限'">
        <FormField label="主要联系人" required :readonly="!canEdit"><input v-model="profile.contactName" :disabled="!canEdit" maxlength="30" /></FormField>
        <FormField label="联系电话" required :readonly="!canEdit"><input v-model="profile.contactMobile" :disabled="!canEdit" type="number" maxlength="11" /></FormField>
        <FormField label="注册地址" :readonly="!canEdit"><textarea v-model="profile.registeredAddress" :disabled="!canEdit" maxlength="200" auto-height /></FormField>
      </FormSection>
    </view>
    <BottomActionBar v-if="canEdit"><AppButton :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存资料' }}</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.basic-page { gap: $space-3; }
.subject-status { display: flex; align-items: center; justify-content: space-between; gap: $space-3; padding: $space-4; border-radius: $radius-card; background: $color-primary-light; }
.subject-status__name, .subject-status__code { display: block; }.subject-status__name { color: $color-primary; font-size: 19px; font-weight: 700; }.subject-status__code { margin-top: 2px; color: $color-text-secondary; font-size: 13px; }
.status-warning { padding: $space-3; border-radius: $radius-md; background: $color-error-light; color: $color-error; }
</style>
