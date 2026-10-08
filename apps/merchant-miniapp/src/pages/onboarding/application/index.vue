<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import EvidenceUploader from '@/components/EvidenceUploader.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import StepProgress from '@/components/StepProgress.vue'
import StatusTag from '@/components/StatusTag.vue'
import { merchantSupplyService } from '@/services/supply'
import { openSubPage } from '@/utils/navigation'
import { validateApplication } from '@/features/supply/rules'
import type { FieldErrors, StoreApplication } from '@/features/supply/types'
import type { PageStatus } from '@/types/app'

const steps = ['经营主体', '联系人', '店铺信息', '补充资质', '确认提交']
const status = ref<PageStatus>('loading')
const stateMessage = ref('')
const form = ref<StoreApplication | null>(null)
const categories = ref<{ id: string; name: string }[]>([])
const errors = ref<FieldErrors>({})
const submitting = ref(false)
const editable = computed(() => Boolean(form.value && ['APPLY', 'REFUSED'].includes(form.value.storeStatus)))
const statusLabel = computed(() => ({ APPLY: '申请草稿', APPLYING: '审核中', REFUSED: '已驳回', OPEN: '已通过', CLOSED: '店铺已停用' }[form.value?.storeStatus || 'APPLY']))
const statusTone = computed(() => form.value?.storeStatus === 'OPEN' ? 'success' : form.value?.storeStatus === 'REFUSED' ? 'error' : 'pending')
type FileField = 'licenseImages' | 'legalIdImages' | 'storeLogo' | 'qualificationImages' | 'otherImages'

const load = async (preserve = false) => {
  if (!preserve) status.value = 'loading'
  stateMessage.value = ''
  try {
    const result = await merchantSupplyService.getApplication()
    form.value = result.application
    categories.value = result.categories
    status.value = 'ready'
  } catch (error) {
    stateMessage.value = error instanceof Error ? error.message : '申请资料加载失败，请重试'
    status.value = 'error'
  }
}
const chooseFile = (field: FileField) => {
  if (!editable.value || !form.value) return
  uni.chooseImage({ count: 1, sizeType: ['compressed'], success: result => {
    if (field === 'storeLogo') form.value!.storeLogo = [result.tempFilePaths[0]]
    else form.value![field].push(result.tempFilePaths[0])
  } })
}
const removeFile = (field: FileField, index: number) => { if (editable.value && form.value) form.value[field].splice(index, 1) }
const toggleCategory = (id: string) => {
  if (!editable.value || !form.value) return
  const ids = form.value.categoryIds
  form.value.categoryIds = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]
}
const validate = (all = false) => {
  if (!form.value) return false
  errors.value = validateApplication(form.value, all ? undefined : form.value.currentStep)
  if (all && Object.keys(errors.value).length) {
    const first = Object.keys(errors.value)[0]
    const groups = [
      ['subjectName', 'licenseNumber', 'licenseImages', 'legalScope', 'legalName', 'legalId', 'legalIdImages'],
      ['contactName', 'mobile', 'email'],
      ['storeName', 'storeLogo', 'description', 'storeAddress', 'longitude', 'latitude', 'categoryIds', 'storePhone'],
      ['qualificationImages'],
    ]
    form.value.currentStep = groups.findIndex(group => group.includes(first)) + 1
  }
  return !Object.keys(errors.value).length
}
const save = async () => {
  if (!form.value || !editable.value || submitting.value) return
  submitting.value = true
  stateMessage.value = ''
  try { form.value = await merchantSupplyService.saveApplication(form.value); uni.showToast({ title: '申请草稿已保存', icon: 'success' }) }
  catch (error) { stateMessage.value = error instanceof Error ? error.message : '保存失败，请重试' }
  finally { submitting.value = false }
}
const next = () => { if (form.value && (!editable.value || validate())) { form.value.currentStep = Math.min(5, form.value.currentStep + 1); errors.value = {} } }
const previous = () => { if (form.value) { form.value.currentStep = Math.max(1, form.value.currentStep - 1); errors.value = {} } }
const selectStep = (step: number) => { if (form.value && (!editable.value || step < form.value.currentStep)) form.value.currentStep = step }
const submit = async () => {
  if (!form.value || !editable.value || submitting.value || !validate(true)) return
  submitting.value = true
  stateMessage.value = ''
  try {
    const result = await uni.showModal({ title: '确认提交入驻审核？', content: '提交后主体资料将锁定，请等待平台审核。' })
    if (!result.confirm) return
    form.value = await merchantSupplyService.submitApplication(form.value)
    openSubPage('/pages/onboarding/result/index')
  } catch (error) { stateMessage.value = error instanceof Error ? error.message : '提交失败，请重试' }
  finally { submitting.value = false }
}
onLoad(() => load())
onShow(() => { if (form.value && !editable.value) load(true) })
</script>

