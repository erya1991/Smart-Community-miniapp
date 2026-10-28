import {computed,reactive,readonly,watch} from 'vue'
import {stage1Http,stage1Enabled,Stage1Error} from '../adapters/stage1-http'
import {useMerchantContext,merchantSessionRevision} from '../stores/merchant-context'
export {stage1Enabled,Stage1Error}
export type Data=Record<string,any>
export interface Page<T>{records:T[];total:number}
export interface BusinessContext {identityDomain:'STORE';memberId:string;storeId:string;clerkId:string;ownerFlag:boolean;permissions:readonly string[];authVersion:string;storeOperationalState:'OPEN'|'CLOSED';storeName?:string;closedReason?:string|null}
export const methodLabels:Record<string,string>={MERCHANT_DELIVERY:'商户配送',EXPRESS:'普通物流',COMMUNITY_PICKUP:'社区自提',STORE_REDEMPTION:'到店核销'}
const labels:Record<string,string>={...methodLabels,DRAFT:'草稿',SUBMITTED:'待审核',APPROVED:'已通过',REJECTED:'已驳回',OPEN:'营业中',CLOSED:'已关闭',UPPER:'已上架',DOWN:'已下架',CONFIRMED:'待生效',EFFECTIVE:'生效中',REPLACED:'已被续约替代',ACTIVE:'有效',DISABLED:'停用',REVOKED:'已撤权',INVITED:'待接受',WAIT_OWNER_CONFIRM:'待负责人确认',EXPIRED:'已失效',CANCELLED:'已取消',TERMINATED:'已终止',SCHEDULED:'待生效',BUSINESS_LICENSE:'营业执照',FOOD_LICENSE:'食品经营许可证',DUE_30:'30天内到期',DUE_7:'7天内到期',STORE_INACTIVE:'店铺已关闭',LICENSE_EXPIRED:'必要资质未生效或已失效',AGREEMENT_MISSING:'缺少生效合作协议',AGREEMENT_ATTACHMENT_UNAVAILABLE:'合作协议附件不可用，请联系平台核查',CATEGORY_NOT_ALLOWED:'类目范围未获准',RULE_MISSING:'缺少生效佣金规则',CHANNEL_PENDING:'真实渠道条件待核验',RECEIVER_UNVERIFIED:'平台接收关系待核验',SUB_MERCHANT_UNVERIFIED:'二级商户关系待核验',CHANNEL_LIMIT_UNVERIFIED:'渠道比例上限待核验',CONTENT_NOT_APPROVED:'商品内容未获批准',GOODS_UNLISTED:'商品未上架',GOODS_RESTRICTED:'商品处于监管下架',NO_EFFECTIVE_METHOD:'暂无有效履约方式',OUT_OF_STOCK:'可售库存不足',SKU_INCOMPLETE:'SKU资料不完整',MOCK_MODE_UNAVAILABLE:'当前环境未开放模拟模式'}
export const label=(value:unknown)=>value==null?'未填写':labels[String(value)]||String(value)
export const amount=(cent:number|null|undefined)=>cent==null?'未填写':(cent/100).toFixed(2)
export function cents(input:string):number|null {if(!input.trim())return null;if(!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(input))throw new Stage1Error('AMOUNT_INVALID',422);const [whole,fraction='']=input.split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>99999999)throw new Stage1Error('AMOUNT_INVALID',422);return n}
const authority=reactive({context:null as BusinessContext|null,loading:false,error:''})
let flight:Promise<void>|null=null
const identity=useMerchantContext()
watch(()=>[identity.state.identity?.memberId,identity.state.authenticated,identity.state.identity?.identity],()=>{authority.context=null})
async function refreshAuthority(){
  if(!stage1Enabled)return
  if(flight)return flight
  const run=async()=>{authority.loading=true;authority.error='';try{await identity.loadIdentity();if(identity.state.identity?.identity!=='STORE'){authority.context=null;return}const revision=merchantSessionRevision();const value=await stage1Http.read<BusinessContext>('/context');if(revision!==merchantSessionRevision()||identity.state.identity?.identity!=='STORE')throw new Stage1Error('STALE_OPERATION');const current=identity.state.identity;if(value.memberId!==current.memberId||value.storeId!==current.storeId||value.clerkId!==current.clerkId||value.ownerFlag!==(current.role==='OWNER')||!Array.isArray(value.permissions)||!value.permissions.every(p=>typeof p==='string')||!/^[a-f0-9]{64}$/.test(value.authVersion))throw new Stage1Error('INVALID_RESPONSE',503);authority.context=value}catch(e){authority.context=null;authority.error=e instanceof Error?e.message:'经营权限读取失败'}finally{authority.loading=false;flight=null}}
  flight=run();return flight
}
export function useStage1(){return {authority:readonly(authority),identity,refreshAuthority,has:(action:string)=>!!authority.context?.permissions.includes(action),applicant:computed(()=>identity.state.identity?.identity==='APPLICANT')}}
export const stage1Service={...stage1Http,application:()=>stage1Http.read<Data|null>('/application'),profile:()=>stage1Http.read<Data>('/profile'),options:()=>stage1Http.read<Data>('/admission-options'),eligibility:()=>stage1Http.read<Data>('/eligibility'),workbench:()=>stage1Http.read<Data>('/workbench')}
