<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage45Api,Context} from '../../../business-common/stage45/types'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
const props=defineProps<{api:Stage45Api;refreshKey?:number}>()
const permissions=ref<string[]>([]),error=ref('');let ticket=0
async function load(){const run=++ticket,owner=props.api.owner();try{const ctx=await props.api.read<Context>('/context');if(run===ticket&&owner===props.api.owner()){permissions.value=ctx.permissions;error.value=''}}catch(e){if(run===ticket){permissions.value=[];error.value=e instanceof Error?e.message:'当前权限读取失败。'}}}
function open(url:string){uni.navigateTo({url})}
watch(()=>props.api.owner(),()=>{ticket++;permissions.value=[];load()},{immediate:true});watch(()=>props.refreshKey,load);onBeforeUnmount(()=>ticket++)
</script>
<template><view class="s45"><BaseCard v-if="permissions.length"><text class="section">售后与经营记录</text><view class="buttons"><AppButton class="s45-action" v-if="permissions.includes('aftersale.read')" variant="secondary" @click="open('/pages/after-sale/index')">售后管理</AppButton><AppButton class="s45-action" v-if="permissions.includes('evaluation.read')" variant="secondary" @click="open('/pages/evaluation/index')">本店评价</AppButton><AppButton class="s45-action" v-if="permissions.includes('funds.read')" variant="secondary" @click="open('/pages/funds/index')">订单资金</AppButton><AppButton class="s45-action" v-if="permissions.includes('message.read')" variant="secondary" @click="open('/pages/messages/index')">商城消息</AppButton></view></BaseCard><BaseCard v-if="error"><text class="error">{{error}}</text><AppButton class="s45-action" variant="secondary" @click="load">重新读取权限</AppButton></BaseCard></view></template>
<style scoped lang="scss">@import './stage45.scss';</style>