<template>
  <AppPage :status="status" :state-message="stateMessage" secondary with-bottom-action @retry="load()">
    <template #navbar><AppNavbar title="商户入驻申请" centered show-back /></template>
    <view v-if="form" class="stack onboarding-page">
      <view class="application-card">
        <view><text class="application-card__name">{{ form.storeName || '准备入驻资料' }}</text><StatusTag :tone="statusTone">{{ statusLabel }}</StatusTag></view>
        <view class="application-card__tools"><text>{{ editable ? '草稿保存于 ' + form.savedAt : '申请资料只读，可查看各步骤' }}</text><view v-if="editable" class="save-hit" @click="save">{{ submitting ? '保存中' : '保存草稿' }}</view></view>
      </view>
      <view v-if="form.storeStatus === 'REFUSED'" class="notice notice--error"><text>上次申请被驳回</text><text>{{ form.rejectionReason }}</text></view>
      <view v-if="stateMessage || Object.keys(errors).length" class="notice notice--error"><text>{{ stateMessage || '请修正标记的字段后继续' }}</text></view>
      <StepProgress :steps="steps" :current="form.currentStep" :completed="editable ? form.currentStep - 1 : 5" @select="selectStep" />

      <FormSection v-if="form.currentStep === 1" title="步骤 1：经营主体" description="请填写与证照一致的主体信息">
        <FormField label="主体类型" required :readonly="!editable"><view class="choice-row"><view class="choice" :class="{ 'choice--active': form.subjectType === 'individual-business' }" @click="editable && (form.subjectType = 'individual-business')">个体工商户</view><view class="choice" :class="{ 'choice--active': form.subjectType === 'enterprise' }" @click="editable && (form.subjectType = 'enterprise')">企业 / 机构</view></view></FormField>
        <FormField label="主体名称" required :error="errors.subjectName" :readonly="!editable"><input v-model="form.subjectName" :disabled="!editable" maxlength="100" aria-label="主体名称" /></FormField>
        <FormField label="营业执照号" required hint="18位统一社会信用代码" :error="errors.licenseNumber" :readonly="!editable"><input v-model="form.licenseNumber" :disabled="!editable" maxlength="18" aria-label="营业执照号" /></FormField>
        <FormField label="营业执照" required :error="errors.licenseImages"><EvidenceUploader :files="form.licenseImages" :readonly="!editable" @add="chooseFile('licenseImages')" @remove="removeFile('licenseImages', $event)" /></FormField>
        <FormField label="法定经营范围" required :error="errors.legalScope" :readonly="!editable"><textarea v-model="form.legalScope" :disabled="!editable" maxlength="300" auto-height aria-label="法定经营范围" /></FormField>
        <FormField label="法人 / 经营者姓名" required :error="errors.legalName" :readonly="!editable"><input v-model="form.legalName" :disabled="!editable" maxlength="30" aria-label="法人经营者姓名" /></FormField>
        <FormField label="法人 / 经营者证件信息" required :error="errors.legalId" :readonly="!editable"><input v-model="form.legalId" :disabled="!editable" maxlength="40" aria-label="经营者证件信息" /></FormField>
        <FormField label="证件附件" required :error="errors.legalIdImages"><EvidenceUploader :files="form.legalIdImages" :readonly="!editable" @add="chooseFile('legalIdImages')" @remove="removeFile('legalIdImages', $event)" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 2" title="步骤 2：联系人" description="用于接收入驻审核和经营通知">
        <FormField label="联系人姓名" required :error="errors.contactName" :readonly="!editable"><input v-model="form.contactName" :disabled="!editable" maxlength="30" aria-label="联系人姓名" /></FormField>
        <FormField label="联系手机号" required :error="errors.mobile" :readonly="!editable"><input v-model="form.mobile" :disabled="!editable" type="number" maxlength="11" aria-label="联系手机号" /></FormField>
        <FormField label="电子邮箱" hint="选填" :error="errors.email" :readonly="!editable"><input v-model="form.email" :disabled="!editable" maxlength="100" aria-label="电子邮箱" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 3" title="步骤 3：店铺信息" description="填写对外展示与经营联系信息">
        <FormField label="店铺名称" required :error="errors.storeName" :readonly="!editable"><input v-model="form.storeName" :disabled="!editable" maxlength="50" aria-label="店铺名称" /></FormField>
        <FormField label="店铺 Logo" required :error="errors.storeLogo"><EvidenceUploader :files="form.storeLogo" :readonly="!editable" @add="chooseFile('storeLogo')" @remove="removeFile('storeLogo', $event)" /></FormField>
        <FormField label="店铺简介" required :error="errors.description" :readonly="!editable"><textarea v-model="form.description" :disabled="!editable" maxlength="300" auto-height aria-label="店铺简介" /></FormField>
        <FormField label="店铺地址" required :error="errors.storeAddress" :readonly="!editable"><textarea v-model="form.storeAddress" :disabled="!editable" maxlength="200" auto-height aria-label="店铺地址" /></FormField>
        <view class="coordinates"><FormField label="经度" required :error="errors.longitude" :readonly="!editable"><input v-model="form.longitude" type="digit" :disabled="!editable" aria-label="店铺经度" /></FormField><FormField label="纬度" required :error="errors.latitude" :readonly="!editable"><input v-model="form.latitude" type="digit" :disabled="!editable" aria-label="店铺纬度" /></FormField></view>
        <FormField label="经营类目" required :error="errors.categoryIds"><view class="chip-row"><view v-for="category in categories" :key="category.id" class="select-chip" :class="{ 'select-chip--active': form.categoryIds.includes(category.id) }" @click="toggleCategory(category.id)">{{ category.name }}</view></view></FormField>
        <FormField label="店铺联系电话" required :error="errors.storePhone" :readonly="!editable"><input v-model="form.storePhone" :disabled="!editable" maxlength="20" aria-label="店铺联系电话" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 4" title="步骤 4：补充资质" description="食品类目请提交必要经营资质，其他附件可选">
        <FormField label="必要补充资质" :required="form.categoryIds.includes('category-fresh') || form.categoryIds.includes('category-food')" :error="errors.qualificationImages"><EvidenceUploader :files="form.qualificationImages" :readonly="!editable" @add="chooseFile('qualificationImages')" @remove="removeFile('qualificationImages', $event)" /></FormField>
        <FormField label="其他附件" hint="选填"><EvidenceUploader :files="form.otherImages" :readonly="!editable" @add="chooseFile('otherImages')" @remove="removeFile('otherImages', $event)" /></FormField>
      </FormSection>

      <FormSection v-if="form.currentStep === 5" title="步骤 5：确认提交" description="审核通过只代表商户准入，请再次核对申请信息">
        <view class="summary-row"><text>主体</text><text>{{ form.subjectName }}</text></view>
        <view class="summary-row"><text>联系人</text><text>{{ form.contactName }} · {{ form.mobile }}</text></view>
        <view class="summary-row"><text>店铺</text><text>{{ form.storeName }}</text></view>
        <view class="summary-row"><text>地址</text><text>{{ form.storeAddress }}</text></view>
        <view class="summary-row"><text>经营类目</text><text>{{ categories.filter(category => form!.categoryIds.includes(category.id)).map(category => category.name).join('、') }}</text></view>
        <view class="qualification-note">商户审核通过后，还需合作协议、必要资质以及支付 / 分账关系满足条件，才能开展正式交易。</view>
      </FormSection>
    </view>
    <BottomActionBar v-if="form">
      <template v-if="!editable"><AppButton variant="secondary" @click="openSubPage('/pages/onboarding/result/index')">查看审核结果</AppButton><AppButton @click="openSubPage('/pages/qualification/status/index')">查看经营资格</AppButton></template>
      <template v-else><AppButton v-if="form.currentStep > 1" variant="secondary" :disabled="submitting" @click="previous">上一步</AppButton><AppButton v-else variant="secondary" :loading="submitting" @click="save">保存草稿</AppButton><AppButton v-if="form.currentStep < 5" :disabled="submitting" @click="next">下一步</AppButton><AppButton v-else :loading="submitting" @click="submit">提交审核</AppButton></template>
    </BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.onboarding-page { gap:$space-3; }
