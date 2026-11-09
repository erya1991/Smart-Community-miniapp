<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage45Api} from '../../../business-common/stage45/types'
import EvidenceUploader from '../EvidenceUploader.vue'
import OperationRecovery from './OperationRecovery.vue'
const props=defineProps<{api:Stage45Api;orderId:string;purpose:'AFTERSALE'|'EVALUATION';modelValue:string[];readonly?:boolean}>()
const emit=defineEmits<{'update:modelValue':[ids:string[]];busy:[value:boolean]}>(),urls=ref<string[]>([]),error=ref(''),busy=ref(false)
let sequence=0
const name=()=> 'upload:'+props.orderId
async function load(){const run=++sequence,owner=props.api.owner();const next:string[]=[];for(const id of props.modelValue){try{next.push(await props.api.asset(id))}catch{next.push('')}}if(run===sequence&&owner===props.api.owner())urls.value=next}
function accepted(value:unknown){const id=(value as {id?:string})?.id;if(id&&!props.modelValue.includes(id))emit('update:modelValue',[...props.modelValue,id]);load()}
async function add(){
 if(busy.value||props.readonly||props.modelValue.length>=10||props.api.pending(name()))return
 error.value=''
 try{const selected=await uni.chooseImage({count:1,sizeType:['compressed'],sourceType:['album','camera']});const file=Array.isArray(selected.tempFiles)?selected.tempFiles[0]:null
  if(!file||file.size>5*1024*1024){error.value='请选择不超过5 MiB的图片。';return}
  busy.value=true;emit('busy',true);accepted(await props.api.upload(name(),props.orderId,props.purpose,selected.tempFilePaths[0]))
 }catch(e){error.value=e instanceof Error?e.message:'图片未上传；已成功上传的图片仍保留。'}
 finally{busy.value=false;emit('busy',false)}
}
function remove(index:number){if(!busy.value&&!props.readonly)emit('update:modelValue',props.modelValue.filter((_,i)=>i!==index))}
watch(()=>[props.modelValue.join(','),props.api.owner()],load,{immediate:true})
onBeforeUnmount(()=>{sequence++;urls.value=[]})
</script>
<template><view><text class="hint">最多10张，每张5 MiB；支持JPEG、PNG、WebP。提交后按对象权限查看。</text><EvidenceUploader :files="urls" images :readonly="readonly||busy||api.pending(name())" :max-files="10" @add="add" @remove="remove"/><text class="error" v-if="error" role="alert">{{error}}</text><OperationRecovery :api="api" :name="name()" @recovered="accepted"/></view></template>
<style scoped lang="scss">.hint{display:block;font-size:12px;color:$color-text-secondary;margin-bottom:10px}.error{display:block;color:$color-error;margin:8px 0}</style>
