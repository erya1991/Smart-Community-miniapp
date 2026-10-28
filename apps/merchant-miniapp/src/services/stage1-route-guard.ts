import type {BusinessContext} from './stage1'
import {merchantPagePath} from './merchant-route-guard'
const pages:Record<string,string>={
  '/pages/operation/index':'goods.read','/pages/product/editor/index':'goods.read',
  '/pages/profile/basic/index':'profile.read','/pages/stores/index':'profile.read','/pages/stores/editor/index':'profile.read',
  '/pages/qualifications/index':'profile.read','/pages/qualifications/editor/index':'profile.read',
  '/pages/staff/index':'staff.manage','/pages/staff/editor/index':'staff.manage',
  '/pages/cooperation/status/index':'cooperation.read','/pages/qualification/status/index':'summary.read',
  '/pages/fulfillment/index':'fulfillment.read','/pages/fulfillment/point-editor/index':'point.read',
}
export function stage1PageAllowed(path:unknown,identity:string|undefined,context:BusinessContext|null):boolean{
  const normalized=merchantPagePath(path)
  if(['/pages/onboarding/application/index','/pages/onboarding/result/index'].includes(normalized))return identity==='APPLICANT'
  if(normalized==='/pages/invitations/accept/index')return identity==='APPLICANT'||identity==='STORE'&&!!context?.permissions.includes('invitation.accept')
  if(normalized==='/pages/order/index')return identity==='STORE'||identity==='APPLICANT'
  const action=pages[normalized]
  return identity==='STORE'&&!!context&&!!action&&context.permissions.includes(action)&&(action!=='staff.manage'||context.ownerFlag)
}
