<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage3Api,Order} from '../../../business-common/stage3/types'
import {Stage3Error} from '../../../business-common/stage3/client'
import {label,money,date,blocked,opening} from '../../../business-common/stage3/presentation'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
import StatusTag from '../StatusTag.vue'
const props=defineProps<{api:Stage3Api;orderId:string;merchant?:boolean;refreshKey?:number}>()
const emit=defineEmits<{credential:[id:string];pay:[tradeId:string]}>()
const order=ref<Order|null>(null),loading=ref(false),busy=ref(false),error=ref(''),notice=ref(''),company=ref(''),waybill=ref(''),note=ref(''),exception=ref(''),exceptionType=ref('OTHER'),showException=ref(false),queriedUnknown=ref(false)
const exceptions=['DELIVERY_DISPUTE','DELIVERY_UNAVAILABLE','WAYBILL_ERROR','POINT_UNAVAILABLE','PICKUP_DISPUTE','OTHER']
let ticket=0
const key=()=> 'order:'+props.orderId
async function load(){
 if(!props.orderId)return;const run=++ticket,owner=props.api.owner();loading.value=true;error.value=''
 try{const data=await props.api.detail(props.orderId);if(run!==ticket||owner!==props.api.owner())return;order.value=data}
 catch(e){if(run===ticket){order.value=null;error.value=e instanceof Error?e.message:'订单读取失败。'}}
 finally{if(run===ticket)loading.value=false}
}
function can(action:string){return !!order.value?.allowedActions.includes(action)}
async function perform(action:string){
 if(busy.value||!order.value)return
 const model=order.value,owner=props.api.owner(),payload:Record<string,unknown>={expectedVersion:model.version}
 if(action==='ship'){if(!company.value.trim()||!/^[A-Za-z0-9-]{1,80}$/.test(waybill.value.trim())){error.value='请填写物流公司和有效运单号，单号支持字母、数字及短横线，最多80位。';return}payload.company=company.value.trim();payload.number=waybill.value.trim()}
 else if(action==='exceptions'){if(exception.value.trim().length<2){error.value='请填写至少2个字的异常说明。';return}payload.type=exceptionType.value;payload.reason=exception.value.trim()}
 else if(note.value.trim())payload.note=note.value.trim()
 busy.value=true;error.value='';notice.value=''
 try{const choice=await uni.showModal({title:action==='exceptions'?'记录履约异常':label(action),content:action==='ship'?'确认本单物流公司和运单号无误。发货后仅保留原运单，可记录异常并联系协调。':action==='delivered'?'确认商品已经送达。此操作后等待居民本人确认收货。':action==='receive'?'请确认已收到本店全部商品。确认后本店子单完成。':action==='exceptions'?'异常记录会保留，订单付款、地址、点位和履约状态保持原事实。':'请核对本店商品和履约信息，确认后提交本次操作。'})
  if(!choice.confirm||owner!==props.api.owner()||model.orderId!==props.orderId)return
  await props.api.command(key(),'/orders/'+model.orderId+'/'+action,payload)
  notice.value='操作已提交，正在读取订单最新结果。';note.value='';exception.value='';showException.value=false;queriedUnknown.value=false;await load()
 }catch(e){error.value=e instanceof Error?e.message:'提交结果尚未确认，请回查原操作。'}
 finally{busy.value=false}
}
async function recover(retry=false){
 if(busy.value)return;busy.value=true;error.value=''
 try{if(retry)await props.api.retry(key());else await props.api.recover(key());notice.value='已找到原操作，订单以最新读取为准。';queriedUnknown.value=false;await load()}
 catch(e){error.value=e instanceof Error?e.message:'原操作尚待核实。';queriedUnknown.value=true}
 finally{busy.value=false}
}
function copy(value:string){uni.setClipboardData({data:value})}
watch(()=>[props.orderId,props.api.owner()],()=>{ticket++;order.value=null;error.value='';notice.value='';company.value='';waybill.value='';note.value='';exception.value='';showException.value=false;queriedUnknown.value=false;load()},{immediate:true})
watch(()=>props.refreshKey,load)
onBeforeUnmount(()=>{ticket++;order.value=null})
defineExpose({load})
</script>
<template>
 <view class="s3-view detail">
  <BaseCard v-if="error"><text class="s3-text error" role="alert">{{error}}</text><AppButton v-if="!api.pending(key())" variant="secondary" @click="load">重新读取</AppButton></BaseCard>
  <BaseCard v-if="api.pending(key())"><text class="s3-text error">本单有一项提交结果尚未确认，请先回查原操作。</text><view class="s3-view buttons"><AppButton :loading="busy" @click="recover()">回查原操作</AppButton><AppButton v-if="queriedUnknown" variant="secondary" :disabled="busy" @click="recover(true)">重试原请求</AppButton></view></BaseCard>
  <text v-if="notice" class="s3-text notice">{{notice}}</text>
  <view v-if="loading&&!order" class="s3-view state">正在读取订单…</view>
  <template v-if="order">
   <view class="s3-view hero"><view class="s3-view hero-head"><text class="s3-text phase">{{order.fulfillmentEnded?'未交付商品已退清，履约结束':label(order.phase)}}</text><StatusTag tone="pending">{{label(order.method)}}</StatusTag></view><text class="s3-text">{{order.storeName}}</text><text class="s3-text hero-meta">订单 {{order.orderSn}}</text><text class="s3-text hero-meta">模拟交易 · {{label(order.paymentStatus)}}</text></view>
   <BaseCard v-if="order.blockedReason"><text class="s3-text error">{{blocked(order.blockedReason)}}</text><AppButton variant="secondary" @click="load">查询最新状态</AppButton></BaseCard>
   <BaseCard><text class="s3-text section">履约进度</text><view class="s3-view timeline"><view class="s3-view"><text class="s3-text dot">●</text><view class="s3-view"><text class="s3-text">{{label(order.paymentStatus)}}</text><text class="s3-text meta">{{date(order.paidAt)}}</text></view></view><view class="s3-view" v-for="event in order.timeline" :key="event.type+event.at"><text class="s3-text dot">●</text><view class="s3-view"><text class="s3-text">{{label(event.type)}}</text><text class="s3-text meta">{{date(event.at)}}</text></view></view></view></BaseCard>
   <BaseCard><text class="s3-text section">{{order.point?'提货 / 核销点位':'配送与收货信息'}}</text>
    <template v-if="order.point"><text class="s3-text strong">{{order.point.name}}</text><text class="s3-text">{{order.point.address}}</text><text class="s3-text meta">{{opening(order.point)}}</text><text class="s3-text" v-if="order.point.instructions">{{order.point.instructions}}</text><text v-if="!order.pointAvailable" class="s3-text error">当前点位不可交付，请联系商户协调。成交点位保持原记录。</text></template>
    <template v-else><text class="s3-text strong">{{order.contact.name}} {{order.contact.mobile}}</text><text class="s3-text">{{order.address?.region}} {{order.address?.detail}}</text></template>
    <view class="s3-view remark"><text class="s3-text meta">买家下单留言</text><text class="s3-text">{{order.buyerRemark||'无'}}</text></view>
    <view v-if="merchant" class="s3-view remark"><text class="s3-text meta">商户内部备注（只读）</text><text class="s3-text">{{order.merchantRemark||'无已有备注'}}</text></view>
   </BaseCard>
   <BaseCard><text class="s3-text section">商品与金额</text><view v-for="item in order.items" :key="item.skuId" class="s3-view item"><view class="s3-view"><text class="s3-text strong">{{item.name}}</text><text class="s3-text meta">{{item.specifications||'默认规格'}} · 剩余履约 {{item.quantity}} 件</text></view><text class="s3-text">¥{{money(item.unitPriceCent)}}</text></view>
    <view class="s3-view row"><text class="s3-text">商品金额</text><text class="s3-text">¥{{money(order.goodsCent)}}</text></view><view class="s3-view row"><text class="s3-text">配送 / 物流费</text><text class="s3-text">¥{{money(order.freightCent)}}</text></view><view class="s3-view row"><text class="s3-text">订单金额</text><text class="s3-text">¥{{money(order.amountCent)}}</text></view><view class="s3-view row"><text class="s3-text strong">实际已付</text><text class="s3-text price">{{order.paidAmountCent==null?'待核实':'¥'+money(order.paidAmountCent)}}</text></view>
   </BaseCard>
   <BaseCard v-if="order.method==='EXPRESS'"><text class="s3-text section">物流信息</text><template v-if="order.logistics.shippedAt"><text class="s3-text">{{order.logistics.company}}</text><view class="s3-view row"><text class="s3-text">运单号 {{order.logistics.number}}</text><AppButton variant="secondary" size="compact" @click="copy(order.logistics.number||'')">复制单号</AppButton></view><text class="s3-text meta">{{date(order.logistics.shippedAt)}}</text><text class="s3-text meta">展示已登记发货信息；运单异常请联系商户协调。</text></template><text v-else class="s3-text meta">尚未登记发货。</text></BaseCard>
   <BaseCard><text class="s3-text section">订单详情</text><view class="s3-view row"><text class="s3-text">所属合单</text><text class="s3-text">{{order.tradeSn}}</text></view><view class="s3-view row"><text class="s3-text">订单编号</text><text class="s3-text">{{order.orderSn}}</text></view><view class="s3-view row"><text class="s3-text">创建时间</text><text class="s3-text">{{date(order.createdAt)}}</text></view><view class="s3-view row"><text class="s3-text">付款时间</text><text class="s3-text">{{date(order.paidAt)}}</text></view><view class="s3-view row"><text class="s3-text">完成时间</text><text class="s3-text">{{date(order.completedAt)}}</text></view></BaseCard>
   <BaseCard v-if="order.exceptions?.length"><text class="s3-text section">履约异常记录</text><view v-for="entry in order.exceptions" :key="entry.at" class="s3-view exception"><text class="s3-text strong">{{label(entry.type)}}</text><text class="s3-text">{{entry.reason}}</text><text class="s3-text meta">{{date(entry.at)}}</text></view></BaseCard>
   <BaseCard v-if="merchant&&!api.pending(key())"><text class="s3-text section">处理本店订单</text>
    <template v-if="can('ship')"><view class="s3-view field"><text class="s3-text">物流公司 *</text><input class="s3-input" v-model="company" :disabled="busy" maxlength="80" placeholder="填写承运公司"/></view><view class="s3-view field"><text class="s3-text">运单号 *</text><input class="s3-input" v-model="waybill" :disabled="busy" maxlength="80" placeholder="核对后填写完整运单号"/></view><text class="s3-text meta">提交前可修改表单；确认发货后只读。</text></template>
    <view v-if="order.allowedActions.length" class="s3-view field"><text class="s3-text">本次履约说明（选填）</text><textarea class="s3-textarea" v-model="note" :disabled="busy" maxlength="500" auto-height placeholder="填写与本次履约有关的说明"/></view>
    <view class="s3-view buttons"><AppButton v-for="action in order.allowedActions" :key="action" :loading="busy" @click="perform(action)">{{label(action)}}</AppButton></view>
    <text v-if="!order.allowedActions.length" class="s3-text meta">当前无可执行的配送或发货操作。</text>
    <AppButton v-if="order.canRecordException" variant="secondary" :disabled="busy" @click="showException=!showException">记录履约异常</AppButton>
    <view v-if="showException" class="s3-view exception-form"><picker :range="exceptions.map(label)" @change="exceptionType=exceptions[Number($event.detail.value)]"><view class="s3-view picker">{{label(exceptionType)}} ▾</view></picker><view class="s3-view field"><text class="s3-text">异常说明 *</text><textarea class="s3-textarea" v-model="exception" :disabled="busy" maxlength="500" auto-height placeholder="说明当前问题，联系商户或人工协调"/></view><AppButton :disabled="busy" @click="perform('exceptions')">确认记录异常</AppButton></view>
   </BaseCard>
   <view v-if="!merchant&&!api.pending(key())" class="s3-view buttons"><AppButton v-if="can('receive')" :loading="busy" @click="perform('receive')">确认收到本店商品</AppButton><AppButton v-if="order.eligible&&!order.blockedReason&&['WAIT_PICKUP','WAIT_VERIFY'].includes(order.phase)" @click="emit('credential',order.orderId)">出示提货 / 核销凭证</AppButton><AppButton v-if="['WAIT_PAY','PAY_CONFIRMING','CLOSE_CONFIRMING'].includes(order.tradeStatus)" variant="secondary" @click="emit('pay',order.tradeId)">查看原交易付款状态</AppButton></view>
  </template>
 </view>
