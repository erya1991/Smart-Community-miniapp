<script setup lang="ts">
import {ref} from 'vue'
import type {Stage45Api} from '../../../business-common/stage45/types'
import AppButton from '../AppButton.vue'
import BaseCard from '../BaseCard.vue'
const props=defineProps<{api:Stage45Api;name:string}>(),emit=defineEmits<{recovered:[value:unknown]}>()
const busy=ref(false),error=ref(''),queried=ref(false)
async function act(action:'query'|'retry'|'abandon'){
 if(busy.value)return
 if(action==='abandon'){const choice=await uni.showModal({title:'结束未提交的原操作',content:'若原操作已提交，将返回原结果；否则阻止迟到的原请求。此操作不会取消已生效售后，也不会改变退款事实。'});if(!choice.confirm)return}
 busy.value=true;error.value=''
 try{const result=action==='query'?await props.api.recover(props.name):action==='retry'?await props.api.retry(props.name):await props.api.abandon(props.name);emit('recovered',result)}
 catch(e){error.value=e instanceof Error?e.message:'原操作仍待核实。';queried.value=true}
 finally{busy.value=false}
}
</script>
<template><BaseCard v-if="api.pending(name)" class="s45-recovery"><text class="title">原操作结果待核实</text><text>请先回查；重新进入页面不会自动重复提交。</text><text v-if="error" class="error" role="alert">{{error}}</text><view class="buttons"><AppButton class="s45-action" :loading="busy" @click="act('query')">回查原操作</AppButton><AppButton class="s45-action" v-if="queried" variant="secondary" :disabled="busy" @click="act('retry')">重试原请求</AppButton><AppButton class="s45-action" v-if="queried" variant="secondary" :disabled="busy" @click="act('abandon')">结束未提交意图</AppButton></view></BaseCard></template>
<style scoped lang="scss">.s45-recovery text{display:block;margin:6px 0}.title{font-weight:600}.error{color:$color-error}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.buttons>.s45-action{flex:1;min-width:130px}</style>
