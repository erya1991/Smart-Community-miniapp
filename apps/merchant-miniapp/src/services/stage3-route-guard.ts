import {merchantPagePath} from './merchant-route-guard'
export interface Stage3Context {storeId:string;memberId:string;clerkId:string;permissions:readonly string[]}
const pages:Record<string,string>={'/pages/order/index':'order.read','/pages/order/detail/index':'order.read','/pages/verification/index':'verification.lookup','/pages/messages/index':'message.read'}
export function stage3BusinessPage(value:unknown):boolean{return Object.prototype.hasOwnProperty.call(pages,merchantPagePath(value))}
export function stage3PageAllowed(value:unknown,identity:string|undefined,context:Stage3Context|null):boolean{const action=pages[merchantPagePath(value)];return identity==='STORE'&&!!context&&!!action&&context.permissions.includes(action)}
