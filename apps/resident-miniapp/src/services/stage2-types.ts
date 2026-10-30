export type S2Method = 'MERCHANT_DELIVERY' | 'EXPRESS' | 'COMMUNITY_PICKUP' | 'STORE_REDEMPTION'
export const methodNames: Record<S2Method, string> = { MERCHANT_DELIVERY: '商户配送', EXPRESS: '普通物流', COMMUNITY_PICKUP: '社区自提', STORE_REDEMPTION: '到店核销' }
export interface S2Sku { id: string; code: string; specifications: Array<{ name?: string; value?: string; specName?: string; specValue?: string }>; priceCent: number; quantity: number; image?: string; inventoryVersion: number }
export interface S2Product { id: string; storeId: string; storeName: string; categoryId: string; categoryName: string; name: string | null; available: boolean; reasonCodes: string[]; methods: S2Method[]; skus: S2Sku[]; galleryFileIds: string[]; detailBlocks: Array<{ type: string; text?: string; fileId?: string }> }
export interface S2CartLine { id: string; skuId: string; storeId: string; quantity: number; version: number; product: S2Product | null; unitPriceCent: number | null; available: boolean; reasonCodes: string[] }
export interface S2Address { id: string; name: string; mobile: string; provinceCode: string; cityCode: string; districtCode: string; region: string; detail: string; alias: string; version: number; isDefault: boolean }
export interface S2Book { version: number; defaultAddressId: string | null; records: S2Address[] }
export interface S2ItemPresentation { skuId:string; storeId:string; name:string; quantity:number; unitPriceCent:number|null; specifications:string }
export interface S2Item { skuId: string; quantity: number; cartId?: string; expectedVersion?: number }
export interface S2Point { id: string; name: string; address: string; phone: string; instructions: string; opening: unknown; version: number }
export interface S2Choice { addressIssue?: string; storeId: string; method: S2Method; addressId?: string; addressVersion?: number; pointId?: string; contact: { name: string; mobile: string }; remark: string }
export interface S2StoreOptions { storeId: string; storeName: string; precheck: { status: string; commonMethods: S2Method[]; reasonCodes: string[]; candidatePoints: Partial<Record<S2Method, S2Point[]>>; feeConfigurations: Partial<Record<S2Method, { feeCent: number }>> } }
export interface S2Order { orderId: string; storeId: string; storeName: string; method: S2Method; address: S2Address | null; point: S2Point | null; contact: { name: string; mobile: string }; remark: string; items: Array<{ skuId: string; name: string; quantity: number; unitPriceCent: number; specifications: string }>; goodsCent: number; freightCent: number; amountCent: number }
export interface S2Quote { quoteId: string; confirmationHash: string; amountCent: number; orders: S2Order[]; generatedAt: string; expiresAt: string; serverTime: string; mode: 'MOCK' }
export interface S2Trade { tradeId: string; intentId: string; status: 'WAIT_PAY' | 'PAY_CONFIRMING' | 'CLOSE_CONFIRMING' | 'PAID' | 'CLOSED'; paymentStatus: string; closeStatus: string; closeReason?: string; closeDetails?: { causeCode: string; details?: { changes?: Array<{ storeId: string; fields: string[] }>; storeId?: string } }; protection: string | null; attention: boolean; amountCent: number; createdAt: string; payDeadline: string; paidAt: string | null; paidAmountCent: number | null; lastVerifiedAt: string | null; allowedActions: string[]; orders: S2Order[]; serverTime: string; mode: 'MOCK' }
export interface S2Intent { intentId: string; status: 'ACCEPTED' | 'VERIFYING' | 'SUCCEEDED' | 'FAILED'; tradeId: string | null; reasonCode: string | null; trade: S2Trade | null }
export interface S2Pending { key: string; type: 'INTENT' | 'TRADE'; intentId: string; tradeId?: string; status: string; createdAt: string; summary?: S2Trade }
export interface S2Page<T> { records: T[]; total: number; page: number; pageSize: number }
export interface S2Region { id: string; code: string; name: string; level: string }

export function openingText(value: unknown): string {
  if (!value || typeof value !== 'object') return '开放时间以点位说明为准'
  const row = value as { weekdays?: number[]; allDay?: boolean; start?: string; end?: string; crossDay?: boolean }
  const days = (row.weekdays || []).map(d => ['','周一','周二','周三','周四','周五','周六','周日'][d]).filter(Boolean).join('、')
  return days + ' ' + (row.allDay ? '全天' : (row.start || '') + '—' + (row.crossDay ? '次日' : '') + (row.end || ''))
}
export function specificationText(value: string): string { try { const parts = JSON.parse(value); return Array.isArray(parts) ? parts.map(p => [p.name || p.specName, p.value || p.specValue].filter(Boolean).join('：')).filter(Boolean).join(' / ') || '标准规格' : '标准规格' } catch { return '标准规格' } }
