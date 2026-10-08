import type { FulfillmentMethod } from '@/types/mall'

export type StoreStatus = 'APPLY' | 'APPLYING' | 'REFUSED' | 'OPEN' | 'CLOSED'
export type GoodsAuditStatus = 'TOBEAUDITED' | 'PASS' | 'REFUSE'
export type SupplyScenario = 'ready' | 'payment-pending' | 'sharing-exception' | 'agreement-expired' | 'qualification-expired' | 'store-closed'

export interface StoreApplication {
  id: string
  storeStatus: StoreStatus
  subjectType: 'enterprise' | 'individual-business'
  subjectName: string
  licenseNumber: string
  licenseImages: string[]
  legalScope: string
  legalName: string
  legalId: string
  legalIdImages: string[]
  contactName: string
  mobile: string
  email: string
  storeName: string
  storeLogo: string[]
  description: string
  storeAddress: string
  longitude: string
  latitude: string
  categoryIds: string[]
  storePhone: string
  qualificationImages: string[]
  otherImages: string[]
  currentStep: number
  savedAt: string
  submittedAt?: string
  reviewedAt?: string
  rejectionReason?: string
}

export interface ApplicationEvent {
  id: string
  title: string
  description: string
  occurredAt: string
  tone: 'success' | 'pending' | 'error'
}

export interface SupplyQualification {
  storeId: string
  storeName: string
  subjectName: string
  storeStatus: StoreStatus
  storeEnabled: boolean
  necessaryQualificationsValid: boolean
  agreement: {
    no: string
    name: string
    version: string
    status: 'active' | 'missing' | 'expired' | 'terminated'
    startsAt: string
    endsAt: string
    attachment: string
    scope: string
    commissionSummary: string
    afterSaleSummary: string
  }
  paymentStatus: 'ready' | 'pending'
  profitSharingStatus: 'ready' | 'pending' | 'exception'
  profitSharingRequired: boolean
  baseBusinessReady: boolean
  tradeReady: boolean
  baseReasons: string[]
  tradeReasons: string[]
  checkedAt: string
}

// Goods/GoodsSku-facing contract. Amounts are integer fen; weight is kg.
// Draft is a local editing flag, not a new LiLiShop audit enum.
export interface SupplySku {
  id: string
  specs: Record<string, string>
  sn: string
  price: number
  cost: number
  quantity: number
  weight: number
  skuImage?: string
  isMain: boolean
}

export interface SupplyGoods {
  id?: string
  storeId: string
  goodsName: string
  categoryId: string
  goodsImage: string
  goodsGallery: string[]
  unit: string
  sellingPoint: string
  detail: string
  deliveryMethods: FulfillmentMethod[]
  deliveryNote: string
  afterSaleNote: string
  skuList: SupplySku[]
  draft: boolean
  auditStatus?: GoodsAuditStatus
  marketEnable: 'UPPER' | 'DOWN'
  authMessage?: string
  forceOffShelf: boolean
}

export type FieldErrors = Record<string, string>
