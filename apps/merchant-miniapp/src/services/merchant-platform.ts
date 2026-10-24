import { MerchantError, MerchantSessionClient } from './merchant-session'

declare const process: { env: { UNI_PLATFORM?: string } }
// manager-api origin/API prefix only, excluding /store. No buyer-api or Mock fallback.
const apiBaseUrl = String(import.meta.env.VITE_MERCHANT_API_BASE_URL || '').replace(/\/$/, '')
export const isWechat = process.env.UNI_PLATFORM === 'mp-weixin'
export function createMerchantClient(): MerchantSessionClient {
  return new MerchantSessionClient({
    baseUrl: apiBaseUrl,
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
