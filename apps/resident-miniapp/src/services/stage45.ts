import {createStage45Api} from '../../../../packages/business-common/stage45/client'
import {residentBusinessRequest,residentBusinessOwner,residentProductAsset,residentStage45Upload} from '../stores/member'
export const stage45Enabled=import.meta.env.VITE_STAGE45_ENABLED==='true'
export const stage45Api=createStage45Api({enabled:stage45Enabled,prefix:'/buyer/p0/s45',partition:String(import.meta.env.VITE_RESIDENT_API_BASE_URL),owner:residentBusinessOwner,request:residentBusinessRequest,upload:residentStage45Upload,asset:residentProductAsset,storage:{get:k=>uni.getStorageSync(k),set:(k,v)=>uni.setStorageSync(k,v),remove:k=>uni.removeStorageSync(k)}})
