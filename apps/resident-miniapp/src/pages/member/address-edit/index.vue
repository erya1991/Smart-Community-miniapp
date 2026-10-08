<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import { residentMallService } from '@/services/mall'

const id = ref('')
const saving = ref(false)
const actionError = ref('')
const form = reactive({ name: '', mobile: '', region: '江苏省南京市秦淮区', detail: '', label: '家', isDefault: false })
const errors = reactive({ name: '', mobile: '', region: '', detail: '' })
const validate = () => {
  errors.name = form.name.trim() ? '' : '请填写收货人'
  errors.mobile = /^1\d{10}$/.test(form.mobile.replace(/\s/g, '')) ? '' : '请输入正确的 11 位手机号'
  errors.region = form.region.trim() ? '' : '请填写省市区'
  errors.detail = form.detail.trim().length >= 5 && form.detail.trim().length <= 100 ? '' : '详细地址需为 5—100 个字符'
  return !Object.values(errors).some(Boolean)
}
const save = async () => {
  if (!validate() || saving.value) return
  saving.value = true
  actionError.value = ''
  try { await residentMallService.saveAddress({ id: id.value || undefined, ...form }); uni.showToast({ title: id.value ? '地址已保存' : '地址已新增', icon: 'success' }); uni.navigateBack() } catch (error) { actionError.value = error instanceof Error ? error.message : '保存失败，请重试。' } finally { saving.value = false }
}
onLoad(async (options) => {
  id.value = typeof options?.id === 'string' ? options.id : ''
  if (!id.value) return
  try { const address = await residentMallService.getAddress(id.value); if (!address) throw new Error('地址不存在'); Object.assign(form, address) } catch (error) { actionError.value = error instanceof Error ? error.message : '地址加载失败' }
})
</script>

<template>
  <AppPage secondary :with-bottom-action="true">
    <template #navbar><AppNavbar :title="id ? '编辑收货地址' : '新增收货地址'" centered show-back /></template>
    <view v-if="actionError" class="form-error-tip">{{ actionError }}</view>
    <view class="stack address-edit-page"><view v-if="Object.values(errors).some(Boolean)" class="form-error-tip">请完善标红的地址信息后再保存。</view><FormSection title="联系人与地址" description="配送订单仅使用本次保存的地址快照"><FormField label="收货人" required :error="errors.name"><input v-model="form.name" placeholder="请输入收货人姓名" /></FormField><FormField label="手机号" required :error="errors.mobile"><input v-model="form.mobile" type="number" maxlength="11" placeholder="请输入手机号" /></FormField><FormField label="省市区" required :error="errors.region"><input v-model="form.region" placeholder="例如：江苏省南京市秦淮区" /></FormField><FormField label="详细地址" required :error="errors.detail" hint="5—100 字"><textarea v-model="form.detail" auto-height placeholder="街道、门牌号、楼栋与房间号" /></FormField><FormField label="地址标签"><input v-model="form.label" maxlength="8" placeholder="例如：家、公司" /></FormField><view class="default-row" @click="form.isDefault = !form.isDefault"><text>设为默认收货地址</text><text class="default-check" :class="{ 'default-check--active': form.isDefault }">{{ form.isDefault ? '✓' : '' }}</text></view></FormSection></view>
    <BottomActionBar><AppButton :loading="saving" @click="save">保存地址</AppButton></BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.address-edit-page { gap:$space-3; }.form-error-tip { padding:$space-3; border-radius:$radius-md; background:$color-error-light; color:$color-error; font-size:14px; }.default-row { display:flex; min-height:48px; align-items:center; justify-content:space-between; padding-top:$space-2; border-top:1px solid rgba(225,228,230,.72); font-size:15px; font-weight:600; }.default-check { display:flex; width:24px; height:24px; align-items:center; justify-content:center; border:1px solid $color-border; border-radius:50%; color:#fff; }.default-check--active { border-color:$color-primary; background:$color-primary; }
</style>
