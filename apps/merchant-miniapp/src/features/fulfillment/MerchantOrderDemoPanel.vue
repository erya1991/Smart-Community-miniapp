<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { merchantTradeService } from '@/services/trade'
import type { MerchantOrderContext } from '@/types/mall'
const emit = defineEmits<{ changed: [] }>()
const opened = ref(false), busy = ref(false), message = ref('')
const stores = ref<MerchantOrderContext[]>([]), context = ref<MerchantOrderContext>()
const load = async () => { try { stores.value = await merchantTradeService.getDemoStores(); context.value = await merchantTradeService.getContext() } catch (error) { message.value = error instanceof Error ? error.message : '演示数据不可用' } }
const select = async (id: string) => { if (busy.value) return; busy.value = true; try { context.value = await merchantTradeService.setStoreDemo(id); emit('changed') } catch (error) { message.value = error instanceof Error ? error.message : '切换失败' } finally { busy.value = false } }
onMounted(load)
</script>
<template><view class="order-demo"><view class="demo-heading" @click="opened = !opened"><text>订单演示 / Mock：{{ context?.storeName }}</text><text>{{ opened ? '收起' : '展开' }} ›</text></view><view v-if="opened" class="demo-body"><text>仅切换订单演示门店，不改变商品供给主体或登录权限。跨端同步需使用同源 H5 演示入口；真实 API 未接入。</text><view class="demo-stores"><AppButton v-for="store in stores" :key="store.storeId" variant="quiet" size="compact" :disabled="busy || store.storeId === context?.storeId" @click="select(store.storeId)">{{ store.storeName }}</AppButton></view><text v-if="message">{{ message }}</text></view></view></template>
<style scoped lang="scss">.order-demo { padding:8px 12px; border-radius:$radius-md; background:$color-group-bg; color:$color-text-secondary; font-size:13px; line-height:21px; }.demo-heading { display:flex; align-items:center; min-height:44px; gap:8px; }.demo-heading > text:first-child { flex:1; min-width:0; }.demo-body { display:flex; flex-direction:column; gap:8px; }.demo-stores { display:flex; flex-direction:column; gap:4px; }</style>
