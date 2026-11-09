import { merchantBusinessRequest, merchantBusinessUpload, merchantBusinessPreview, merchantSessionRevision, merchantOperationOwner } from '../stores/merchant-context'
import { MerchantError } from '../services/merchant-session'
import type { MerchantResponse } from '../services/merchant-session'

export const stage1Enabled = import.meta.env.VITE_STAGE1_ENABLED === 'true'
const messages: Record<string,string> = {
  ENABLED_POINT_REQUIRED:'请先在下方新增并启用对应类型的点位，再启用社区自提或到店核销。',POINT_INCOMPLETE:'点位资料未完整，请核对地址、联系人和营业时段。',DELIVERY_SCOPE_REQUIRED:'请为商户配送或普通物流选择可配送区县。',VERSION_CONFLICT:'资料已更新，请保留输入并读取最新版本。',REVIEW_VERSION_CONFLICT:'审核内容已变化，请重新核对。',
  IDEMPOTENCY_CONFLICT:'操作标识已用于其他内容，请回查原操作。',UNKNOWN:'本次提交结果尚未确认，请先回查。',
  STALE_OPERATION:'登录身份已变化，请重新读取资料。',RESOURCE_NOT_FOUND:'对象不存在或不在当前可访问范围。',
  BASIC_NOT_ELIGIBLE:'经营基础条件未满足，请查看资格详情。',GOODS_REVIEW_PENDING:'商品正在审核，暂不能修改内容。',
  OCCUPANCY_UNKNOWN:'库存占用来源待核实，暂不能调整。',FILE_UNAVAILABLE:'附件不可用，请重新选择并上传。',
  SESSION_REQUIRED:'请先通过正常入口登录商户身份。',SESSION_REJECTED:'登录或授权已失效，请重新登录并核实当前店铺授权。',
  OWNER_REQUIRED:'只有当前店铺负责人可以管理工作人员。',CHANNEL_PENDING:'真实渠道条件仍待核验。',
  RETRY_REQUIRES_ORIGINAL_INPUT:'应用已重新打开，本机不保留原提交资料。请先回查结果；尚未提交的操作需核对原内容后恢复。',
  OPERATION_STORAGE_UNAVAILABLE:'无法保存本次操作标识，尚未发出请求。请检查本机存储。',
  OPERATION_ABANDONED:'服务端已确认关闭该未提交请求，未改变业务资料。可核对输入后重新提交。',
  RECEIPT_PERMISSION_CHANGED:'当前权限已变化，原操作事实仍保留；请由有权人员核对业务结果。',
}
export class Stage1Error extends Error {
  constructor(public code:string,public status=0,public details:unknown=null,public unknown=false){super(messages[code]||(status===403?'当前身份无权执行此操作。':status===409?'状态或版本已变化，请核对最新资料。':status===422?'请检查必填字段、格式和业务条件。':'服务暂不可用，请稍后重试。'));this.name='Stage1Error'}
}
let sequence=0
function requestId(){return 'M1_'+Date.now().toString(36)+'_'+(++sequence).toString(36)+'_'+Math.random().toString(36).slice(2,14)}
function active(){if(!stage1Enabled)throw new Stage1Error('STAGE1_NOT_CONFIGURED',503)}
function decode<T>(response:MerchantResponse):T {
  const data=response.data as Record<string,unknown>|null
  if(response.status===200&&data?.success===true&&['SUCCESS',200].includes(data.code as string|number))return data.result as T
  throw new Stage1Error(String(data?.code||data?.message||'INVALID_RESPONSE'),response.status===200?422:response.status,data,response.status>=500)
}
export async function readStage1<T>(path:string,query?:Record<string,unknown>):Promise<T>{active();const parameters=query?Object.fromEntries(Object.entries(query).filter(([,value])=>value!==undefined&&value!==null)):undefined;try{return decode<T>(await merchantBusinessRequest(path,'GET',parameters))}catch(error){if(error instanceof Stage1Error||error instanceof MerchantError)throw error;throw new Stage1Error('READ_UNAVAILABLE',503)}}
type Command={path:string;method:'POST'|'PUT';body:Record<string,unknown>;revision:number;filePath?:string;restored?:boolean;partition:string}
const pending=new Map<string,Command>()
function partition(key:string){const owner=merchantOperationOwner();return owner?'daguanglu:merchant:stage1:operation:'+String(import.meta.env.VITE_MERCHANT_API_BASE_URL)+':'+owner+':'+key:null}
function find(key:string):Command|undefined{const scope=partition(key);if(!scope)return;const cached=pending.get(scope);if(cached)return cached;try{const saved=uni.getStorageSync(scope);if(saved&&typeof saved==='object'&&saved.schema===1&&/^M1_[a-z0-9_]+$/.test(saved.requestId)&&/^\/[A-Za-z0-9/_-]+$/.test(saved.path)&&['POST','PUT'].includes(saved.method)){const command:Command={path:saved.path,method:saved.method,body:{requestId:saved.requestId},revision:merchantSessionRevision(),restored:true,partition:scope};pending.set(scope,command);return command}}catch{throw new Stage1Error('OPERATION_STORAGE_UNAVAILABLE',503)}}
function remember(key:string,command:Omit<Command,'partition'>):Command{const scope=partition(key);if(!scope)throw new Stage1Error('SESSION_REQUIRED',403);const stored={...command,partition:scope};try{uni.setStorageSync(scope,{schema:1,requestId:command.body.requestId,path:command.path,method:command.method,createdAt:Date.now()})}catch{throw new Stage1Error('OPERATION_STORAGE_UNAVAILABLE',503)}pending.set(scope,stored);return stored}
function forget(command:Command){if(pending.get(command.partition)?.body.requestId===command.body.requestId)pending.delete(command.partition);try{const saved=uni.getStorageSync(command.partition);if(saved?.requestId===command.body.requestId)uni.removeStorageSync(command.partition)}catch{/* Keep the non-secret receipt for a later authoritative query. */}}
function current(command:Command){if(command.revision!==merchantSessionRevision())throw new Stage1Error('STALE_OPERATION')}
async function dispatch<T>(key:string,command:Command):Promise<T>{
  if(command.restored)throw new Stage1Error('RETRY_REQUIRES_ORIGINAL_INPUT',409)
  try{current(command);const response=command.filePath?await merchantBusinessUpload(command.filePath,JSON.stringify(command.body)):await merchantBusinessRequest(command.path,command.method,command.body);current(command);const result=decode<T>(response);forget(command);return result}
  catch(error){if(error instanceof MerchantError&&['STALE_OPERATION','SESSION_REJECTED','SESSION_REQUIRED'].includes(error.code)||error instanceof Stage1Error&&error.code==='STALE_OPERATION'){pending.delete(command.partition);throw error}const unknown=!(error instanceof Stage1Error)||error.unknown||error.status>=500;if(!unknown)forget(command);throw unknown?new Stage1Error('UNKNOWN',0,null,true):error}
}
export const stage1Http={
  read:readStage1,
  async invitationPreview(token:string):Promise<Record<string,any>>{active();return decode(await merchantBusinessRequest('/invitations/preview','POST',{token}))},
  pending:(key:string)=>!!find(key),
  async command<T>(key:string,path:string,body:Record<string,unknown>,method:'POST'|'PUT'='POST'):Promise<T>{active();if(find(key))throw new Stage1Error('UNKNOWN',0,null,true);const command=remember(key,{path,method,body:{...JSON.parse(JSON.stringify(body)),requestId:requestId()},revision:merchantSessionRevision()});return dispatch<T>(key,command)},
  async recover<T>(key:string):Promise<T>{active();const command=find(key);if(!command)throw new Stage1Error('OPERATION_NOT_PENDING',404);current(command);const result=await readStage1<{status:string;result:T}>('/operations/'+command.body.requestId);current(command);if(result.status==='ABANDONED'){forget(command);throw new Stage1Error('OPERATION_ABANDONED',409)}if(result.status!=='COMMITTED')throw new Stage1Error('UNKNOWN',0,null,true);forget(command);return result.result},
  async abandon<T>(key:string):Promise<T>{active();const command=find(key);if(!command)throw new Stage1Error('OPERATION_NOT_PENDING',404);current(command);const result=decode<{status:string;result:T}>(await merchantBusinessRequest('/operations/'+command.body.requestId+'/abandon','POST',{requestId:command.body.requestId}));current(command);if(!['COMMITTED','ABANDONED'].includes(result.status))throw new Stage1Error('UNKNOWN',0,null,true);forget(command);if(result.status==='ABANDONED')throw new Stage1Error('OPERATION_ABANDONED',409);return result.result},
  retry<T>(key:string):Promise<T>{const command=find(key);if(!command)return Promise.reject(new Stage1Error('OPERATION_NOT_PENDING',404));return dispatch<T>(key,command)},
  async upload(key:string,filePath:string,purpose:'GOODS'|'QUALIFICATION'):Promise<{id:string;mimeType:string}>{active();if(find(key))throw new Stage1Error('UNKNOWN',0,null,true);const command=remember(key,{path:'/files',method:'POST',body:{requestId:requestId(),purpose},revision:merchantSessionRevision(),filePath});return dispatch(key,command)},
  async preview(id:string,goodsId?:string):Promise<string>{active();const response=await merchantBusinessPreview(id,goodsId);if(response.status!==200)throw new Stage1Error('FILE_UNAVAILABLE',response.status);return (response.data as {localPath:string}).localPath},
}
