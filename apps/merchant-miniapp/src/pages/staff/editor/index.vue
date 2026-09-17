<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/AppButton.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import { merchantCooperationService } from '@/services/merchant-cooperation'
import { useMerchantContext } from '@/stores/merchant-context'
import type { MerchantStaffRecord, MerchantStoreRecord, StaffRole } from '@/types/merchant-cooperation'
import type { PageStatus } from '@/types/app'

const { currentOperator, permissions } = useMerchantContext()
const status = ref<PageStatus>('loading')
const stateMessage = ref('')
const saving = ref(false)
const isEdit = ref(false)
const stores = ref<MerchantStoreRecord[]>([])
const form = ref<MerchantStaffRecord>({ id: '', operatorId: currentOperator.value?.id || '', memberName: '', mobileMasked: '', mobile: '', role: 'worker', storeIds: [], storeScopeLabel: '全部有效门店', status: 'active', joinedAt: '待确认加入' })
const roleOptions: Array<{ value: StaffRole; label: string }> = [{ value: 'owner', label: '负责人' }, { value: 'worker', label: '工作人员' }, { value: 'service', label: '服务人员' }]
const allStores = computed(() => form.value.storeIds.length === 0)
const goBack = () => uni.navigateBack()
const toggleStore = (id: string) => { form.value.storeIds = form.value.storeIds.includes(id) ? form.value.storeIds.filter((item) => item !== id) : [...form.value.storeIds, id] }
const load = async (id?: string) => { try { stores.value = (await merchantCooperationService.listStores()).filter((item) => item.status === 'active'); if (id) { const result = await merchantCooperationService.getStaff(id); if (!result) throw new Error('人员不存在或无权访问'); form.value = result; isEdit.value = true } status.value = permissions.value.canEdit ? 'ready' : 'no-permission'; stateMessage.value = '当前账号没有人员维护权限' } catch (error) { stateMessage.value = error instanceof Error ? error.message : '人员资料加载失败'; status.value = 'error' } }
const save = async () => {
  if (!form.value.memberName.trim() || !/^1\d{10}$/.test(form.value.mobile)) { uni.showModal({ title: '请完善人员资料', content: '姓名和11位手机号为必填项。', showCancel: false }); return }
  if (form.value.role === 'owner' && !isEdit.value) { const { confirm } = await uni.showModal({ title: '邀请负责人？', content: '新增负责人将拥有主体内人员、门店和资质管理权限。' }); if (!confirm) return }
  form.value.storeScopeLabel = allStores.value ? '全部有效门店' : stores.value.filter((item) => form.value.storeIds.includes(item.id)).map((item) => item.name).join('、')
  saving.value = true
  try { await merchantCooperationService.saveStaff(form.value); uni.showToast({ title: isEdit.value ? '人员已更新' : '邀请已发送', icon: 'success' }); setTimeout(() => uni.navigateBack(), 500) }
  catch (error) { uni.showModal({ title: '保存失败', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false }) }
  finally { saving.value = false }
}
onLoad((options) => load(options?.id))
</script>

<template>
  <AppPage :status="status" :state-message="stateMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar :title="isEdit ? '编辑人员' : '邀请人员'" centered show-back /></template>
    <view class="stack"><FormSection title="人员身份" description="邀请需由用户登录确认，前端权限不替代后端校验"><FormField label="所属主体" readonly><input :value="currentOperator?.name || '未选择主体'" disabled /></FormField><FormField label="人员姓名" required><input v-model="form.memberName" maxlength="30" /></FormField><FormField label="手机号" required :readonly="isEdit"><input v-model="form.mobile" type="number" maxlength="11" :disabled="isEdit" /></FormField><FormField label="人员角色" required><view class="role-options"><view v-for="option in roleOptions" :key="option.value" class="role-option" :class="{ 'role-option--active': form.role === option.value }" @click="form.role = option.value">{{ option.label }}</view></view></FormField></FormSection><FormSection title="门店范围" description="不选择具体门店表示主体下全部有效门店"><view class="scope-option" :class="{ 'scope-option--active': allStores }" @click="form.storeIds = []">全部有效门店</view><view v-for="store in stores" :key="store.id" class="scope-option" :class="{ 'scope-option--active': form.storeIds.includes(store.id) }" @click="toggleStore(store.id)">{{ store.name }}</view></FormSection></view>
    <BottomActionBar><AppButton variant="secondary" @click="goBack">取消</AppButton><AppButton :disabled="saving" @click="save">{{ saving ? '保存中…' : isEdit ? '保存' : '发送邀请' }}</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.role-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:$space-2;padding:$space-2 0}.role-option,.scope-option{display:flex;min-height:44px;align-items:center;justify-content:center;padding:0 $space-2;border:1px solid $color-border;border-radius:$radius-md;background:#fff;color:$color-text-secondary;text-align:center}.role-option--active,.scope-option--active{border-color:$color-primary;background:$color-primary-light;color:$color-primary;font-weight:600}.scope-option{justify-content:flex-start;margin-bottom:$space-2;padding:0 $space-3}
</style>
