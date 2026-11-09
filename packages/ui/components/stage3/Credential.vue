<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue'
import type {Stage3Api,Credential} from '../../../business-common/stage3/types'
import {blocked,date,opening} from '../../../business-common/stage3/presentation'
import BaseCard from '../BaseCard.vue'
import AppButton from '../AppButton.vue'
const props=defineProps<{api:Stage3Api;orderId:string;refreshKey?:number}>()
const value=ref<Credential|null>(null),error=ref(''),loading=ref(false);let ticket=0
function clear(){ticket++;value.value=null;error.value=''}
async function load(){if(!props.orderId)return;const run=++ticket,owner=props.api.owner();loading.value=true;value.value=null;error.value=''
 try{const result=await props.api.credential(props.orderId);if(run===ticket&&owner===props.api.owner())value.value=result}
 catch(e){if(run===ticket)error.value=e instanceof Error?e.message:'凭证暂不可用，请联系商户。'}finally{if(run===ticket)loading.value=false}}
watch(()=>[props.orderId,props.api.owner(),props.refreshKey],()=>{clear();load()},{immediate:true})
onBeforeUnmount(clear);defineExpose({clear,load})
</script>
<template><view class="s3-view credential"><BaseCard v-if="value?.point"><text class="s3-text section">{{value.point.name}}</text><text class="s3-text">{{value.point.address}}</text><text class="s3-text meta">{{opening(value.point)}}</text><text class="s3-text">{{value.point.instructions||'请在现场核对商品与数量，再由有权工作人员确认核销。'}}</text></BaseCard>
<BaseCard class="code-card"><text class="s3-text section">提货 / 到店核销凭证</text><text v-if="loading" class="s3-text state">正在读取本人凭证…</text><template v-else-if="value?.status==='ACTIVE'"><image :src="value.qrData" mode="aspectFit" class="qr"/><text class="s3-text manual">{{value.manualCode?.match(/.{1,5}/g)?.join(' ')}}</text><text class="s3-text meta">二维码与上方手输码为同一凭证。请向当前订单点位工作人员出示，查询后仍需人工确认。</text></template><template v-else-if="value?.status==='USED'"><text class="s3-text used">本单已经完成核销</text><text class="s3-text">{{date(value.usedAt)}}</text></template><text v-else-if="value" class="s3-text error">{{blocked(value.reason||null)||'凭证尚未就绪，请查看原订单进度。'}}</text><text v-if="error" class="s3-text error" role="alert">{{error}}</text><AppButton variant="secondary" :loading="loading" @click="load">查询凭证状态</AppButton></BaseCard><text class="s3-text privacy">凭证仅供本人现场使用，请妥善保管。</text></view></template>
<style scoped lang="scss">
.credential{display:flex;flex-direction:column;gap:16px;font-size:15px;line-height:1.7}.section{font-size:18px;font-weight:700;display:block;margin-bottom:12px}.credential :deep(.base-card)>.s3-text{display:block;overflow-wrap:anywhere}.code-card{text-align:center}.qr{width:260px;max-width:100%;height:260px;display:block;margin:12px auto}.manual{display:block;font-size:22px;letter-spacing:1px;font-weight:700;margin:20px 0;overflow-wrap:anywhere}.meta{color:$color-text-secondary;font-size:14px}.error{color:$color-error;margin:12px 0}.used{font-size:21px;color:$color-primary;font-weight:700}.privacy{font-size:14px;color:$color-text-secondary;text-align:center}.state{padding:30px}
</style>
