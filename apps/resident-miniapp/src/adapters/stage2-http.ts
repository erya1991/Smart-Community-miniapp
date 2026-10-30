import { residentBusinessOwner, residentBusinessRequest } from '../stores/member'
import type { ResidentMethod } from '../services/resident-session'

export const stage2Enabled = import.meta.env.VITE_STAGE2_ENABLED === 'true'
const messages: Record<string, string> = {
  SESSION_REJECTED: '登录已失效，请重新登录后读取原交易。',
  AUTH_REQUIRED: '请先使用微信登录，再确认本次操作。',
  STAGE2_TEST_SCOPE_REQUIRED: '当前账号尚未纳入本次模拟交易测试范围。',
  RESOURCE_NOT_FOUND: '内容已变化或不可访问，请刷新当前页面。',
  VERSION_CONFLICT: '内容已更新，请读取最新内容后确认。',
  CART_VERSION_CONFLICT: '购物车已更新，请刷新后重新选择。',
  ADDRESS_VERSION_CONFLICT: '地址已更新，请重新选择并确认。',
  ADDRESS_BOOK_VERSION_CONFLICT: '地址簿已更新，请刷新后再操作。',
  QUOTE_EXPIRED: '报价已过期，请重新查看金额并确认。',
  RECONFIRM_REQUIRED: '店铺交易信息已更新；原交易安全关闭后，请重新确认购买。',
  CHANNEL_SET_CONFLICT: '所选店铺当前支付条件无法合并，请调整所选店铺后重新确认。',
  CHECKOUT_UNAVAILABLE: '本次结算条件已变化，请检查对应店铺、商品和履约信息。',
  OUT_OF_STOCK: '当前库存不足，请调整数量后确认。',
  GOODS_UNAVAILABLE: '商品当前不可购买，请刷新查看原因。',
  PAYMENT_NOT_ALLOWED: '当前不能再次支付，请查询原交易的最新状态。',
  IDEMPOTENCY_CONFLICT: '本次操作内容与原请求不同，请先核实原操作结果。',
  INVENTORY_RELEASE_SPACE_REQUIRED: '目标可售库存需为已有占用保留释放空间。',
  FIELD_INVALID: '填写内容不符合要求，请检查标注字段。',
  CART_CAPACITY: '购物车最多保存200种规格，请先调整购物车。',
  ADDRESS_CAPACITY: '最多保存20条地址，请先编辑已有地址。',
  STORAGE_UNAVAILABLE: '服务暂时不可用，请保留当前操作并稍后查询。',
}
export class Stage2Error extends Error {
  constructor(public readonly code: string, public readonly status = 0, public readonly details: unknown = null, public readonly fields: unknown = null) {
    super(messages[code] || '操作暂未完成，请刷新原内容或稍后重试。')
    this.name = 'Stage2Error'
  }
}
export async function stage2Request<T>(method: ResidentMethod, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  if (!stage2Enabled) throw new Stage2Error('STAGE2_NOT_CONFIGURED')
  const owner = residentBusinessOwner()
  // Query parameters are platform request data; no arbitrary absolute URL or identity selector is accepted.
  const response = await residentBusinessRequest(`/buyer/p0/s2${path}`, method, params || body)
  if (owner !== residentBusinessOwner()) throw new Stage2Error('STALE_OPERATION')
  const result = response.data as Record<string, unknown> | null
  if (!result || typeof result !== 'object' || result.success !== true || result.code !== 'SUCCESS' || response.status !== 200) {
    throw new Stage2Error(typeof result?.code === 'string' ? result.code : 'INVALID_RESPONSE', response.status, result?.details, result?.errors)
  }
  return result.result as T
}
export function stage2OperationId(prefix = 's2'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14).padEnd(12, '0')}`
}
export const stage2Owner = residentBusinessOwner
