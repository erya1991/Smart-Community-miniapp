<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import EvidenceUploader from '@/components/EvidenceUploader.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import StepProgress from '@/components/StepProgress.vue'
import StatusTag from '@/components/StatusTag.vue'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { openSubPage } from '@/utils/navigation'
import type { OperatorApplication } from '@/types/merchant-cooperation'
import type { PageStatus } from '@/types/app'

const steps = ['主体信息', '联系人与门店', '经营与资质', '确认提交']
const status = ref<PageStatus>('loading')
const stateMessage = ref('')
const form = ref<OperatorApplication | null>(null)
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const editable = computed(() => Boolean(form.value && ['draft', 'rejected'].includes(form.value.status)))
const statusLabel = computed(() => ({ draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已驳回' }[form.value?.status || 'draft']))
const statusTone = computed(() => form.value?.status === 'approved' ? 'success' : form.value?.status === 'rejected' ? 'error' : 'pending')

const load = async () => {
  status.value = 'loading'
  try {
    const result = await merchantCooperationService.getApplication()
    form.value = result.application
    status.value = 'ready'
  } catch (error) {
    stateMessage.value = error instanceof Error ? error.message : '申请资料加载失败'
    status.value = 'error'
  }
}

const chooseFile = (field: 'businessLicenseFiles' | 'otherQualificationFiles') => {
  if (!editable.value || !form.value) return
  uni.chooseImage({ count: 1, success: ({ tempFilePaths }) => {
    const path = tempFilePaths[0]
    form.value![field].push(path.split('/').pop() || '新上传图片.jpg')
  } })
}
const removeFile = (field: 'businessLicenseFiles' | 'otherQualificationFiles', index: number) => {
  if (editable.value && form.value) form.value[field].splice(index, 1)
}
const selectOption = (field: 'businessTypes' | 'categories', value: string) => {
  if (!editable.value || !form.value) return
  const values = form.value[field]
  form.value[field] = values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
const validateStep = (all = false) => {
  if (!form.value) return false
  const next: Record<string, string> = {}
  if ((all || form.value.currentStep === 1) && !form.value.subjectName.trim()) next.subjectName = '请填写与证照一致的主体名称'
  if ((all || form.value.currentStep === 1) && !/^([0-9A-Z]{18})$/.test(form.value.creditCode)) next.creditCode = '请输入18位统一社会信用代码'
  if ((all || form.value.currentStep === 1) && !form.value.businessLicenseFiles.length) next.license = '请上传营业执照'
  if ((all || form.value.currentStep === 2) && !form.value.contactName.trim()) next.contactName = '请填写联系人姓名'
  if ((all || form.value.currentStep === 2) && !/^1\d{10}$/.test(form.value.contactMobile)) next.contactMobile = '请输入11位手机号'
  if ((all || form.value.currentStep === 2) && !form.value.firstStoreName.trim()) next.firstStoreName = '请填写首个门店名称'
  if ((all || form.value.currentStep === 2) && !form.value.storeAddress.trim()) next.storeAddress = '请填写门店详细地址'
  if ((all || form.value.currentStep === 3) && !form.value.businessTypes.length) next.businessTypes = '请选择经营业务'
  if ((all || form.value.currentStep === 3) && !form.value.categories.length) next.categories = '请选择申请类目'
  errors.value = next
  return Object.keys(next).length === 0
}
const save = async () => {
  if (!form.value || submitting.value) return
  submitting.value = true
  try {
    form.value = await merchantCooperationService.saveApplication(form.value)
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (error) { uni.showModal({ title: '保存失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
  finally { submitting.value = false }
}
const next = () => {
  if (!form.value || !validateStep()) return
  form.value.currentStep = Math.min(4, form.value.currentStep + 1)
}
const previous = () => { if (form.value) form.value.currentStep = Math.max(1, form.value.currentStep - 1) }
const selectStep = (step: number) => { if (!editable.value && form.value) form.value.currentStep = step }
const submit = async () => {
  if (!form.value || submitting.value || !validateStep(true)) return
  const { confirm } = await uni.showModal({ title: '确认提交审核？', content: '提交后申请资料将锁定，需等待平台审核。' })
  if (!confirm) return
  submitting.value = true
  try {
    form.value = await merchantCooperationService.submitApplication(form.value)
    uni.showToast({ title: '已提交审核', icon: 'success' })
    setTimeout(() => openSubPage('/pages/onboarding/result/index'), 500)
  } catch (error) { uni.showModal({ title: '提交失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
  finally { submitting.value = false }
}

onLoad(load)
</script>

<template>
  <AppPage :status="status" :state-message="stateMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="商户入驻申请" centered show-back /></template>
    <view v-if="form" class="stack onboarding-page">
      <view class="project-card"><text class="project-card__label">申请入驻项目</text><text class="project-card__name">{{ form.projectName }}</text><view class="project-card__status"><StatusTag :tone="statusTone">{{ statusLabel }}</StatusTag><text>项目上下文只读，不等同于租户</text></view></view>
      <view v-if="form.status === 'rejected'" class="notice notice--error"><text>上次申请被驳回</text><text>{{ form.rejectionReason }}</text></view>
      <view v-else class="notice"><text>{{ editable ? `已自动载入草稿（${form.savedAt}）` : '当前申请资料为只读状态' }}</text></view>
      <StepProgress :steps="steps" :current="form.currentStep" :completed="editable ? form.currentStep - 1 : 4" @select="selectStep" />

      <FormSection v-if="form.currentStep === 1" title="步骤 1：主体信息" description="主体申请通过后才会形成正式经营主体">
        <FormField label="主体类型" required :readonly="!editable"><view class="choice-row"><view class="choice" :class="{ 'choice--active': form.subjectType === 'individual-business' }" @click="editable && (form.subjectType = 'individual-business')">个体工商户</view><view class="choice" :class="{ 'choice--active': form.subjectType === 'enterprise' }" @click="editable && (form.subjectType = 'enterprise')">企业 / 机构</view></view></FormField>
        <FormField label="主体名称" required hint="须与营业执照一致" :error="errors.subjectName" :readonly="!editable"><input v-model="form.subjectName" :disabled="!editable" maxlength="100" /></FormField>
        <FormField label="统一社会信用代码" required :error="errors.creditCode" :readonly="!editable"><input v-model="form.creditCode" :disabled="!editable" maxlength="18" /></FormField>
        <FormField label="法定代表人 / 经营者" required :readonly="!editable"><input v-model="form.legalRepresentative" :disabled="!editable" maxlength="30" /></FormField>
        <FormField label="注册地址" :readonly="!editable"><input v-model="form.registeredAddress" :disabled="!editable" maxlength="200" /></FormField>
        <FormField label="营业执照" required :error="errors.license"><EvidenceUploader :files="form.businessLicenseFiles" :readonly="!editable" @add="chooseFile('businessLicenseFiles')" @remove="removeFile('businessLicenseFiles', $event)" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 2" title="步骤 2：联系人与首个门店" description="门店是经营与履约场所，不是独立资格主体">
        <FormField label="联系人姓名" required :error="errors.contactName" :readonly="!editable"><input v-model="form.contactName" :disabled="!editable" maxlength="30" /></FormField>
        <FormField label="联系手机号" required :error="errors.contactMobile" :readonly="!editable"><input v-model="form.contactMobile" :disabled="!editable" type="number" maxlength="11" /></FormField>
        <FormField label="首个门店名称" required :error="errors.firstStoreName" :readonly="!editable"><input v-model="form.firstStoreName" :disabled="!editable" maxlength="50" /></FormField>
        <FormField label="门店详细地址" required :error="errors.storeAddress" :readonly="!editable"><textarea v-model="form.storeAddress" :disabled="!editable" maxlength="200" auto-height /></FormField>
        <FormField label="营业时间" :readonly="!editable"><input v-model="form.businessHours" :disabled="!editable" placeholder="例如 08:00-20:00" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 3" title="步骤 3：经营与资质资料" description="经营业务与类目为申请意向，最终以项目授权为准">
        <FormField label="经营业务" required :error="errors.businessTypes"><view class="chip-row"><view v-for="item in ['商城', '社区服务']" :key="item" class="select-chip" :class="{ 'select-chip--active': form.businessTypes.includes(item) }" @click="selectOption('businessTypes', item)">{{ item }}</view></view></FormField>
        <FormField label="申请类目" required :error="errors.categories"><view class="chip-row"><view v-for="item in ['生鲜果蔬', '米面粮油', '日用百货', '家电清洗']" :key="item" class="select-chip" :class="{ 'select-chip--active': form.categories.includes(item) }" @click="selectOption('categories', item)">{{ item }}</view></view></FormField>
        <FormField label="其他资质" hint="按申请类目提交"><EvidenceUploader :files="form.otherQualificationFiles" :readonly="!editable" @add="chooseFile('otherQualificationFiles')" @remove="removeFile('otherQualificationFiles', $event)" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 4" title="步骤 4：确认提交" description="请核对申请资料；平台审核通过仅代表主体准入">
        <view class="summary-row"><text>申请项目</text><text>{{ form.projectName }}</text></view><view class="summary-row"><text>主体</text><text>{{ form.subjectName }}</text></view><view class="summary-row"><text>首个门店</text><text>{{ form.firstStoreName }}</text></view><view class="summary-row"><text>经营意向</text><text>{{ form.businessTypes.join('、') }}</text></view><view class="summary-row"><text>申请类目</text><text>{{ form.categories.join('、') }}</text></view>
        <view class="qualification-note">审核通过后，仍需协议、项目合作、必要资质和经营授权共同满足，才能形成业务经营资格；资金能力另行决定正式交易资格。</view>
      </FormSection>
    </view>

    <BottomActionBar v-if="form">
      <AppButton v-if="!editable" @click="openSubPage('/pages/onboarding/result/index')">查看审核结果</AppButton>
      <template v-else><AppButton v-if="form.currentStep > 1" variant="secondary" @click="previous">上一步</AppButton><AppButton v-else variant="secondary" :loading="submitting" @click="save">保存草稿</AppButton><AppButton v-if="form.currentStep < 4" @click="next">下一步</AppButton><AppButton v-else :loading="submitting" @click="submit">提交审核</AppButton></template>
    </BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.onboarding-page { gap: $space-3; }
.project-card { padding: $space-4; border: 1px solid rgba(27, 77, 83, 0.2); border-radius: $radius-card; background: $color-primary-light; }
.project-card__label, .project-card__name { display: block; }
.project-card__label { color: $color-text-secondary; font-size: 13px; }
.project-card__name { margin-top: 2px; color: $color-primary; font-size: 19px; font-weight: 700; }
.project-card__status { display: flex; align-items: center; flex-wrap: wrap; gap: $space-2; margin-top: $space-2; color: $color-text-secondary; font-size: 13px; }
.notice { padding: $space-3; border: 1px solid rgba(199, 106, 34, 0.22); border-radius: $radius-md; background: $color-warning-light; color: $color-warning; font-size: 14px; }
.notice text { display: block; }
.notice--error { border-color: rgba(186, 26, 26, 0.2); background: $color-error-light; color: $color-error; }
.choice-row, .chip-row { display: flex; flex-wrap: wrap; gap: $space-2; padding: $space-2 0; }
.choice { display: flex; min-height: 44px; flex: 1; align-items: center; justify-content: center; padding: 0 $space-3; border: 1px solid $color-border; border-radius: $radius-md; background: #fff; color: $color-text-secondary; }
.choice--active { border-color: $color-primary; background: $color-primary-light; color: $color-primary; font-weight: 600; }
.select-chip { display: flex; min-height: 44px; align-items: center; padding: 0 $space-3; border-radius: 999px; background: #fff; color: $color-text-secondary; }
.select-chip--active { background: $color-primary; color: #fff; }
.summary-row { display: flex; align-items: flex-start; justify-content: space-between; gap: $space-3; min-height: 44px; padding: $space-2 0; border-bottom: 1px solid rgba(225, 228, 230, 0.72); }
.summary-row text:first-child { color: $color-text-secondary; }
.summary-row text:last-child { flex: 1; text-align: right; }
.qualification-note { padding: $space-3; border-radius: $radius-md; background: $color-primary-light; color: $color-primary; font-size: 13px; }
</style>
