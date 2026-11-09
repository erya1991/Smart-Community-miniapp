<script setup lang="ts">
import {ref,watch,onMounted,onBeforeUnmount} from 'vue'
import type {Stage3Api,Order} from '../../../business-common/stage3/types'
import {Stage3Error} from '../../../business-common/stage3/client'
import {label,money,date,blocked} from '../../../business-common/stage3/presentation'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
import StatusTag from '../StatusTag.vue'
const props=defineProps<{api:Stage3Api;merchant?:boolean;refreshKey?:number;initialFilter?:string}>()
const emit=defineEmits<{open:[id:string];pay:[tradeId:string]}>()
const records=ref<Order[]>([]),total=ref(0),page=ref(1),q=ref(''),filter=ref('ALL'),method=ref(''),loading=ref(false),error=ref('')
let ticket=0
const filters=[{id:'ALL',name:'全部订单'},{id:'WAIT_PAY',name:'待付款'},{id:'WAIT_MERCHANT',name:'待商家处理'},{id:'WAIT_RECEIVE',name:'待收货'},{id:'PICKUP',name:'自提 / 到店核销'},{id:'COMPLETED',name:'已完成'},{id:'EXCEPTION',name:'异常待核实'}]
const methods=[{id:'',name:'全部方式'},...['MERCHANT_DELIVERY','EXPRESS','COMMUNITY_PICKUP','STORE_REDEMPTION'].map(id=>({id,name:label(id)}))]
async function load(){
 const run=++ticket,owner=props.api.owner();loading.value=true;error.value=''
 try{const result=await props.api.list({q:q.value,filter:filter.value,...(method.value?{method:method.value}:{}),pageNumber:page.value,pageSize:20})
  if(run!==ticket||owner!==props.api.owner())return
  if(!Array.isArray(result.records)||!Number.isSafeInteger(result.total))throw new Stage3Error('INVALID_RESPONSE')
  records.value=result.records;total.value=result.total
 }catch(e){if(run===ticket){records.value=[];total.value=0;error.value=e instanceof Error?e.message:'订单读取失败，请重试。'}}
 finally{if(run===ticket)loading.value=false}
}
function search(){page.value=1;load()}
function reset(){q.value='';filter.value='ALL';method.value='';search()}
function selectFilter(event:any){filter.value=filters[Number(event.detail.value)].id;search()}
function selectMethod(event:any){method.value=methods[Number(event.detail.value)].id;search()}
function turn(delta:number){page.value+=delta;load();uni.pageScrollTo({scrollTop:0,duration:0})}
watch(()=>props.api.owner(),()=>{ticket++;records.value=[];total.value=0;page.value=1;error.value='登录身份已变化，请在当前账号下重新读取。'})
watch(()=>props.refreshKey,()=>load())
onMounted(()=>{if(props.initialFilter&&filters.some(f=>f.id===props.initialFilter))filter.value=props.initialFilter;load()})
onBeforeUnmount(()=>ticket++)
defineExpose({load})
</script>
<template>
 <view class="s3-view s3-list">
  <view class="s3-view query"><view class="s3-view search"><input class="s3-input" v-model="q" maxlength="64" placeholder="订单号、店铺或商品名称" confirm-type="search" @confirm="search"/><AppButton size="compact" :loading="loading" @click="search">查询</AppButton></view>
   <view class="s3-view filters"><picker :range="filters.map(f=>f.name)" :value="filters.findIndex(f=>f.id===filter)" @change="selectFilter"><view class="s3-view picker">{{filters.find(f=>f.id===filter)?.name}} ▾</view></picker><picker :range="methods.map(f=>f.name)" :value="methods.findIndex(f=>f.id===method)" @change="selectMethod"><view class="s3-view picker">{{methods.find(f=>f.id===method)?.name}} ▾</view></picker><view class="s3-view reset" @click="reset">重置</view></view>
  </view>
  <BaseCard v-if="error"><text class="s3-text error" role="alert">{{error}}</text><AppButton variant="secondary" @click="load">重新读取</AppButton></BaseCard>
  <view v-else-if="loading" class="s3-view state">正在读取订单…</view>
  <view v-else-if="!records.length" class="s3-view state">{{q||filter!=='ALL'||method?'当前条件下没有订单，可调整筛选。':'您还没有商城订单。'}}</view>
  <template v-else>
   <BaseCard v-for="order in records" :key="order.orderId" class="order" :padded="false" @click="emit('open',order.orderId)">
    <view class="s3-view head"><text class="s3-text store">{{order.storeName}}</text><StatusTag :tone="order.phase==='COMPLETED'?'success':order.blockedReason?'error':'pending'">{{order.fulfillmentEnded?'未交付商品已退清，履约结束':label(order.phase)}}</StatusTag></view>
    <text class="s3-text summary">{{order.items.map(i=>i.name+' ×'+i.quantity).join('；')}}</text>
    <text class="s3-text meta">{{label(order.method)}} · {{label(order.paymentStatus)}}</text>
    <text v-if="order.blockedReason" class="s3-text blocked">{{blocked(order.blockedReason)}}</text>
    <view class="s3-view foot"><view class="s3-view"><text class="s3-text price">{{order.paidAmountCent==null?'订单金额':'实付'}} ¥{{money(order.paidAmountCent??order.amountCent)}}</text><text class="s3-text meta">{{date(order.createdAt)}}</text></view><AppButton variant="secondary" size="compact" @click.stop="emit('open',order.orderId)">查看详情</AppButton></view>
    <text class="s3-text identity">订单 {{order.orderSn}} · 所属合单 {{order.tradeSn}}</text>
   </BaseCard>
   <view class="s3-view pagination"><AppButton size="compact" variant="secondary" :disabled="loading||page===1" @click="turn(-1)">上一页</AppButton><text class="s3-text">第 {{page}} 页 · 共 {{total}} 单</text><AppButton size="compact" variant="secondary" :disabled="loading||page*20>=total" @click="turn(1)">下一页</AppButton></view>
  </template>
 </view>
</template>
<style scoped lang="scss">
.s3-list{display:flex;flex-direction:column;gap:$space-3}.query{display:flex;flex-direction:column;gap:$space-2}.search{display:flex;gap:8px}.search .s3-input{height:44px;flex:1;min-width:0;background:white;padding:0 12px;border:1px solid $color-border;border-radius:$radius-md;font-size:15px}.filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.picker,.reset{min-height:44px;display:flex;align-items:center;padding:0 12px;background:$color-card-bg;border-radius:$radius-md;font-size:14px}.reset{color:$color-primary}.order{padding:14px;border-left:3px solid $color-primary}.head,.foot{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.store{font-size:15px;font-weight:600;flex:1;min-width:100px}.summary{display:block;font-size:16px;font-weight:600;line-height:1.55;margin:10px 0;overflow-wrap:anywhere}.meta,.identity{display:block;color:$color-text-secondary;font-size:13px;line-height:1.6;overflow-wrap:anywhere}.identity{margin-top:12px;padding-top:8px;border-top:1px solid $color-border}.blocked,.error{display:block;color:$color-error;font-size:14px;line-height:1.65;margin:8px 0}.foot{margin-top:10px}.price{font-size:18px;font-weight:700;color:$color-accent}.pagination{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;font-size:13px}.state{padding:36px 12px;text-align:center;color:$color-text-secondary;font-size:15px;line-height:1.7}
</style>
