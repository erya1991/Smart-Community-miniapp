import { ResidentError, ResidentSessionClient } from './resident-session'
import type { ResidentImage, ResidentResponse } from './resident-session'

// Replaced at build time by uni-cli-shared/initDefine; no Node runtime is used.
declare const process: { env: { UNI_PLATFORM?: string } }

// Public API origin only. No AppID, AppSecret, Code or fallback mock endpoint.
const apiBaseUrl = String(import.meta.env.VITE_RESIDENT_API_BASE_URL || '').replace(/\/$/, '')
export const isWechat = process.env.UNI_PLATFORM === 'mp-weixin'
export function createResidentClient(): ResidentSessionClient {
  return new ResidentSessionClient({
    baseUrl: apiBaseUrl,
    storageKey: import.meta.env.VITE_STAGE45_ENABLED === 'true' ? `daguanglu:resident:stage45:${apiBaseUrl}:session:v1` : import.meta.env.VITE_STAGE2_ENABLED === 'true' ? `daguanglu:resident:stage2:${apiBaseUrl}:session:v1` : undefined,
    storage: {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key),
    },
    request: ({ path, method, body, accessToken }) => new Promise((resolve, reject) => {
      uni.request({
        url: `${apiBaseUrl}${path}`, method, data: body as Record<string, unknown>, timeout: 15000,
        header: { 'Content-Type': 'application/json', ...(accessToken ? { accessToken } : {}) },
        success: (response) => resolve({ status: response.statusCode, data: response.data }),
        fail: () => reject(new ResidentError('NETWORK_ERROR')),
      })
    }),
    download: ({ path, accessToken }) => new Promise((resolve, reject) => {
      uni.downloadFile({ url: `${apiBaseUrl}${path}`, header: { accessToken }, timeout: 15000,
        success: (response) => resolve({ status: response.statusCode, filePath: response.tempFilePath }),
        fail: () => reject(new ResidentError('ASSET_UNAVAILABLE')),
      })
    }),
    businessUpload:({path,filePath,metadata,accessToken})=>new Promise<ResidentResponse>((resolve,reject)=>{
      uni.uploadFile({url:apiBaseUrl+path,filePath,name:'file',formData:{metadata},header:{accessToken},timeout:30000,
        success:r=>{try{resolve({status:r.statusCode,data:JSON.parse(r.data)})}catch{reject(new ResidentError('INVALID_RESPONSE'))}},fail:()=>reject(new ResidentError('NETWORK_ERROR'))})
    }),
    upload: ({ filePath, accessToken }) => new Promise<ResidentResponse>((resolve, reject) => {
      uni.uploadFile({
        url: `${apiBaseUrl}/buyer/common/upload/avatar`, filePath, name: 'file',
        header: { accessToken }, timeout: 15000,
        success: (response) => {
          try { resolve({ status: response.statusCode, data: JSON.parse(response.data) }) }
          catch { reject(new ResidentError('INVALID_RESPONSE')) }
        },
        fail: () => reject(new ResidentError('NETWORK_ERROR')),
      })
    }),
  })
}
export function residentLoginCode(): Promise<string> {
  if (!isWechat) return Promise.reject(new ResidentError('WECHAT_UNAVAILABLE'))
  return new Promise((resolve, reject) => {
    uni.login({ provider: 'weixin', timeout: 10000,
      success: (response) => response.code ? resolve(response.code) : reject(new ResidentError('WECHAT_REJECTED')),
      fail: () => reject(new ResidentError('WECHAT_CANCELLED')),
    })
  })
}
export function selectResidentAvatar(): Promise<ResidentImage> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album', 'camera'],
      success: (selection) => {
        const file = Array.isArray(selection.tempFiles) ? selection.tempFiles[0] : undefined
        const filePath = selection.tempFilePaths[0]
        if (!file || !filePath || file.size <= 0 || file.size > 2 * 1024 * 1024) { reject(new ResidentError('AVATAR_REJECTED')); return }
        uni.getImageInfo({ src: filePath,
          success: (info) => {
            const type = (info.type || '').toLowerCase()
            if (!['jpeg', 'png'].includes(type)) { reject(new ResidentError('AVATAR_REJECTED')); return }
            resolve({ filePath, size: file.size, type })
          },
          fail: () => reject(new ResidentError('AVATAR_REJECTED')),
        })
      },
      fail: () => reject(new ResidentError('IMAGE_CANCELLED')),
    })
  })
}
// Correlation ID only, not an authentication credential. Never contains phone/Code.
let requestSequence = 0
export function residentRequestId(): string {
  requestSequence++
  return `rph_${Date.now().toString(36)}_${requestSequence.toString(36)}_${Math.random().toString(36).slice(2, 14).padEnd(12, '0')}`
}
