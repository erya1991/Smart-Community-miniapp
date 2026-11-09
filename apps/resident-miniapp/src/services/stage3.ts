import {createStage3Api} from '../../../../packages/business-common/stage3/client'
import {residentBusinessOwner,residentBusinessRequest} from '../stores/member'
export const stage3Enabled=import.meta.env.VITE_STAGE3_ENABLED==='true'
export const stage3Api=createStage3Api({enabled:stage3Enabled,prefix:'/buyer/p0/s3',partition:String(import.meta.env.VITE_RESIDENT_API_BASE_URL),
 owner:residentBusinessOwner,
 request:residentBusinessRequest,storage:{get:k=>uni.getStorageSync(k),set:(k,v)=>uni.setStorageSync(k,v),remove:k=>uni.removeStorageSync(k)}})
