import type { Money } from './types'
export const labels:Record<string,string>={
 MERCHANT_DELIVERY:'商户配送',EXPRESS:'普通物流',COMMUNITY_PICKUP:'社区自提',STORE_REDEMPTION:'到店核销',
 WAIT_PREPARE:'待备货',WAIT_DISPATCH:'待配送',WAIT_SHIP:'待发货',DELIVERING:'配送中',DELIVERED:'已送达，待确认',SHIPPED:'已发货，待确认',
 WAIT_PICKUP:'待自提',WAIT_VERIFY:'待核销',COMPLETED:'已完成',BLOCKED:'订单待核实',
 NOT_STARTED:'尚未付款',UNPAID:'未付款',UNKNOWN:'付款结果核实中',SUCCEEDED:'已付款',CLOSED:'已关闭',PARTIAL:'付款事实待核实',
 prepare:'完成备货',dispatch:'开始配送',delivered:'确认送达',ship:'确认发货',receive:'确认收货',
 READY:'已可履约',PREPARE:'备货完成',DISPATCH:'开始配送',SHIP:'确认发货',EXCEPTION:'异常记录',
 DELIVERY_DISPUTE:'送达争议',DELIVERY_UNAVAILABLE:'无法配送',WAYBILL_ERROR:'运单异常',POINT_UNAVAILABLE:'点位不可交付',PICKUP_DISPUTE:'提货争议',OTHER:'其他履约异常',
}
export const label=(v:string|null|undefined)=>v?labels[v]||'状态待核实':'待核实'
export function money(value:Money|null|undefined):string{
 if(value==null)return '待核实'
 const text=String(value)
 if(!/^\d+$/.test(text)||typeof value==='number'&&!Number.isSafeInteger(value))return '待核实'
 const n=text.replace(/^0+(?=\d)/,'').padStart(3,'0');return n.slice(0,-2)+'.'+n.slice(-2)
}
export function date(value:string|null|undefined):string{
 if(!value)return '尚未发生'
 const time=new Date(value);if(Number.isNaN(time.getTime()))return '时间待核实'
 // Fixed offset, independent of device timezone; China has no current daylight saving.
 const local=new Date(time.getTime()+8*3600000)
 return local.toISOString().slice(0,19).replace('T',' ')+'（北京）'
}
export function blocked(reason:string|null):string{
 if(!reason)return ''
 if(reason==='POINT_UNAVAILABLE')return '成交时点位当前不可交付，请联系商户核实，订单点位保持原记录。'
 if(reason==='STAGE3_WRITES_DISABLED'||reason==='SC23_NOT_ADMITTED')return '当前履约操作尚未开放，可查看订单并联系商户核实。'
 return '订单付款或履约条件待核实，请保留原订单并稍后查询。'
}
export function opening(point:{opening?:{weekdays:number[];allDay:boolean;start?:string;end?:string;crossDay:boolean}}):string{
 const o=point.opening;if(!o)return '开放时间待核实'
 return '周'+o.weekdays.map(n=>['','一','二','三','四','五','六','日'][n]).join('、')+' '+(o.allDay?'全天':(o.start||'')+'—'+(o.end||'')+(o.crossDay?' 次日':''))
}
