<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import FormField from '@/components/FormField.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { FieldErrors, SupplySku } from './types'
import { specLabel } from './rules'

const props = defineProps<{ modelValue: SupplySku[]; readonly?: boolean; errors: FieldErrors }>()
const emit = defineEmits<{ 'update:modelValue': [value: SupplySku[]] }>()
const expanded = ref<Record<string, boolean>>({})
const rawNumbers = ref<Record<string, string>>({})
const localError = ref('')
const attributes = computed(() => Object.keys(props.modelValue[0]?.specs || {}))
const isOpen = (sku: SupplySku, index: number) => expanded.value[sku.id] ?? index === 0
const change = (action: (skus: SupplySku[]) => void) => {
  if (props.readonly) return
  const next = props.modelValue.map(sku => ({ ...sku, specs: { ...sku.specs } }))
  action(next)
  emit('update:modelValue', next)
}
const fieldError = (index: number, key: string) => props.errors['sku.' + index + '.' + key]
const displayNumber = (sku: SupplySku, key: 'price' | 'cost' | 'quantity' | 'weight') => {
  const raw = rawNumbers.value[sku.id + key]
  if (raw !== undefined) return raw
  return key === 'price' || key === 'cost' ? (sku[key] / 100).toFixed(2) : String(sku[key])
}
const setNumber = (index: number, key: 'price' | 'cost' | 'quantity' | 'weight', raw: string) => {
  const sku = props.modelValue[index]
  rawNumbers.value[sku.id + key] = raw
  const money = key === 'price' || key === 'cost'
  const valid = key === 'quantity' ? /^\d+$/.test(raw) : money ? /^\d+(\.\d{0,2})?$/.test(raw) : /^\d+(\.\d{0,3})?$/.test(raw)
  change(skus => { skus[index][key] = valid ? money ? Math.round(Number(raw) * 100) : Number(raw) : NaN })
}
const inputValue = (event: Event) => (event as Event & { detail: { value: string } }).detail.value
const numberInput = (index: number, key: 'price' | 'cost' | 'quantity' | 'weight', event: Event) => setNumber(index, key, inputValue(event))
const specInput = (index: number, name: string, event: Event) => change(skus => { skus[index].specs[name] = inputValue(event) })
const snInput = (index: number, event: Event) => change(skus => { skus[index].sn = inputValue(event) })
const attributeInput = (name: string, event: Event) => renameAttribute(name, inputValue(event))
const addSku = () => change(skus => {
  const id = 'sku-local-' + Date.now() + '-' + skus.length
  skus.push({ id, specs: Object.fromEntries(attributes.value.map(name => [name, ''])), sn: '', price: 0, cost: 0, quantity: 0, weight: 0, isMain: false })
  expanded.value[id] = true
})
const removeSku = (index: number) => {
  if (props.modelValue.length === 1) { localError.value = '至少保留一个销售规格'; return }
  change(skus => { skus.splice(index, 1); if (!skus.some(sku => sku.isMain)) skus[0].isMain = true })
}
const addAttribute = () => change(skus => {
  let suffix = attributes.value.length + 1
  while (attributes.value.includes('属性' + suffix)) suffix++
  skus.forEach(sku => { sku.specs['属性' + suffix] = '' })
})
const renameAttribute = (oldName: string, raw: string) => {
  const name = raw.trim()
  if (!name || (name !== oldName && attributes.value.includes(name))) { localError.value = '规格属性名称不能为空或重复'; return }
  localError.value = ''
  change(skus => skus.forEach(sku => { sku.specs = Object.fromEntries(Object.entries(sku.specs).map(([key, value]) => [key === oldName ? name : key, value])) }))
}
const removeAttribute = (name: string) => {
  if (attributes.value.length === 1) { localError.value = '至少保留一个规格属性'; return }
  change(skus => skus.forEach(sku => { delete sku.specs[name] }))
}
const chooseImage = (index: number) => {
  if (props.readonly) return
  uni.chooseImage({ count: 1, sizeType: ['compressed'], success: result => change(skus => { skus[index].skuImage = result.tempFilePaths[0] }) })
}
</script>

