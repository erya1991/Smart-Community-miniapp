<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import {stage1Service} from '../../services/stage1'
import {merchantSessionRevision,useMerchantContext} from '../../stores/merchant-context'
const props=defineProps<{goodsId:string;fileId?:string}>(),source=ref(''),failed=ref(false),identity=useMerchantContext();let ticket=0
function clear(){ticket++;if(source.value.startsWith('blob:')&&typeof URL!=='undefined')URL.revokeObjectURL(source.value);source.value=''}
watch(()=>[props.goodsId,props.fileId,identity.state.identity?.memberId,identity.state.authenticated],async()=>{clear();failed.value=false;if(!props.fileId||!identity.state.authenticated)return;const current=ticket,revision=merchantSessionRevision();try{const value=await stage1Service.preview(props.fileId,props.goodsId);if(current===ticket&&revision===merchantSessionRevision())source.value=value;else if(value.startsWith('blob:')&&typeof URL!=='undefined')URL.revokeObjectURL(value)}catch{if(current===ticket)failed.value=true}},{immediate:true})
onBeforeUnmount(clear)
</script>
<template><view class="s1-product-picture"><image v-if="source" :src="source" mode="aspectFill" @error="failed=true;clear()"/><view v-else class="s1-picture-placeholder"><AppIcon name="bag" :size="30"/><text v-if="failed">图片暂不可用</text></view></view></template>
<style scoped lang="scss">.s1-product-picture,.s1-picture-placeholder{width:72px;height:72px;display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:hidden;border-radius:$radius-md;background:$color-group-bg}.s1-product-picture image{width:100%;height:100%}.s1-picture-placeholder text{font-size:10px;line-height:1.3;color:$color-text-secondary;text-align:center}</style>
