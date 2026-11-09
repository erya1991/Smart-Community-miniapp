<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage45Api} from '../../../business-common/stage45/types'
const props=defineProps<{api:Stage45Api;orderId:string;itemId:string}>()
const url=ref(''),loading=ref(false),failed=ref(false);let ticket=0
async function load(){if(!props.orderId||!props.itemId)return;const run=++ticket,owner=props.api.owner();url.value='';loading.value=true;failed.value=false;try{const result=await props.api.productImage(props.orderId,props.itemId);if(run===ticket&&owner===props.api.owner())url.value=result}catch{if(run===ticket)failed.value=true}finally{if(run===ticket)loading.value=false}}
watch(()=>[props.orderId,props.itemId,props.api.owner()],()=>{ticket++;url.value='';load()},{immediate:true});onBeforeUnmount(()=>{ticket++;url.value=''})
</script>
<template><view class="product-image"><image v-if="url&&!failed" :src="url" mode="aspectFill" @error="failed=true"/><view v-else class="placeholder"><text>{{loading?'图片读取中':'商品图片'}}</text><text v-if="failed" class="retry" @click="load">暂不可用 · 重试</text></view></view></template>
<style scoped lang="scss">.product-image,.product-image image{width:76px;height:76px;flex:none;border-radius:10px;overflow:hidden}.placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;background:$color-group-bg;color:$color-text-secondary;font-size:12px}.retry{color:$color-primary;min-height:24px;line-height:24px}</style>
