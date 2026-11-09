export type Money = number | string
export interface Page<T>{records:T[];total:number;pageNumber:number;pageSize:number}
export interface OrderItem{orderItemId?:string;originalQuantity?:number;refundedQuantity?:number;remainingQuantity?:number;skuId:string;goodsId:string;name:string;specifications:string|null;quantity:number;unitPriceCent:Money}
export interface Point{id:string;storeId:string;type:string;name:string;address:string;phone?:string;instructions?:string;opening?:{weekdays:number[];allDay:boolean;start?:string;end?:string;crossDay:boolean}}
export interface Order{
 orderId:string;orderSn:string;tradeId:string;tradeSn:string;storeId:string;storeName:string;method:string;phase:string;version:number;admitted:boolean;
 paymentStatus:string;tradeStatus:string;closeStatus:string;protection:string|null;blockedReason:string|null;trustedPaid:boolean;eligible:boolean;pointAvailable:boolean;
 goodsCent:Money;freightCent:Money;amountCent:Money;paidAmountCent:Money|null;paidAt:string|null;createdAt:string;completedAt:string|null;items:OrderItem[];
 contact:{name:string;mobile:string};address:{region?:string;detail?:string}|null;point:Point|null;buyerRemark:string|null;merchantRemark?:string|null;
 fulfillmentEnded?:boolean;canRecordException?:boolean;allowedActions:string[];logistics:{company:string|null;code:string|null;number:string|null;shippedAt:string|null};
 timeline?:{type:string;actorDomain:string;actorId:string|null;at:string}[];exceptions?:{type:string;reason:string;at:string}[];mode:'MOCK';serverTime:string
}
export interface Receipt{orderId:string;phase?:string;version:number;verificationId?:string;completedAt?:string;exceptionId?:string}
export interface Credential{status:'ACTIVE'|'USED'|'UNAVAILABLE';orderId:string;manualCode?:string;qrData?:string;point?:Point;reason?:string;usedAt?:string}
export interface Candidate{status:'READY'|'USED';orderId:string;storeName?:string;items?:OrderItem[];point?:Point;phase?:string;version?:number;confirmationContext?:string;expiresAt?:string;completedAt?:string;operatorId?:string}
export interface Message{id:string;orderId:string;orderSn:string;storeName:string;eventId:string;type:string;at:string;read:boolean;title:string;content:string}
export interface Workbench{storeId:string;date:string;timezone:string;todayOrders:number;turnoverCent:string;counts:Record<string,number>;countsAvailable:boolean;canVerify:boolean;canViewMessages:boolean;serverTime:string}
export interface Stage3Api{
 enabled:boolean;owner:()=>string;context:()=>Promise<{storeId:string;memberId:string;clerkId:string;permissions:string[]}>;list:(query:Record<string,unknown>)=>Promise<Page<Order>>;detail:(id:string)=>Promise<Order>;credential:(id:string)=>Promise<Credential>;
 command:(key:string,path:string,body:Record<string,unknown>)=>Promise<Receipt>;recover:(key:string)=>Promise<Receipt>;pending:(key:string)=>boolean;retry:(key:string)=>Promise<Receipt>;
 lookup:(token:string,pointId:string)=>Promise<Candidate>;points:()=>Promise<{id:string;name:string;type:string}[]>;workbench:()=>Promise<Workbench>;
 messages:(page:number)=>Promise<Page<Message>>;read:(id:string)=>Promise<unknown>;
}
