import type { CartItem, FurnitureType, OrderEstimate, OrderOptions, OrderStatus, PriceList, PublicBonus } from './types'

export interface AdminOrderSummary {
  id: string
  status: OrderStatus
  name: string
  phone: string
  address: string
  options: OrderOptions
  types: FurnitureType[]
  estimateTotal: number
  manualCount: number
  measureAt: string | null
  finalPrice: number | null
  productionDays: number | null
  agreedAt: string | null
  preferredDate: string | null
  preferredTime: string | null
  photoCount: number
  createdAt: string | null
}

export interface AdminOrderList {
  page: number
  hasMore: boolean
  counts: Record<string, number>
  orders: AdminOrderSummary[]
}

export interface AdminOrderEvent {
  id: number
  kind: string
  data: Record<string, unknown>
  at: string | null
}

export interface AdminOrder {
  id: string
  token: string
  status: OrderStatus
  name: string
  phone: string
  address: string
  options: OrderOptions
  preferredDate: string | null
  preferredTime: string | null
  comment: string
  items: CartItem[]
  priceSnapshot: PriceList
  estimate: OrderEstimate
  measureAt: string | null
  finalPrice: number | null
  productionDays: number | null
  agreedAt: string | null
  ownerNote: string
  anonymized: boolean
  createdAt: string | null
  updatedAt: string | null
  photos: { id: string; width: number; height: number; size: number }[]
  events: AdminOrderEvent[]
  bonus: PublicBonus | null
}

export interface AdminBonus {
  code: string
  amount: number
  minOrder: number
  expiresAt: string | null
  status: string
  createdAt: string | null
  orderId: string
  name: string
}
