import {reactive,readonly,watch} from 'vue'
import type {Stage3Context} from './stage3-route-guard'
import {createStage3Api} from '../../../../packages/business-common/stage3/client'
import {merchantStage3Request,merchantOperationOwner,merchantSessionRevision,useMerchantContext} from '../stores/merchant-context'
export const stage3Enabled=import.meta.env.VITE_STAGE3_ENABLED==='true'
export const stage3Api=createStage3Api({enabled:stage3Enabled,prefix:'/store/p0/s3',partition:String(import.meta.env.VITE_MERCHANT_API_BASE_URL),
 owner:()=>{const {state}=useMerchantContext();return (state.authenticated&&state.identity?.identity==='STORE'?state.identity.storeId+':'+state.identity.clerkId:'anonymous')+':'+merchantOperationOwner()+':'+merchantSessionRevision()},
 request:merchantStage3Request,storage:{get:k=>uni.getStorageSync(k),set:(k,v)=>uni.setStorageSync(k,v),remove:k=>uni.removeStorageSync(k)}})

const access=reactive({context:null as Stage3Context|null,loading:false,error:''})
let accessFlight:Promise<void>|null=null
watch(()=>stage3Api.owner(),()=>{access.context=null})
async function refreshStage3Access(){
 if(!stage3Enabled)return
 if(accessFlight)return accessFlight
 access.context=null;access.loading=true;access.error=''
 const run=async()=>{try{const identity=useMerchantContext();await identity.loadIdentity();const current=identity.state.identity;if(current?.identity!=='STORE')return
  const value=await stage3Api.context();if(value.memberId!==current.memberId||value.storeId!==current.storeId||value.clerkId!==current.clerkId||!Array.isArray(value.permissions)||!value.permissions.every(p=>typeof p==='string'))throw Error('订单权限响应无法核实，请重新登录。')
  access.context=value
 }catch(error){access.context=null;access.error=error instanceof Error?error.message:'订单权限读取失败。'}finally{access.loading=false;accessFlight=null}}
 accessFlight=run();return accessFlight
}
export function useStage3Access(){return {access:readonly(access),refreshStage3Access}}
