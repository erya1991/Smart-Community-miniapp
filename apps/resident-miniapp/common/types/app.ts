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
  available: boolean
  icon?: string
}
