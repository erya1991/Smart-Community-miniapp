export type ProductAuditStatus = '草稿' | '待审核' | '已驳回' | '已通过'
export type ProductSaleStatus = '未上架' | '销售中' | '已下架'
export type FulfillmentMethod = '商户配送' | '社区自提' | '到店核销'
export type MallProductSort = 'default' | 'sales' | 'price-asc' | 'price-desc'

export interface MallProductQuery {
  keyword?: string
  categoryId?: string
  sort?: MallProductSort
}

export interface MallSpecification {
  name: string
  values: string[]
}

export interface MallStoreAvailability {
  enabled: boolean
  businessAllowed: boolean
  tradeAllowed: boolean
  reason?: string
}

export interface MallPurchaseEligibility {
  allowed: boolean
  reason: string
}

export interface ProductSku {
  id: string
  name: string
  image?: string
  price: number
  marketPrice?: number
  code: string
  availableStock: number
  reservedStock: number
  warningStock: number
  isMain?: boolean
  valid?: boolean
  specValues?: Record<string, string>
}

export interface MallProduct {
  id: string
  projectId: string
  operatorId: string
  merchantName: string
  storeName: string
  storeAddress: string
  category: string
  name: string
  sellingPoint: string
  mainImage: string
  gallery: string[]
  detail: string
  fulfillmentMethods: FulfillmentMethod[]
  deliveryNote: string
  afterSaleNote: string
  auditStatus: ProductAuditStatus
  saleStatus: ProductSaleStatus
  rejectionReason?: string
  skus: ProductSku[]
  specifications?: MallSpecification[]
  salesCount?: number
  reviewCount?: number
  /** Last public version is retained while a merchant modification is under review. */
  publishedSnapshot?: Omit<MallProduct, 'publishedSnapshot'>
}

export interface MallCategory {
  id: string
  name: string
  icon: string
  enabled: boolean
}

export interface ResidentMallProductSummary {
  id: string
  category: string
  categoryId: string
  name: string
  merchantName: string
  storeName: string
  sellingPoint: string
  salesCount: number
  reviewCount?: number
  purchaseEligibility: MallPurchaseEligibility
  price: number
  fulfillment: FulfillmentMethod
  image: string
  imageTone: string
  soldOut: boolean
  stockTight: boolean
}

export interface MallProductDetail extends MallProduct {
  currentSkuId: string
  purchaseEligibility: MallPurchaseEligibility
}

export interface CartItem {
  id: string
  productId: string
  skuId: string
  quantity: number
  selected: boolean
  status: 'normal' | 'stock-insufficient' | 'off-shelf' | 'sku-invalid'
  latestPrice: number
}

export interface CartMerchantGroup {
  merchantName: string
  storeName: string
  fulfillment: FulfillmentMethod
  items: Array<CartItem & { product: MallProduct; sku: ProductSku }>
}

export interface CartSummary {
  groups: CartMerchantGroup[]
  invalidItems: Array<CartItem & { product: MallProduct; sku: ProductSku }>
}

export interface ProductEditorPayload {
  id?: string
  category: string
  name: string
  sellingPoint: string
  mainImage: string
  gallery: string[]
  detail: string
  fulfillmentMethods: FulfillmentMethod[]
  deliveryNote: string
  afterSaleNote: string
  skus: ProductSku[]
}

export interface BusinessQualificationCheck {
  allowed: boolean
  message: string
}

/** Trade dimensions stay independent; UI derives a primary display status from them. */
export type TradeStatus = '待支付' | '已支付' | '履约中' | '已完成' | '已关闭'
export type PaymentStatus = '未支付' | '支付中' | '支付成功' | '支付失败' | '已关闭' | 'Mock成功'
export type FulfillmentStatus = '待备货' | '待配送' | '配送中' | '已送达' | '待自提' | '待核销' | '已核销' | '已完成'
export type AfterSaleStatus = '无售后' | '售后处理中'
export type RefundStatus = '无退款' | '退款处理中' | '退款成功' | '退款失败'
export type ProfitSharingStatus = '未开始' | '待分账' | '分账中' | '已分账'

export interface MemberAddress {
  id: string
  name: string
  mobile: string
  region: string
  detail: string
  label: string
  isDefault: boolean
}

export interface TradeOrderItem {
  productId: string
  skuId: string
  productName: string
  productImage: string
  category: string
  skuName: string
  quantity: number
  unitPrice: number
  afterSaleNote: string
}

export interface TradeTimelineEvent {
  time: string
  title: string
  description: string
}

export interface TradeOrder {
  id: string
  no: string
  projectId: string
  operatorId: string
  merchantName: string
  storeName: string
  storeAddress: string
  memberName: string
  memberMobile: string
  items: TradeOrderItem[]
  fulfillmentMethod: FulfillmentMethod
  tradeStatus: TradeStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  afterSaleStatus: AfterSaleStatus
  refundStatus: RefundStatus
  profitSharingStatus: ProfitSharingStatus
  goodsAmount: number
  deliveryFee: number
  discountAmount: number
  payableAmount: number
  paidAmount: number
  payOrderId: string
  createdAt: string
  paidAt?: string
  buyerRemark?: string
  merchantRemark?: string
  addressSnapshot?: Omit<MemberAddress, 'id' | 'isDefault'>
  contactSnapshot: Pick<MemberAddress, 'name' | 'mobile'>
  pickupPoint?: string
  verificationCode?: string
  verificationStatus?: '待核销' | '已核销' | '已失效'
  verificationAt?: string
  timeline: TradeTimelineEvent[]
}

export interface CheckoutRequest {
  productId?: string
  skuId?: string
  quantity?: number
  cartIds?: string[]
}

export interface CheckoutContext {
  merchantName: string
  storeName: string
  storeAddress: string
  operatorId: string
  items: TradeOrderItem[]
  fulfillmentMethods: FulfillmentMethod[]
  defaultFulfillment: FulfillmentMethod
  defaultAddress?: MemberAddress
  contact: Pick<MemberAddress, 'name' | 'mobile'>
  goodsAmount: number
  deliveryFee: number
  discountAmount: number
  payableAmount: number
  afterSaleNote: string
}

export interface CreateTradeOrderInput extends CheckoutRequest {
  fulfillmentMethod: FulfillmentMethod
  addressId?: string
  contact: Pick<MemberAddress, 'name' | 'mobile'>
  buyerRemark?: string
  idempotencyKey: string
}

export interface TradeQualificationCheck {
  businessAllowed: boolean
  formalTradeAllowed: boolean
  mockPayAllowed: boolean
  message: string
}