</template>
<style scoped lang="scss">
.detail{display:flex;flex-direction:column;gap:16px;padding-bottom:24px;font-size:15px;line-height:1.65}.detail .s3-text{overflow-wrap:anywhere}.detail :deep(.base-card)>.s3-text{display:block}.hero{background:$color-primary;color:white;border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:8px}.hero-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.phase{font-size:24px;font-weight:700}.hero-meta{font-size:13px;opacity:.86}.section{display:block;font-size:17px;font-weight:700;margin-bottom:16px;border-left:4px solid $color-primary;padding-left:10px}.strong{font-weight:600}.meta{display:block;color:$color-text-secondary;font-size:13px}.error{display:block;color:$color-error;margin:8px 0}.notice{color:$color-primary;font-size:14px}.row{display:flex;justify-content:space-between;gap:16px;padding:8px 0}.row>.s3-text:last-child{max-width:70%;text-align:right}.item{display:flex;justify-content:space-between;gap:12px;margin:12px 0;padding-bottom:12px;border-bottom:1px solid $color-border}.item>.s3-view{min-width:0;flex:1}.price{color:$color-accent;font-size:21px;font-weight:700}.remark{background:$color-group-bg;border-radius:10px;padding:12px;margin-top:12px}.remark>.s3-text{display:block}.timeline>.s3-view{display:flex;gap:12px;padding:8px 0}.dot{color:$color-primary}.field{margin:12px 0}.field>.s3-text{display:block;margin-bottom:8px}.field .s3-input,.field .s3-textarea{box-sizing:border-box;width:100%;background:$color-group-bg;border:1px solid $color-border;border-radius:10px;padding:12px;font-size:15px;min-height:46px}.buttons{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.buttons :deep(.app-button){flex:1;min-width:140px}.picker{padding:12px;background:$color-group-bg;min-height:44px;box-sizing:border-box}.exception{padding:12px 0;border-top:1px solid $color-border}.exception>.s3-text{display:block}.exception-form{margin-top:16px}.state{text-align:center;padding:40px 16px;color:$color-text-secondary}
</style>
