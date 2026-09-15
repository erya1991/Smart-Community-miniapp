export type PageStatus = 'loading' | 'ready' | 'empty' | 'error' | 'unavailable'

export interface ProjectSummary {
  id: string
  name: string
  shortName: string
}

export interface NavItem {
  label: string
  path: string
  icon: string
}

export interface QuickEntry {
  id: string
  label: string
  icon: string
  tone?: 'teal' | 'orange' | 'green' | 'blue' | 'gray'
  path?: string
  available: boolean
}

export interface ProductSummary {
  id: string
  name: string
  merchantName: string
  price: number
  fulfillment: string
  imageTone: string
  image?: string
  /** Optional resident-home visual; keeps mall/merchant mock imagery unchanged. */
  homeImage?: string
  homeName?: string
  homeMerchantName?: string
  homePrice?: number
  soldOut?: boolean
}

export interface ServiceSummary {
  id: string
  name: string
  description: string
  priceLabel?: string
  tag?: string
  image?: string
  path?: string
  available: boolean
  icon?: string
}

export interface ProfileItemSummary {
  label: string
  icon: string
  description?: string
  actionText?: string
  value?: string
  badge?: string
  tone?: QuickEntry['tone']
  path?: string
  available?: boolean
}

export interface ProfileGroupSummary {
  title: string
  type: 'orders' | 'service' | 'tiles' | 'list'
  items: ProfileItemSummary[]
}

export interface ResidentProfileSummary {
  member: {
    name: string
    mobile: string
    role: string
    projectName: string
  }
  groups: ProfileGroupSummary[]
}

export interface MerchantProductSummary {
  id: string
  name: string
  description: string
  category: string
  unit: string
  price: number
  stock: number
  auditStatus: '已通过' | '待审核' | '已驳回'
  saleStatus: '销售中' | '未上架' | '已下架'
  image: string
  rejectionReason?: string
}

export interface MerchantProductFilter {
  label: string
  count: number
}

export interface MerchantProductsSummary {
  filters: MerchantProductFilter[]
  products: MerchantProductSummary[]
}

export interface MerchantOrderSummary {
  id: string
  no: string
  status: '待备货' | '待配送' | '配送中' | '已完成'
  fulfillment: '社区自提' | '商户配送'
  amount: number
  count: number
  customerName: string
  itemSummary: string
  createdAt: string
  promise: string
}

export interface MerchantOrderFilter {
  label: string
  count: number
}

export interface MerchantOrdersSummary {
  filters: MerchantOrderFilter[]
  orders: MerchantOrderSummary[]
}

export interface MerchantQualificationSummary {
  projectName: string
  businessStatus: string
  businessDescription: string
  transactionStatus: string
  transactionDescription: string
  reminder: string
}

export interface MerchantProfileSummary {
  merchant: {
    name: string
    storeName: string
    role: string
    projectName: string
  }
  qualification: MerchantQualificationSummary
  groups: Array<{
    title: string
    items: ProfileItemSummary[]
  }>
}
