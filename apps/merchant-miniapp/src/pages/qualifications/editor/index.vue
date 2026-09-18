<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import EvidenceUploader from '@/components/EvidenceUploader.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { useMerchantContext } from '@/stores/merchant-context'
import type { QualificationRecord } from '@/types/merchant-cooperation'
import type { PageStatus } from '@/types/app'

const { currentOperator, permissions } = useMerchantContext()
const status = ref<PageStatus>('loading')
const stateMessage = ref('')
const isEdit = ref(false)
const saving = ref(false)
const form = ref<QualificationRecord>({ id: '', operatorId: currentOperator.value?.id || '', holderType: 'operator', holderName: currentOperator.value?.name || '', type: '', certificateNo: '', certificateNoMasked: '', effectiveDate: '', expiryDate: '', businessTypes: [], categories: [], files: [], status: 'pending', reviewStatus: 'pending', updatedAt: '' })
const goBack = () => uni.navigateBack()
const toggle = (field: 'businessTypes' | 'categories', value: string) => { const values = form.value[field]; form.value[field] = values.includes(value) ? values.filter((item) => item !== value) : [...values, value] }
const chooseFile = () => uni.chooseImage({ count: 1, success: ({ tempFilePaths }) => { const path = tempFilePaths[0]; form.value.files.push(path.split('/').pop() || '资质附件.jpg') } })
const load = async (id?: string) => { try { if (id) { const result = await merchantCooperationService.getQualification(id); if (!result) throw new Error('资质不存在或无权访问'); form.value = result; isEdit.value = true } status.value = permissions.value.canEdit ? 'ready' : 'no-permission'; stateMessage.value = '当前账号没有资质维护权限' } catch (error) { stateMessage.value = error instanceof Error ? error.message : '资质资料加载失败'; status.value = 'error' } }
const save = async () => {
  if (!form.value.type || !form.value.certificateNo || !form.value.effectiveDate || !form.value.expiryDate || !form.value.businessTypes.length || !form.value.files.length) { uni.showModal({ title: '请完善资质资料', content: '资质类型、编号、有效期、适用业务和证照附件为必填项。', showCancel: false }); return }
  if (form.value.expiryDate !== '长期' && form.value.effectiveDate > form.value.expiryDate) { uni.showModal({ title: '有效期有误', content: '生效日期不能晚于失效日期。', showCancel: false }); return }
  saving.value = true
  try { await merchantCooperationService.saveQualification(form.value); uni.showToast({ title: '已提交平台确认', icon: 'success' }); setTimeout(() => uni.navigateBack(), 500) }
  catch (error) { uni.showModal({ title: '提交失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
  finally { saving.value = false }
}
onLoad((options) => load(options?.id))
</script>

<template>
  <AppPage :status="status" :state-message="stateMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar :title="isEdit ? '更新资质' : '新增资质'" centered show-back /></template>
    <view class="stack"><view v-if="form.reason" class="reason-block">{{ form.reason }}</view><FormSection title="资质信息" description="提交后为待确认，平台确认通过后才参与经营资格判断"><FormField label="资质类型" required><picker :range="['营业执照','食品经营许可证','从业人员健康证','专业服务资格证']" @change="form.type = ['营业执照','食品经营许可证','从业人员健康证','专业服务资格证'][Number($event.detail.value)]"><view class="picker-value">{{ form.type || '请选择资质类型' }}</view></picker></FormField><FormField label="持有人" required readonly><input :value="form.holderName" disabled /></FormField><FormField label="证件编号" required><input v-model="form.certificateNo" maxlength="50" /></FormField><FormField label="生效日期" required><input v-model="form.effectiveDate" placeholder="YYYY-MM-DD" /></FormField><FormField label="失效日期" required hint="长期有效可填写“长期”"><input v-model="form.expiryDate" placeholder="YYYY-MM-DD 或 长期" /></FormField><FormField label="适用业务" required><view class="chip-row"><view v-for="item in ['商城','社区服务']" :key="item" class="select-chip" :class="{ 'select-chip--active': form.businessTypes.includes(item) }" @click="toggle('businessTypes',item)">{{ item }}</view></view></FormField><FormField label="申请适用类目" hint="最终范围由平台确认"><view class="chip-row"><view v-for="item in ['生鲜果蔬','米面粮油','日用百货','家电清洗']" :key="item" class="select-chip" :class="{ 'select-chip--active': form.categories.includes(item) }" @click="toggle('categories',item)">{{ item }}</view></view></FormField><FormField label="证照附件" required><EvidenceUploader :files="form.files" @add="chooseFile" @remove="form.files.splice($event,1)" /></FormField></FormSection></view>
    <BottomActionBar><AppButton variant="secondary" @click="goBack">取消</AppButton><AppButton :loading="saving" @click="save">提交确认</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.reason-block{padding:$space-3;border-radius:$radius-md;background:$color-warning-light;color:$color-warning;font-size:13px}.picker-value{display:flex;min-height:48px;align-items:center}.chip-row{display:flex;flex-wrap:wrap;gap:$space-2;padding:$space-2 0}.select-chip{display:flex;min-height:44px;align-items:center;padding:0 $space-3;border-radius:999px;background:#fff;color:$color-text-secondary}.select-chip--active{background:$color-primary;color:#fff}
</style>
