import type { RefundStatus, TradeOrder, TradeOrderItem } from './mall'

export type AfterSaleServiceType = 'RETURN_MONEY' | 'RETURN_GOODS'
export type AfterSaleServiceStatus = 'APPLY' | 'PASS' | 'REFUSE' | 'BUYER_RETURN' | 'SELLER_CONFIRM' | 'BUYER_CANCEL' | 'WAIT_REFUND' | 'COMPLETE'
export type ReturnMethod = '现场退回' | '自行快递'
export interface AfterSaleRecord {
  id: string; sn: string; tradeId?: string; tradeSn: string; orderId: string; orderSn: string; orderItemSn: string
  storeId: string; operatorId: string; memberId: string; memberName: string; storeName: string
  productId: string; skuId: string; item: TradeOrderItem; quantity: number
  serviceType: AfterSaleServiceType; serviceStatus: AfterSaleServiceStatus
  reason: string; problemDesc: string; images: string[]
  maxRefundAmount: number; applyRefundAmount: number; actualRefundAmount: number
  merchantAuditRemark?: string; returnAddress: string; returnInstructions: string
  returnMethod?: ReturnMethod; mLogisticsCode?: string; mLogisticsName?: string; mLogisticsNo?: string; mDeliverTime?: string; returnRemark?: string; returnReceivedAt?: string
  refundStatus: RefundStatus; refundTransactionNo?: string; refundAt?: string
  stockRestored: boolean; restoreStockOnRefund: boolean
  profitSharingReturnRequired: boolean; fundAdjustmentStatus: '无需回退' | '待平台资金调整'
  createdAt: string; updatedAt: string
  timeline: { time: string; title: string; description: string; operatorName: string }[]
}
export interface AfterSaleOperations { cancel: boolean; submitReturn: boolean; approve: boolean; reject: boolean; confirmReturn: boolean }
export interface AfterSalePresentation { statusLabel: string; typeLabel: string; nextStep: string; operations: AfterSaleOperations }
export type ResidentAfterSaleView = Omit<AfterSaleRecord, 'stockRestored' | 'restoreStockOnRefund' | 'profitSharingReturnRequired' | 'fundAdjustmentStatus'> & AfterSalePresentation
export type MerchantAfterSaleView = AfterSaleRecord & AfterSalePresentation
export interface AfterSaleEligibility {
  order: TradeOrder; item: TradeOrderItem; itemPaidAmount: number; availableQuantity: number; activeQuantity: number; completedQuantity: number
  requestedQuantity: number; maxRefundAmount: number; allowRefund: boolean; allowReturnGoods: boolean; reason: string
  reasons: string[]; serviceTypes: { value: AfterSaleServiceType; label: string; description: string }[]
}
export interface CreateAfterSaleInput {
  orderId: string; skuId: string; quantity: number; serviceType: AfterSaleServiceType; reason: string; problemDesc: string; images: string[]; applyRefundAmount: number; idempotencyKey: string
}
export interface ReturnShipmentInput { returnMethod: ReturnMethod; mLogisticsCode?: string; mLogisticsName?: string; mLogisticsNo?: string; remark?: string }
export type MerchantAfterSaleFilter = 'pending' | 'processing' | 'completed' | 'all'