.application-card { padding:$space-4; border:1px solid rgba(27,77,83,.2); border-radius:$radius-card; background:$color-primary-light; }
.application-card > view { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:$space-2; }
.application-card__name { font-size:17px; font-weight:700; }
.application-card__tools { margin-top:$space-2; color:$color-text-secondary; font-size:13px; }
.save-hit { display:flex; min-height:44px; align-items:center; color:$color-primary; font-weight:600; }
.notice { padding:$space-3; border:1px solid rgba(186,26,26,.2); border-radius:$radius-md; background:$color-error-light; color:$color-error; font-size:14px; line-height:22px; }
.notice text { display:block; }
.choice-row,.chip-row { display:flex; flex-wrap:wrap; gap:$space-2; padding:$space-2 0; }
.choice { display:flex; min-height:44px; flex:1; align-items:center; justify-content:center; padding:0 $space-2; border:1px solid $color-border; border-radius:$radius-md; background:$color-card-bg; color:$color-text-secondary; }
.choice--active { border-color:$color-primary; background:$color-primary-light; color:$color-primary; font-weight:600; }
.select-chip { display:flex; min-height:44px; align-items:center; padding:0 $space-3; border-radius:999px; background:$color-card-bg; color:$color-text-secondary; }
.select-chip--active { background:$color-primary; color:#fff; }
.coordinates { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:$space-2; }
.summary-row { display:flex; align-items:flex-start; justify-content:space-between; gap:$space-3; min-height:44px; padding:$space-2 0; border-bottom:1px solid $color-border; }
.summary-row text:first-child { flex:none; color:$color-text-secondary; }
.summary-row text:last-child { flex:1; text-align:right; overflow-wrap:anywhere; }
.qualification-note { margin-top:$space-3; padding:$space-3; border-radius:$radius-md; background:$color-primary-light; color:$color-primary; font-size:13px; line-height:20px; }
.onboarding-page :deep(.step-progress__label) { white-space:normal; }
</style>
