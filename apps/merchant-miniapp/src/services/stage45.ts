import {reactive,readonly,watch} from 'vue'
import type {Stage45Context} from './stage45-route-guard'
import {useMerchantContext} from '../stores/merchant-context'
import {createStage45Api} from '../../../../packages/business-common/stage45/client'
import {merchantStage3Request,merchantStage45Upload,merchantStage45Asset,merchantOperationOwner,merchantSessionRevision} from '../stores/merchant-context'
export const stage45Enabled=import.meta.env.VITE_STAGE45_ENABLED==='true'
export const stage45Api=createStage45Api({enabled:stage45Enabled,prefix:'/store/p0/s45',partition:String(import.meta.env.VITE_MERCHANT_API_BASE_URL),owner:()=>String(merchantOperationOwner())+':'+merchantSessionRevision(),request:merchantStage3Request,upload:merchantStage45Upload,asset:merchantStage45Asset,storage:{get:k=>uni.getStorageSync(k),set:(k,v)=>uni.setStorageSync(k,v),remove:k=>uni.removeStorageSync(k)}})
const access=reactive({context:null as Stage45Context|null,loading:false,error:''})
let sequence=0,flight:Promise<void>|null=null,flightOwner=''
watch(()=>stage45Api.owner(),()=>{sequence++;access.context=null;access.error=''})
async function refreshStage45Access(){
 if(!stage45Enabled)return
 const owner=stage45Api.owner()
 if(flight&&flightOwner===owner)return flight
 const ticket=++sequence;flightOwner=owner;access.context=null;access.loading=true;access.error=''
 const work=async()=>{try{const identity=useMerchantContext();await identity.loadIdentity();const current=identity.state.identity;if(current?.identity!=='STORE')return
 const value=await stage45Api.read<Stage45Context>('/context')
 if(value.memberId!==current.memberId||value.storeId!==current.storeId||value.clerkId!==current.clerkId||!Array.isArray(value.permissions)||!value.permissions.every(p=>typeof p==='string'))throw Error('售后与资金权限响应无法核实。')
 if(ticket===sequence)access.context=value
 }catch(e){if(ticket===sequence){access.context=null;access.error=e instanceof Error?e.message:'售后与资金权限读取失败。'}}finally{if(ticket===sequence)access.loading=false;if(flightOwner===owner)flight=null}}
 flight=work();return flight
}
export function useStage45Access(){return {access:readonly(access),refreshStage45Access}}

