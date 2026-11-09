<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage45Api,AfterSale,Page} from '../../../business-common/stage45/types'
import {label,money,date} from '../../../business-common/stage45/presentation'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
const props=defineProps<{api:Stage45Api;refreshKey?:number}>(),emit=defineEmits<{open:[id:string]}>()
const data=ref<Page<AfterSale>|null>(null),state=ref(''),q=ref(''),page=ref(1),loading=ref(false),error=ref('')
const filters=['','APPLY','WAIT_RETURN','WAIT_RECEIVE','WAIT_FUNDS','DISPUTE','COMPLETE','REJECTED','CANCELLED']
let ticket=0
async function load(){const run=++ticket,owner=props.api.owner();loading.value=true;error.value='';try{const result=await props.api.read<Page<AfterSale>>('/aftersales',{state:state.value,q:q.value,pageNumber:page.value,pageSize:20});if(run===ticket&&owner===props.api.owner())data.value=result}catch(e){if(run===ticket){data.value=null;error.value=e instanceof Error?e.message:'售后列表读取失败。'}}finally{if(run===ticket)loading.value=false}}
function filter(value:string){state.value=value;page.value=1;load()}
function search(reset=false){if(reset){q.value='';state.value=''}page.value=1;load()}
watch(()=>props.api.owner(),()=>{ticket++;data.value=null;page.value=1;load()},{immediate:true})
watch(()=>props.refreshKey,load)
onBeforeUnmount(()=>{ticket++;data.value=null})
</script>
<template><view class="s45"><view class="hero"><text class="hero-title">售后管理</text><text>当前身份与门店的真实售后状态</text></view><view class="search"><input v-model="q" maxlength="80" placeholder="商品、店铺或订单" @confirm="search()"/><AppButton class="s45-action" size="compact" :disabled="loading" @click="search()">查询</AppButton></view><view class="buttons"><AppButton class="s45-action" variant="secondary" size="compact" @click="search(true)">重置筛选</AppButton></view><scroll-view scroll-x><view class="tabs"><view v-for="option in filters" :key="option" class="tab" :class="{selected:state===option}" @click="filter(option)">{{option==='DISPUTE'?'争议处理中':option?label(option):'全部'}}</view></view></scroll-view>
<BaseCard v-if="error"><text class="error" role="alert">{{error}}</text><AppButton class="s45-action" @click="load">重新读取</AppButton></BaseCard><text v-if="loading" class="state">正在读取售后记录…</text>
<BaseCard v-for="row in data?.records" :key="row.id"><view class="row"><text class="strong">{{row.storeName}}</text><text class="badge">{{label(row.state)}}</text></view><text class="strong">{{row.goodsName}}</text><view class="row"><text>{{label(row.type)}} · {{row.quantity}} 件</text><text class="price">¥{{money(row.amountCent)}}</text></view><text class="muted">订单 {{row.orderSn}}</text><text class="muted">资金：{{label(row.fundingState)}}{{row.dispute!=='NONE'?' · '+label(row.dispute):''}}</text><text class="muted">{{date(row.createdAt)}}</text><AppButton class="s45-action" variant="secondary" @click="emit('open',row.id)">查看售后详情</AppButton></BaseCard>
<BaseCard v-if="data&&!data.records.length&&!loading"><text class="state">{{state||q?'没有符合筛选的售后记录。':'当前没有售后记录。'}}</text></BaseCard>
<view v-if="data" class="buttons"><AppButton class="s45-action" variant="secondary" :disabled="loading||page<=1" @click="page--;load()">上一页</AppButton><text>{{page}} 页 · 共 {{data.total}} 条</text><AppButton class="s45-action" variant="secondary" :disabled="loading||page*data.pageSize>=data.total" @click="page++;load()">下一页</AppButton></view>
</view></template>
<style scoped lang="scss">@import './stage45.scss';</style>