<template>
  <view class="sku-editor">
    <text class="sku-editor__hint">单规格保留默认规格；多规格按属性组合逐项填写。成本价仅商户可见。</text>
    <text v-if="errors.skuList || localError" class="sku-editor__error">{{ errors.skuList || localError }}</text>
    <view class="attribute-list">
      <view v-for="name in attributes" :key="name" class="attribute-row">
        <input :value="name" :disabled="readonly" maxlength="16" :aria-label="'规格属性名称 ' + name" @blur="attributeInput(name, $event)" />
        <view v-if="!readonly" class="remove-hit" @click="removeAttribute(name)">移除属性</view>
      </view>
      <AppButton v-if="!readonly" variant="quiet" @click="addAttribute">添加规格属性</AppButton>
    </view>
    <view v-for="(sku, index) in modelValue" :key="sku.id" class="sku-card">
      <view class="sku-card__heading" @click="expanded[sku.id] = !isOpen(sku, index)">
        <view><text class="sku-card__title">{{ specLabel(sku.specs) || '新规格' }}</text><text class="sku-card__summary">{{ sku.sn || '待填写编码' }} · 库存 {{ Number.isFinite(sku.quantity) ? sku.quantity : '待填写' }}</text></view>
        <StatusTag v-if="sku.isMain" tone="pending">主规格</StatusTag><text>{{ isOpen(sku, index) ? '收起' : '展开' }}</text>
      </view>
      <view v-if="isOpen(sku, index)" class="sku-card__body">
        <FormField v-for="name in attributes" :key="name" :label="name" required :error="fieldError(index, 'specs')" :readonly="readonly">
          <input :value="sku.specs[name]" :disabled="readonly" maxlength="40" :aria-label="'SKU ' + (index + 1) + ' ' + name" @input="specInput(index, name, $event)" />
        </FormField>
        <FormField label="SKU 编码 sn" required :error="fieldError(index, 'sn')" :readonly="readonly"><input :value="sku.sn" :disabled="readonly" maxlength="64" :aria-label="'SKU ' + (index + 1) + ' 编码'" @input="snInput(index, $event)" /></FormField>
        <view class="sku-number-grid">
          <FormField label="销售价（元）" required :error="fieldError(index, 'price')" :readonly="readonly"><input :value="displayNumber(sku, 'price')" type="digit" :disabled="readonly" :aria-label="'SKU ' + (index + 1) + ' 销售价'" @input="numberInput(index, 'price', $event)" /></FormField>
          <FormField label="成本价（元）" required :error="fieldError(index, 'cost')" :readonly="readonly"><input :value="displayNumber(sku, 'cost')" type="digit" :disabled="readonly" :aria-label="'SKU ' + (index + 1) + ' 成本价'" @input="numberInput(index, 'cost', $event)" /></FormField>
          <FormField label="库存" required :error="fieldError(index, 'quantity')" :readonly="readonly"><input :value="displayNumber(sku, 'quantity')" type="number" :disabled="readonly" :aria-label="'SKU ' + (index + 1) + ' 库存'" @input="numberInput(index, 'quantity', $event)" /></FormField>
          <FormField label="重量（kg）" required :error="fieldError(index, 'weight')" :readonly="readonly"><input :value="displayNumber(sku, 'weight')" type="digit" :disabled="readonly" :aria-label="'SKU ' + (index + 1) + ' 重量'" @input="numberInput(index, 'weight', $event)" /></FormField>
        </view>
        <view class="sku-image-row">
          <view class="sku-image-hit" @click="chooseImage(index)"><image v-if="sku.skuImage" :src="sku.skuImage" mode="aspectFill" /><text>{{ sku.skuImage ? '更换 SKU 图片' : '添加 SKU 图片（选填）' }}</text></view>
          <view v-if="sku.skuImage && !readonly" class="remove-hit" @click="change(skus => { skus[index].skuImage = undefined })">移除图片</view>
        </view>
        <view v-if="!readonly" class="sku-card__actions">
          <view class="main-hit" @click="change(skus => { skus.forEach((value, selected) => { value.isMain = selected === index }) })">{{ sku.isMain ? '✓ 主规格' : '设为主规格' }}</view>
          <view v-if="modelValue.length > 1" class="remove-hit" @click="removeSku(index)">删除 SKU</view>
        </view>
      </view>
    </view>
    <AppButton v-if="!readonly" variant="quiet" @click="addSku">＋ 添加 SKU</AppButton>
  </view>
</template>

<style scoped lang="scss">
.sku-editor { display:flex; flex-direction:column; gap:$space-3; }
.sku-editor__hint { color:$color-text-secondary; font-size:13px; line-height:20px; }
.sku-editor__error { color:$color-error; font-size:14px; }
.attribute-list { display:flex; flex-direction:column; gap:$space-2; }
.attribute-row { display:flex; align-items:center; gap:$space-2; }
.attribute-row input { flex:1; width:0; height:48px; padding:0 $space-3; border-radius:$radius-md; background:$color-group-bg; font-size:15px; }
.sku-card { overflow:hidden; padding:$space-3; border-radius:$radius-md; background:$color-group-bg; }
.sku-card__heading { display:flex; min-height:44px; align-items:center; gap:$space-2; }
.sku-card__heading > view { flex:1; min-width:0; }
.sku-card__title,.sku-card__summary { display:block; overflow-wrap:anywhere; }
.sku-card__title { font-size:16px; font-weight:600; }
.sku-card__summary { margin-top:4px; color:$color-text-secondary; font-size:12px; }
.sku-card__heading > text { color:$color-primary; font-size:13px; }
.sku-card__body { display:flex; flex-direction:column; gap:$space-3; margin-top:$space-3; }
.sku-number-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:$space-3 $space-2; }
.sku-card :deep(.form-field__control) { background:$color-card-bg; padding:0 $space-2; }
.sku-card :deep(.form-field__label) { font-size:14px; }
.sku-card :deep(.form-field__label-row) { flex-wrap:wrap; }
.sku-card__actions,.sku-image-row { display:flex; align-items:center; justify-content:space-between; gap:$space-2; }
.remove-hit,.main-hit,.sku-image-hit { display:flex; min-width:44px; min-height:44px; align-items:center; font-size:14px; }
.remove-hit { color:$color-error; }
.main-hit,.sku-image-hit { color:$color-primary; }
.sku-image-hit { gap:$space-2; }
.sku-image-hit image { width:56px; height:56px; border-radius:$radius-sm; }
</style>
