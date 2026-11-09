<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage45Api,AfterSale,ReturnGuide,ReturnInfo} from '../../../business-common/stage45/types'
import {label,money,date,specification} from '../../../business-common/stage45/presentation'
import ProductImage from './ProductImage.vue'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
import Evidence from './Evidence.vue'
import OperationRecovery from './OperationRecovery.vue'
const props=defineProps<{api:Stage45Api;id:string;merchant?:boolean;refreshKey?:number}>()
const data=ref<AfterSale|null>(null),busy=ref(false),loading=ref(false),error=ref(''),notice=ref(''),action=ref(''),reason=ref(''),newFiles=ref<string[]>([]),uploading=ref(false)
const guide=ref<ReturnGuide>({method:'LOGISTICS',contact:'',phone:'',address:'',instructions:''}),returnInfo=ref<ReturnInfo>({method:'LOGISTICS',company:'',number:'',note:''})
let ticket=0
const name=()=> 'aftersale:'+props.id
async function load(){
 if(!props.id)return;const run=++ticket,owner=props.api.owner();loading.value=true;error.value=''
 try{const row=await props.api.read<AfterSale>('/aftersales/'+props.id);if(run!==ticket||owner!==props.api.owner())return;data.value=row;if(row.returnGuide)returnInfo.value.method=row.returnGuide.method;if(row.returnInfo&&!returnInfo.value.number&&!returnInfo.value.note)returnInfo.value={...row.returnInfo}}
 catch(e){if(run===ticket){data.value=null;error.value=e instanceof Error?e.message:'详情读取失败。'}}
 finally{if(run===ticket)loading.value=false}
}
function choose(value:string){action.value=value;error.value='';reason.value='';if(data.value?.returnGuide)guide.value={...data.value.returnGuide}}
async function perform(){
 const row=data.value,chosen=action.value;if(!row||busy.value||uploading.value||!row.actions.includes(chosen)||props.api.pending(name()))return;error.value=''
 if(['reject','dispute','exception','evidence'].includes(chosen)&&reason.value.trim().length<2){error.value='请填写至少2字的原因或说明。';return}
 const body:Record<string,unknown>={expectedVersion:row.version}
 if(reason.value.trim())body.reason=reason.value.trim()
 if(newFiles.value.length)body.files=newFiles.value
 if(chosen==='approve'&&row.type==='RETURN_REFUND'){
  if(!guide.value.contact.trim()||!guide.value.phone.trim()||guide.value.address.trim().length<2){error.value='请填写有效退回联系人、电话及地址／地点。';return}body.returnGuide=guide.value
 }
 if(chosen==='return'){
  if(returnInfo.value.method==='LOGISTICS'&&(!returnInfo.value.company?.trim()||!/^[A-Za-z0-9-]{1,80}$/.test(returnInfo.value.number||''))){error.value='请填写物流公司及有效单号。';return}
  if(returnInfo.value.method==='OFFLINE'&&(returnInfo.value.note||'').trim().length<2){error.value='请填写线下交回说明。';return}
  body.returnInfo=returnInfo.value.method==='LOGISTICS'?{method:'LOGISTICS',company:returnInfo.value.company?.trim(),number:returnInfo.value.number?.trim(),note:returnInfo.value.note?.trim()}:{method:'OFFLINE',note:returnInfo.value.note?.trim()}
 }
 const owner=props.api.owner(),choice=await uni.showModal({title:label(chosen),content:chosen==='receive'?'请确认已实际收到退回商品。确认仅形成退款条件，最终成功以资金结果为准。':chosen==='cancel'?'确认取消本次尚未进入资金处理的申请；已生效事实保留。':chosen==='approve'?'按原申请数量和金额同意；退货须实际收货，退款以最终资金结果为准。':'请核对原申请、当前状态及填写内容，确认后提交。'})
 if(!choice.confirm||owner!==props.api.owner())return;busy.value=true
 try{const result=await props.api.command<AfterSale>(name(),'/aftersales/'+row.id+'/'+chosen,body);if(result.id!==props.id||owner!==props.api.owner())return;data.value=result;action.value='';newFiles.value=[];reason.value='';notice.value='本次操作已提交，页面显示当前业务及资金事实。'}
 catch(e){error.value=e instanceof Error?e.message:'提交结果待核实，请回查原操作。'}
 finally{busy.value=false}
}
function recovered(){notice.value='已核对原操作，请以最新记录为准。';action.value='';load()}
function order(){if(data.value)uni.navigateTo({url:(props.merchant?'/pages/order/detail/index?id=':'/pages/mall/order-detail/index?id=')+data.value.orderId})}
watch(()=>[props.id,props.api.owner()],()=>{ticket++;data.value=null;action.value='';newFiles.value=[];reason.value='';notice.value='';load()},{immediate:true})
watch(()=>props.refreshKey,load)
onBeforeUnmount(()=>{ticket++;data.value=null;newFiles.value=[]})
</script>
<template><view class="s45">
<BaseCard v-if="error"><text class="error" role="alert">{{error}}</text><AppButton class="s45-action" variant="secondary" @click="load">重新读取</AppButton></BaseCard>
<OperationRecovery :api="api" :name="name()" @recovered="recovered"/>
<text v-if="notice" class="notice">{{notice}}</text><view v-if="loading&&!data" class="state">正在读取售后详情…</view>
<template v-if="data">
<view class="hero"><text class="hero-title">{{label(data.state)}}</text><text>{{data.storeName}}</text><text class="hero-meta">售后 {{data.sn}}</text><text class="hero-meta" v-if="data.dispute!=='NONE'">{{label(data.dispute)}}</text></view>
<BaseCard><text class="section">处理进度</text><view class="row"><text>业务处理</text><text>{{label(data.state)}}</text></view><view class="row"><text>资金处理</text><text>{{label(data.fundingState)}}</text></view><view class="row"><text>商品已成功退款</text><text class="price">¥{{money(data.refundedCent)}}</text></view><text class="muted">{{date(data.refundedAt)}}</text><text v-if="data.state==='WAIT_FUNDS'" class="notice">审核／收货已确认，正在按原付款处理；失败或结果未知仍保留原申请，请回查原操作或联系平台。</text><text v-if="data.overdue" class="notice">等待时间较长，已保留原状态；不会自动同意、收货或退款。</text><view v-for="event in data.timeline" :key="event.action+event.at" class="timeline"><text class="strong">{{label(event.action)}} · {{label(event.actor)}}</text><text v-if="event.reason">{{event.reason}}</text><text class="muted">{{date(event.at)}}</text></view></BaseCard>
<BaseCard><text class="section">原商品与申请</text><view class="goods"><ProductImage :api="api" :order-id="data.orderId" :item-id="data.orderItemId"/><view><text class="strong">{{data.goodsName}}</text><text class="muted">{{specification(data.specifications)}}</text><text>{{label(data.type)}} · {{data.quantity}} 件</text></view></view><view class="row"><text>申请商品退款</text><text class="price">¥{{money(data.amountCent)}}</text></view><view class="row"><text>关联订单</text><text>{{data.orderSn}}</text></view><view class="row"><text>所属合单</text><text>{{data.tradeSn}}</text></view><text class="muted">{{date(data.createdAt)}}</text><text class="notice">{{data.reason}}</text><Evidence v-if="data.files?.length" :api="api" :order-id="data.orderId" purpose="AFTERSALE" :model-value="data.files" readonly/></BaseCard>
<BaseCard v-if="data.returnGuide"><text class="section">已确认的退回方式</text><text class="strong">{{label(data.returnGuide.method)}} · {{data.returnGuide.contact}}</text><text>{{data.returnGuide.phone}}</text><text>{{data.returnGuide.address}}</text><text class="muted">{{data.returnGuide.instructions}}</text><text class="notice">按此快照退回；提交物流或交回说明不代表商户已收到实物。</text><template v-if="data.returnInfo"><view class="row"><text>退回记录</text><text>{{label(data.returnInfo.method)}}</text></view><text>{{data.returnInfo.company}} {{data.returnInfo.number}}</text><text>{{data.returnInfo.note}}</text></template></BaseCard>
<BaseCard v-if="data.feeObligations?.length"><text class="section">独立配送费退款</text><view v-for="fee in data.feeObligations" :key="fee.id" class="row"><text>¥{{money(fee.amountCent)}}</text><text>{{label(fee.state)}}</text></view><text class="muted">独立费用不追加到本项商品申请金额；以各项最终结果为准。</text></BaseCard>
<BaseCard v-if="data.actions.length&&!api.pending(name())"><text class="section">当前可办理</text><view class="buttons"><AppButton class="s45-action" v-for="option in data.actions.filter(v=>v!=='resolve')" :key="option" variant="secondary" :disabled="busy" @click="choose(option)">{{label(option)}}</AppButton></view>
<template v-if="action"><text class="strong">{{label(action)}}</text>
<template v-if="action==='approve'&&data.type==='RETURN_REFUND'"><view class="field"><text>退回方式 *</text><picker :range="['物流退回','商户确认的线下交回']" :value="guide.method==='LOGISTICS'?0:1" @change="guide.method=Number($event.detail.value)===0?'LOGISTICS':'OFFLINE'"><view class="picker">{{label(guide.method)}} ▾</view></picker></view><view class="field"><text>联系人 *</text><input v-model="guide.contact" maxlength="40"/></view><view class="field"><text>联系电话 *</text><input v-model="guide.phone" maxlength="24" type="text"/></view><view class="field"><text>地址／交回地点 *</text><textarea v-model="guide.address" maxlength="255"/></view><view class="field"><text>退回说明</text><textarea v-model="guide.instructions" maxlength="500"/></view></template>
<template v-if="action==='return'"><text class="notice">退回方式：{{label(returnInfo.method)}}</text><template v-if="returnInfo.method==='LOGISTICS'"><view class="field"><text>物流公司 *</text><input v-model="returnInfo.company" maxlength="80"/></view><view class="field"><text>物流单号 *</text><input v-model="returnInfo.number" maxlength="80"/></view></template><view class="field"><text>{{returnInfo.method==='OFFLINE'?'交回说明 *':'退回补充说明'}}</text><textarea v-model="returnInfo.note" maxlength="500"/></view></template>
<view class="field" v-if="action!=='cancel'"><text>原因／说明{{['reject','dispute','exception','evidence'].includes(action)?' *':'（选填）'}}</text><textarea v-model="reason" maxlength="500" :disabled="busy" placeholder="说明本次处理依据；拒绝、争议和补证必须填写"/></view>
<Evidence v-if="['dispute','exception','evidence'].includes(action)" v-model="newFiles" :api="api" :order-id="data.orderId" purpose="AFTERSALE" :readonly="busy" @busy="uploading=$event"/>
<view class="buttons"><AppButton class="s45-action" :loading="busy" :disabled="uploading||!data.actions.includes(action)" @click="perform">确认{{label(action)}}</AppButton><AppButton class="s45-action" variant="secondary" :disabled="busy" @click="action=''">暂不提交</AppButton></view>
</template></BaseCard>
<AppButton class="s45-action" variant="secondary" @click="load">查询最新状态</AppButton>
</template></view></template>
<style scoped lang="scss">@import './stage45.scss';</style>
