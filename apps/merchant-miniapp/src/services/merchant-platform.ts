import { MerchantError, MerchantSessionClient } from './merchant-session'

declare const process: { env: { UNI_PLATFORM?: string } }
// manager-api origin/API prefix only, excluding /store. No buyer-api or Mock fallback.
const apiBaseUrl = String(import.meta.env.VITE_MERCHANT_API_BASE_URL || '').replace(/\/$/, '')
export const isWechat = process.env.UNI_PLATFORM === 'mp-weixin'
export function createMerchantClient(): MerchantSessionClient {
  return new MerchantSessionClient({
    baseUrl: apiBaseUrl,
    storageKey: import.meta.env.VITE_STAGE45_ENABLED === 'true' ? `daguanglu:merchant:stage45:${apiBaseUrl}:session:v1` : import.meta.env.VITE_STAGE2_ENABLED === 'true' ? `daguanglu:merchant:stage2:${apiBaseUrl}:session:v1` : undefined,
    storage: {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key),
    },
    request: ({ path, method, body, accessToken }) => new Promise((resolve, reject) => {
      uni.request({ url: `${apiBaseUrl}${path}`, method, data: body as Record<string, unknown>, timeout: 15000,
        header: { 'Content-Type': 'application/json', ...(accessToken ? { accessToken } : {}) },
        success: (response) => resolve({ status: response.statusCode, data: response.data }),
        fail: () => reject(new MerchantError('NETWORK_ERROR')),
      })
    }),
    upload: ({path, accessToken, filePath, metadata}) => new Promise((resolve, reject) => {
      uni.uploadFile({url: `${apiBaseUrl}${path}`, filePath, name:'file', formData:{metadata}, timeout:30000,
        header:{accessToken}, success: response => {try {resolve({status:response.statusCode,data:JSON.parse(response.data)})} catch {reject(new MerchantError('INVALID_RESPONSE'))}},
        fail:()=>reject(new MerchantError('NETWORK_ERROR'))})
    }),
    download: ({path, accessToken}) => new Promise((resolve, reject) => {
      uni.downloadFile({url:`${apiBaseUrl}${path}`,header:{accessToken},timeout:15000,
        success: response => resolve({status:response.statusCode,data:{localPath:response.tempFilePath}}),
        fail:()=>reject(new MerchantError('NETWORK_ERROR'))})
    }),
  })
}
export function merchantLoginCode(): Promise<string> {
  if (!isWechat) return Promise.reject(new MerchantError('WECHAT_UNAVAILABLE'))
  return new Promise((resolve, reject) => {
    uni.login({ provider: 'weixin', timeout: 10000,
      success: (response) => response.code ? resolve(response.code) : reject(new MerchantError('WECHAT_REJECTED')),
      fail: () => reject(new MerchantError('WECHAT_CANCELLED')),
    })
  })
}
