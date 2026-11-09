import {merchantPagePath} from './merchant-route-guard'
export interface Stage45Context{storeId:string;memberId:string;clerkId:string;permissions:readonly string[]}
const pages:Record<string,string>={'/pages/after-sale/index':'aftersale.read','/pages/after-sale/detail/index':'aftersale.read','/pages/evaluation/index':'evaluation.read','/pages/funds/index':'funds.read','/pages/funds/detail/index':'funds.read','/pages/messages/index':'message.read'}
export function stage45BusinessPage(value:unknown){return Object.prototype.hasOwnProperty.call(pages,merchantPagePath(value))}
export function stage45PageAllowed(value:unknown,identity:string|undefined,context:Stage45Context|null){const action=pages[merchantPagePath(value)];return identity==='STORE'&&!!context&&!!action&&context.permissions.includes(action)}
