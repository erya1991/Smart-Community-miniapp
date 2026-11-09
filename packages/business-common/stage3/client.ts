import type { Stage3Api, Receipt } from './types'
type Ports={enabled:boolean;prefix:string;partition:string;owner:()=>string;request:(path:string,method:'GET'|'POST',data?:unknown)=>Promise<{status:number;data:unknown}>;storage:{get:(key:string)=>any;set:(key:string,value:unknown)=>void;remove:(key:string)=>void}}
const messages:Record<string,string>={
 STALE_OPERATION:'登录身份已变化，请重新读取当前订单。',SESSION_REQUIRED:'请先登录后查看本人订单。',AUTH_REQUIRED:'请先登录后继续。',SESSION_REJECTED:'登录或授权已失效，请重新登录。',
 RESOURCE_NOT_FOUND:'订单不可访问或当前身份无权查看。',FORBIDDEN:'当前身份无此操作权限。',VERSION_CONFLICT:'订单已更新，请保留输入并重新读取后确认。',
 FULFILLMENT_STATE_CONFLICT:'当前履约状态不允许此操作，请读取最新订单。',IDEMPOTENCY_CONFLICT:'本次操作与原提交内容不同，请先回查原操作。',
 STAGE3_WRITES_DISABLED:'当前履约操作尚未开放，请保留原订单。',SC23_NOT_ADMITTED:'订单交接条件尚待核验，请稍后查看。',
 CREDENTIAL_SECURITY_PENDING:'核销服务尚待核验，请联系商户。',CREDENTIAL_UNAVAILABLE:'凭证不可用或不属于当前作业点，请核对后联系商户。',
 CREDENTIAL_NOT_READY:'凭证尚未就绪，请等待商户备货。',CONFIRMATION_EXPIRED:'本次核对已过期，请重新查询凭证后确认。',
 POINT_UNAVAILABLE:'成交点位当前不可交付，请联系商户协调。',VERIFICATION_RATE_LIMITED:'尝试次数较多，请稍后重试。',
 VERIFICATION_LIMIT_UNAVAILABLE:'核销安全服务暂不可用，请稍后重试。',FIELD_INVALID:'请检查必填字段、格式和当前业务条件。',
 WAYBILL_INVALID:'运单号只能包含字母、数字和短横线，最多80位。',UNKNOWN:'本次结果尚未确认，请先回查原操作。',
 ORIGINAL_INPUT_UNAVAILABLE:'本机未保留原提交内容，请继续回查原操作，勿重新提交。',INVALID_RESPONSE:'服务返回异常，请稍后重新读取。',
 STORAGE_UNAVAILABLE:'服务暂不可用，请保留当前操作并稍后回查。',OPERATION_STORAGE_UNAVAILABLE:'无法保存操作标识，尚未发出请求。',STAGE3_DISABLED:'订单服务尚未开放。'
}
export class Stage3Error extends Error{
 constructor(public code:string,public status=0,public unknown=false){super(messages[code]||(status===403?'当前身份无权执行此操作。':status===409?'订单条件已变化，请读取后核实。':status===422?'请检查表单字段。':'服务暂不可用，请稍后重试。'));this.name='Stage3Error'}
}
export function createStage3Api(ports:Ports):Stage3Api{
 type Pending={op:string;path:string;body?:Record<string,unknown>;owner:string}
 const pending=new Map<string,Pending>()
 function current(owner:string){if(owner!==ports.owner())throw new Stage3Error('STALE_OPERATION')}
 function key(name:string){return 'daguanglu:s3:'+ports.partition+':'+ports.owner()+':'+name}
 function find(name:string):Pending|undefined{const k=key(name);if(pending.has(k))return pending.get(k)
  try{const value=ports.storage.get(k);if(value?.schema===1&&/^[A-Za-z0-9_-]{8,64}$/.test(value.op)&&/^\/[A-Za-z0-9/_-]+$/.test(value.path)){const record={op:value.op,path:value.path,owner:ports.owner()};pending.set(k,record);return record}}catch{throw new Stage3Error('OPERATION_STORAGE_UNAVAILABLE')}
 }
 function forget(name:string,command:Pending){if(command.owner!==ports.owner())return;pending.delete(key(name));try{ports.storage.remove(key(name))}catch{/* Receipt remains queryable; do not leak payload into storage. */}}
 async function request<T>(path:string,method:'GET'|'POST'='GET',data?:unknown):Promise<T>{
  if(!ports.enabled)throw new Stage3Error('STAGE3_DISABLED')
  if(!/^\/[A-Za-z0-9/_-]+$/.test(path)||path.includes('//')||path.includes('..'))throw new Stage3Error('FIELD_INVALID',422)
  const owner=ports.owner();let response
  try{response=await ports.request(ports.prefix+path,method,data)}catch(error){current(owner);if(error instanceof Error&&'code' in error)throw new Stage3Error(String((error as {code:unknown}).code));throw new Stage3Error(method==='GET'?'STORAGE_UNAVAILABLE':'UNKNOWN',0,method!=='GET')}
  current(owner);const body=response.data as Record<string,any>|null
  if(response.status!==200||body?.success!==true||body?.code!=='SUCCESS')throw new Stage3Error(String(body?.code||'INVALID_RESPONSE'),response.status,response.status>=500)
  return body.result as T
 }
 async function dispatch(name:string,command:Pending):Promise<Receipt>{
  current(command.owner);if(!command.body)throw new Stage3Error('ORIGINAL_INPUT_UNAVAILABLE',409,true)
  try{const value=await request<Receipt>(command.path,'POST',command.body);current(command.owner);forget(name,command);return value}
  catch(error){if(error instanceof Stage3Error&&error.code==='STALE_OPERATION'){pending.delete(key(name));throw error}
   if(error instanceof Stage3Error&&error.status>=400&&error.status<500)forget(name,command)
   throw error}
 }
 return {
  enabled:ports.enabled,owner:ports.owner,context:()=>request('/context'),
  list:query=>request('/orders','GET',query),detail:id=>request('/orders/'+id),credential:id=>request('/orders/'+id+'/credential'),
  pending:name=>{try{return !!find(name)}catch{return false}},
  async command(name,path,body){if(find(name))throw new Stage3Error('UNKNOWN',0,true);const owner=ports.owner(),op='S3_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14)
   const command={op,path,body:{...JSON.parse(JSON.stringify(body)),operationId:op},owner}
   try{ports.storage.set(key(name),{schema:1,op,path})}catch{throw new Stage3Error('OPERATION_STORAGE_UNAVAILABLE')}
   pending.set(key(name),command);return dispatch(name,command)
  },
  async recover(name){const command=find(name);if(!command)throw new Stage3Error('UNKNOWN',0,true);current(command.owner)
   const result=await request<{status:string;result:Receipt}>('/operations/'+command.op);current(command.owner)
   if(result.status!=='COMMITTED')throw new Stage3Error('UNKNOWN',0,true);forget(name,command);return result.result
  },
  retry(name){const command=find(name);return command?dispatch(name,command):Promise.reject(new Stage3Error('UNKNOWN',0,true))},
  lookup:(token,pointId)=>request('/verify/lookup','POST',{token,pointId}),points:()=>request('/points'),workbench:()=>request('/workbench'),
  messages:page=>request('/messages','GET',{pageNumber:page,pageSize:20}),read:id=>request('/messages/'+id+'/read','POST',{})
 }
}
