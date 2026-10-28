import {ref,computed,provide,onBeforeUnmount} from 'vue'
import {onBackPress} from '@dcloudio/uni-app'
import {stage1Service,Stage1Error,useStage1} from './stage1'
export function useStage1Page(key:string){
 const error=ref(''),busy=ref(false),loading=ref(false),pending=ref(stage1Service.pending(key)),dirty=ref(false);let generation=0
 const business=useStage1(),uploads=ref<Record<string,boolean>>({}),uploading=computed(()=>Object.values(uploads.value).some(Boolean))
 provide('stage1-upload-activity',(scope:string,active:boolean)=>{uploads.value={...uploads.value,[scope]:active}})
 async function read<T>(loader:()=>Promise<T>,accept:(value:T)=>void){if(uploading.value){error.value='请先核实当前附件上传结果。';return}const ticket=++generation,discardRequested=dirty.value;loading.value=true;error.value='';try{await business.refreshAuthority();const value=await loader();if(ticket===generation&&(!dirty.value||discardRequested)&&!uploading.value)accept(value)}catch(e){if(ticket===generation)error.value=e instanceof Error?e.message:'读取失败，请重试'}finally{if(ticket===generation){loading.value=false;pending.value=stage1Service.pending(key)}}}
 async function write<T>(action:()=>Promise<T>,accept?:(value:T)=>void|Promise<void>){if(busy.value||uploading.value)return;generation++;loading.value=false;busy.value=true;error.value='';try{const value=await action();await accept?.(value);dirty.value=false;return value}catch(e){error.value=e instanceof Error?e.message:'操作失败，请重试';return undefined}finally{pending.value=stage1Service.pending(key);busy.value=false}}
 const command=<T>(path:string,body:Record<string,unknown>,method:'POST'|'PUT'='POST')=>stage1Service.command<T>(key,path,body,method)
 const recover=<T>(accept:(value:T)=>void)=>write(()=>stage1Service.recover<T>(key),accept)
 const retry=<T>(accept:(value:T)=>void)=>write(()=>stage1Service.retry<T>(key),accept)
 async function abandon<T>(accept:(value:T)=>void){const answer=await uni.showModal({title:'核实并关闭未提交请求？',content:'服务端若已提交，将返回原结果；若未提交，将关闭原操作标识，防止晚到请求继续写入。业务资料不会被撤销。'});if(answer.confirm)return write(()=>stage1Service.abandon<T>(key),accept)}
 onBeforeUnmount(()=>{generation++})
 let leaving=false
 onBackPress(()=>{if(leaving||!dirty.value&&!pending.value&&!uploading.value)return false;uni.showModal({title:'离开当前页面？',content:pending.value||uploading.value?'提交或附件结果尚未确认，建议先回查。':'当前有未保存内容。确认离开将丢失本页未保存输入。',success:r=>{if(r.confirm){leaving=true;uni.navigateBack()}}});return true})
 return {error,busy:computed(()=>busy.value||uploading.value),loading,pending,dirty,read,write,command,recover,retry,abandon,...business}
}
