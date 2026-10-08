<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { merchantSupplyService } from '@/services/supply'
import type { StoreStatus, SupplyScenario } from './types'

const props = defineProps<{ mode: 'application' | 'qualification' | 'goods'; goodsId?: string; applicationStatus?: StoreStatus }>()
const emit = defineEmits<{ changed: [] }>()
const opened = ref(false)
const busy = ref(false)
const message = ref('')
const applicationOptions: { label: string; state: StoreStatus }[] = [{ label: '首次申请', state: 'APPLY' }, { label: '审核中', state: 'APPLYING' }, { label: '已驳回', state: 'REFUSED' }, { label: '审核通过', state: 'OPEN' }]
const qualificationOptions: { label: string; state: SupplyScenario }[] = [{ label: '正式交易可用', state: 'ready' }, { label: '支付/分账待完善', state: 'payment-pending' }, { label: '分账异常', state: 'sharing-exception' }, { label: '协议失效', state: 'agreement-expired' }, { label: '资质失效', state: 'qualification-expired' }, { label: '店铺停用', state: 'store-closed' }]
const run = async (action: () => Promise<unknown>) => {
  if (busy.value) return
  busy.value = true
  message.value = ''
  try { await action(); emit('changed'); uni.showToast({ title: '演示状态已切换', icon: 'none' }) }
  catch (error) { message.value = error instanceof Error ? error.message : '切换失败，请重试' }
  finally { busy.value = false }
}
const reviewGood = (decision: 'PASS' | 'REFUSE') => run(() => merchantSupplyService.reviewGoodsDemo(props.goodsId!, decision))
</script>

<template>
  <view class="supply-demo">
    <view class="supply-demo__toggle" @click="opened = !opened">原型演示（Mock）<text>{{ opened ? '收起' : '展开' }} ›</text></view>
    <view v-if="opened" class="supply-demo__body">
      <text class="supply-demo__hint">仅演示数据及平台结果，不代表商户具备审核或配置权限。</text>
      <view v-if="mode === 'application' && applicationStatus === 'APPLYING'" class="supply-demo__grid">
        <AppButton variant="quiet" :loading="busy" @click="run(() => merchantSupplyService.reviewApplicationDemo('OPEN'))">模拟平台通过</AppButton>
        <AppButton variant="quiet" :loading="busy" @click="run(() => merchantSupplyService.reviewApplicationDemo('REFUSED'))">模拟平台驳回</AppButton>
      </view>
      <view v-if="mode === 'application'" class="supply-demo__grid"><AppButton v-for="item in applicationOptions" :key="item.state" variant="quiet" size="compact" :disabled="busy" @click="run(() => merchantSupplyService.setApplicationDemo(item.state))">{{ item.label }}</AppButton></view>
      <view v-if="mode === 'qualification'" class="supply-demo__grid"><AppButton v-for="item in qualificationOptions" :key="item.state" variant="quiet" size="compact" :disabled="busy" @click="run(() => merchantSupplyService.setQualificationDemo(item.state))">{{ item.label }}</AppButton></view>
      <view v-if="mode === 'goods'" class="supply-demo__grid"><AppButton variant="quiet" :loading="busy" @click="reviewGood('PASS')">模拟平台通过</AppButton><AppButton variant="quiet" :loading="busy" @click="reviewGood('REFUSE')">模拟平台驳回</AppButton></view>
      <text v-if="message" class="supply-demo__error">{{ message }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.supply-demo { border:1px dashed $color-border; border-radius:$radius-md; background:$color-card-bg; }
.supply-demo__toggle { display:flex; min-height:44px; align-items:center; justify-content:space-between; padding:0 $space-3; color:$color-text-secondary; font-size:13px; }
.supply-demo__body { display:flex; flex-direction:column; gap:$space-2; padding:0 $space-3 $space-3; }
.supply-demo__hint { color:$color-text-secondary; font-size:12px; line-height:18px; }
.supply-demo__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:$space-2; }
.supply-demo__grid :deep(.app-button--compact) { min-height:44px; white-space:normal; line-height:20px; }
.supply-demo__error { color:$color-error; font-size:13px; }
</style>
