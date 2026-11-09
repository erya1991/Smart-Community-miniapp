<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage3Api,Candidate,Receipt} from '../../../business-common/stage3/types'
import {label,date} from '../../../business-common/stage3/presentation'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
const props=defineProps<{api:Stage3Api;refreshKey?:number}>()
const points=ref<{id:string;name:string;type:string}[]>([]),point=ref(''),code=ref(''),candidate=ref<Candidate|null>(null),receipt=ref<Receipt|null>(null),error=ref(''),busy=ref(false),queried=ref(false)
const pending=ref(false)
let ticket=0
function clear(){ticket++;pending.value=false;code.value='';candidate.value=null;receipt.value=null;error.value='';busy.value=false}
async function loadPoints(){const owner=props.api.owner();try{const values=await props.api.points();if(owner!==props.api.owner())return;points.value=values;if(!points.value.some(p=>p.id===point.value))point.value=points.value[0]?.id||''}catch(e){error.value=e instanceof Error?e.message:'无法读取当前作业点位。'}}
function changedPoint(event:any){point.value=points.value[Number(event.detail.value)].id;pending.value=false;candidate.value=null;receipt.value=null;ticket++}
async function lookup(){
 if(busy.value)return;candidate.value=null;receipt.value=null;error.value=''
 if(!point.value||!code.value.trim()){error.value='请先选择当前实际作业点位，并扫码或输入居民凭证。';return}
 const run=++ticket,owner=props.api.owner();busy.value=true
 try{const result=await props.api.lookup(code.value.trim(),point.value);if(run===ticket&&owner===props.api.owner())candidate.value=result}catch(e){if(run===ticket)error.value=e instanceof Error?e.message:'凭证查询失败。'}finally{if(run===ticket){busy.value=false;syncPending()}}
}
function scan(){if(busy.value)return;uni.scanCode({scanType:['qrCode'],success:result=>{code.value=result.result;lookup()},fail:()=>{error.value='扫码未完成，可使用下方手输码查询。'}})}
const commandKey=()=>candidate.value?'verify:'+candidate.value.orderId:''
function syncPending(){pending.value=!!candidate.value&&props.api.pending(commandKey())}
async function confirm(){
 const current=candidate.value;if(busy.value||current?.status!=='READY'||!current.confirmationContext)return
 const owner=props.api.owner();busy.value=true;error.value=''
 try{const result=await uni.showModal({title:'确认现场核销',content:'请核对本店、当前点位、商品和数量，并确认已向居民交付本单商品。确认后凭证只能形成一次成功结果。'})
  if(!result.confirm||owner!==props.api.owner()||candidate.value!==current)return
  receipt.value=await props.api.command(commandKey(),'/verify/confirm',{expectedVersion:current.version,confirmationContext:current.confirmationContext})
  candidate.value=null;code.value='';queried.value=false
 }catch(e){error.value=e instanceof Error?e.message:'核销结果待确认，请回查原操作。'}finally{busy.value=false;syncPending()}
}
async function recover(retry=false){if(busy.value||!candidate.value)return;busy.value=true;error.value=''
 try{receipt.value=retry?await props.api.retry(commandKey()):await props.api.recover(commandKey());candidate.value=null;code.value='';queried.value=false}catch(e){queried.value=true;error.value=e instanceof Error?e.message:'原核销尚待核实。'}finally{busy.value=false;syncPending()}}
watch(()=>props.api.owner(),()=>{clear();points.value=[];point.value='';loadPoints()},{immediate:true})
watch(()=>props.refreshKey,()=>{clear();loadPoints()})
function changedCode(){pending.value=false;candidate.value=null;receipt.value=null}
onBeforeUnmount(clear);defineExpose({clear})
</script>
<template><view class="s3-view verification"><BaseCard><text class="s3-text section">当前作业点位</text><picker :disabled="busy" :range="points.map(p=>p.name+' · '+label(p.type))" :value="points.findIndex(p=>p.id===point)" @change="changedPoint"><view class="s3-view picker">{{points.find(p=>p.id===point)?.name||'暂无有权核销点位'}} ▾</view></picker></BaseCard>
<BaseCard><text class="s3-text section">现场核销</text><text class="s3-text meta">扫描居民凭证或输入手输码，查询后核对商品与点位，再单独确认。</text><AppButton :disabled="busy||!point" @click="scan">扫码查询凭证</AppButton><view class="s3-view manual"><input class="s3-input" v-model="code" :disabled="busy" maxlength="64" @input="changedCode" placeholder="输入提货 / 核销凭证"/><AppButton :loading="busy" variant="secondary" @click="lookup">查询</AppButton></view><text v-if="error" class="s3-text error" role="alert">{{error}}</text></BaseCard>
<BaseCard v-if="candidate"><text class="s3-text section">{{candidate.status==='USED'?'已核销，禁止重复操作':'订单信息核对'}}</text><template v-if="candidate.status==='READY'"><text class="s3-text strong">{{candidate.storeName}}</text><text class="s3-text">{{candidate.point?.name}} · {{candidate.point?.address}}</text><view v-for="item in candidate.items" :key="item.skuId" class="s3-view item"><text class="s3-text">{{item.name}} · {{item.specifications||'默认规格'}}</text><text class="s3-text strong">×{{item.quantity}}</text></view><text class="s3-text meta">查询未改变订单。请核对后再确认核销。</text><text v-if="pending" class="s3-text error">本次核销结果尚未确认，请先回查原核销，勿重复交付。</text><view v-if="pending" class="s3-view buttons"><AppButton :loading="busy" @click="recover()">回查原核销</AppButton><AppButton v-if="queried" :disabled="busy" variant="secondary" @click="recover(true)">重试原请求</AppButton></view><view v-else class="s3-view buttons"><AppButton variant="secondary" :disabled="busy" @click="candidate=null">取消 / 重扫</AppButton><AppButton :loading="busy" @click="confirm">确认核销</AppButton></view></template><template v-else><text class="s3-text">原核销时间：{{date(candidate.completedAt)}}</text><text class="s3-text">原操作人：{{candidate.operatorId}}</text></template></BaseCard>
<BaseCard v-if="receipt"><text class="s3-text success">核销已完成</text><text class="s3-text">记录 {{receipt.verificationId}}</text><text class="s3-text">{{date(receipt.completedAt)}}</text><text class="s3-text meta">以服务端唯一核销记录为准，凭证不可重复使用。</text></BaseCard></view></template>
<style scoped lang="scss">
.verification{display:flex;flex-direction:column;gap:16px;font-size:15px;line-height:1.65}.section{display:block;font-size:18px;font-weight:700;margin-bottom:12px}.picker{padding:12px;background:$color-group-bg;min-height:44px;box-sizing:border-box;border-radius:10px}.manual{display:flex;gap:8px;margin-top:16px}.manual :deep(.app-button){flex:0 0 auto;width:auto}.manual .s3-input{min-width:0;flex:1;height:46px;border:1px solid $color-border;border-radius:10px;background:$color-group-bg;padding:0 12px;font-size:15px}.meta{display:block;color:$color-text-secondary;font-size:14px;margin:12px 0}.error{display:block;color:$color-error;margin-top:12px}.strong{font-weight:600}.item{display:flex;gap:12px;justify-content:space-between;padding:14px 0;border-bottom:1px solid $color-border}.buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}.buttons :deep(.app-button){flex:1;min-width:120px}.success{display:block;font-size:21px;color:$color-primary;font-weight:700}.verification :deep(.base-card)>.s3-text{display:block;overflow-wrap:anywhere}
</style>
