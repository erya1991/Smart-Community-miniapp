<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import FormSection from '@/components/FormSection.vue'
import FormField from '@/components/FormField.vue'
import { merchantTradeService } from '@/services/trade'
const props = defineProps<{ orderId: string }>()
const emit = defineEmits<{ shipped: []; busy: [value: boolean] }>()
const companies = ref<{ code: string; name: string }[]>([])
const form = reactive({ logisticsCode: '', logisticsName: '', logisticsNo: '', shipmentRemark: '' })
const errors = reactive({ company: '', no: '' })
const message = ref(''), saving = ref(false)
const choose = (event: { detail: { value: string | number } }) => { const company = companies.value[Number(event.detail.value)]; if (company) { form.logisticsCode = company.code; form.logisticsName = company.name } }
const submit = async () => {
  if (saving.value) return
  errors.company = form.logisticsName && form.logisticsCode ? '' : '请选择物流公司'
  errors.no = /^[A-Za-z0-9-]{5,40}$/.test(form.logisticsNo.trim()) ? '' : '请输入 5—40 位有效物流单号'
  if (errors.company || errors.no) return
  saving.value = true; emit('busy', true); message.value = ''
  try { const { confirm } = await uni.showModal({ title: '确认发货', content: '请确认物流公司与单号准确，商品已经交付物流公司。' }); if (!confirm) return; await merchantTradeService.ship(props.orderId, { ...form }); emit('shipped') }
  catch (error) { message.value = error instanceof Error ? error.message : '发货失败，请重试。' }
  finally { saving.value = false; emit('busy', false) }
}
defineExpose({ submit })
onMounted(async () => { try { companies.value = await merchantTradeService.getLogisticsCompanies() } catch (error) { message.value = error instanceof Error ? error.message : '物流公司加载失败' } })
</script>
<template><FormSection id="logistics-form" title="物流发货" description="只登记物流公司与单号，不查询轨迹"><text v-if="message" class="shipment-error">{{ message }}</text><FormField label="物流公司" required :error="errors.company"><picker :range="companies" range-key="name" :disabled="saving" @change="choose"><view class="company-picker">{{ form.logisticsName || '请选择物流公司' }} ›</view></picker></FormField><FormField label="物流单号" required :error="errors.no"><input v-model="form.logisticsNo" maxlength="40" :disabled="saving" placeholder="请输入物流单号" /></FormField><FormField label="发货备注" hint="选填，最多 200 字"><textarea v-model="form.shipmentRemark" maxlength="200" :disabled="saving" auto-height placeholder="可填写包裹说明" /></FormField></FormSection></template>
<style scoped lang="scss">.company-picker { display:flex; min-height:48px; align-items:center; font-size:16px; }.shipment-error { color:$color-error; font-size:15px; }input { min-height:48px; font-size:16px; }textarea { box-sizing:border-box; width:100%; min-height:64px; font-size:15px; line-height:24px; }</style>
