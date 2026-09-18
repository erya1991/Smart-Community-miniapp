<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { useMerchantContext } from '@/stores/merchant-context'
import type { MerchantStoreRecord } from '@/types/merchant-cooperation'
import type { PageStatus } from '@/types/app'

const { currentOperator, permissions } = useMerchantContext()
const status = ref<PageStatus>('loading')
const stateMessage = ref('')
const saving = ref(false)
const isEdit = ref(false)
const form = ref<MerchantStoreRecord>({ id: '', operatorId: currentOperator.value?.id || '', name: '', address: '', contactName: '', contactMobileMasked: '', contactMobile: '', businessHours: '', status: 'active', isPrimary: false })
const goBack = () => uni.navigateBack()
const load = async (id?: string) => { try { if (id) { const result = await merchantCooperationService.getStore(id); if (!result) throw new Error('门店不存在或无权访问'); form.value = result; isEdit.value = true } status.value = permissions.value.canEdit ? 'ready' : 'no-permission'; stateMessage.value = '当前账号没有门店维护权限' } catch (error) { stateMessage.value = error instanceof Error ? error.message : '门店加载失败'; status.value = 'error' } }
const save = async () => {
  if (saving.value) return
  if (!form.value.name.trim() || !form.value.address.trim() || !form.value.contactName.trim() || !/^1\d{10}$/.test(form.value.contactMobile)) { uni.showModal({ title: '请完善门店资料', content: '门店名称、地址、联系人和11位联系电话为必填项。', showCancel: false }); return }
  saving.value = true
  try { await merchantCooperationService.saveStore(form.value); uni.showToast({ title: '门店已保存', icon: 'success' }); setTimeout(() => uni.navigateBack(), 500) }
  catch (error) { uni.showModal({ title: '保存失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
  finally { saving.value = false }
}
onLoad((options) => load(options?.id))
</script>

<template>
  <AppPage :status="status" :state-message="stateMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar :title="isEdit ? '编辑门店' : '新增门店'" centered show-back /></template>
    <view class="stack editor-page">
      <FormSection title="门店资料" description="门店归属当前正式经营主体，创建后不可更换主体">
        <FormField label="所属主体" readonly><input :value="currentOperator?.name || '未选择主体'" disabled /></FormField>
        <FormField label="门店名称" required><input v-model="form.name" maxlength="50" placeholder="请输入门店名称" /></FormField>
        <FormField label="详细地址" required hint="可使用微信地址选择能力"><textarea v-model="form.address" maxlength="200" auto-height placeholder="请输入详细地址" /></FormField>
        <FormField label="联系人" required><input v-model="form.contactName" maxlength="30" /></FormField>
        <FormField label="联系电话" required><input v-model="form.contactMobile" type="number" maxlength="11" /></FormField>
        <FormField label="营业时间"><input v-model="form.businessHours" placeholder="例如 08:00-20:00" /></FormField>
      </FormSection>
      <view class="business-note">停用门店不会影响主体资格，也不会删除历史订单中的门店快照。</view>
    </view>
    <BottomActionBar><AppButton variant="secondary" @click="goBack">取消</AppButton><AppButton :loading="saving" @click="save">保存</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.editor-page{gap:$space-3}.business-note{padding:$space-3;border-radius:$radius-md;background:$color-primary-light;color:$color-primary;font-size:13px}
</style>
