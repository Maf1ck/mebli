export const FURNITURE_TYPES = ['kitchen', 'wardrobe', 'walkin', 'hallway', 'cabinet', 'other'] as const
export type FurnitureType = (typeof FURNITURE_TYPES)[number]

/** Types priced per m² of front (width × height). */
export const CASE_TYPES = ['wardrobe', 'walkin', 'hallway', 'cabinet'] as const
export type CaseType = (typeof CASE_TYPES)[number]

export const KITCHEN_LAYOUTS = ['straight', 'corner', 'u'] as const
export type KitchenLayout = (typeof KITCHEN_LAYOUTS)[number]

export const BODY_MATERIALS = ['ldsp', 'mdf'] as const
export type BodyMaterial = (typeof BODY_MATERIALS)[number]

export const FACADE_MATERIALS = ['ldsp', 'mdf_paint', 'acrylic', 'veneer'] as const
export type FacadeMaterial = (typeof FACADE_MATERIALS)[number]

export const FITTINGS = ['standard', 'premium'] as const
export type Fittings = (typeof FITTINGS)[number]

export const OPTION_IDS = ['drawer', 'shelf', 'rod', 'basket', 'lighting', 'softclose', 'handle', 'mirror', 'cutout'] as const
export type OptionId = (typeof OPTION_IDS)[number]

export const ORDER_STATUSES = ['new', 'measure', 'agreed', 'done', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const GAME_MODES = ['off', 'play', 'bonus'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const ACCENTS = ['walnut', 'sage', 'ink', 'clay'] as const
export type Accent = (typeof ACCENTS)[number]

export const PERSONALITIES = ['friendly', 'calm', 'playful'] as const
export type Personality = (typeof PERSONALITIES)[number]

export interface PriceList {
  /** Price per m² of front (width × height) for case furniture, UAH */
  perM2: Record<CaseType, number>
  /** Kitchen: per running metre of lower and upper modules, countertop, corner module, island */
  kitchen: { lowerPerM: number; upperPerM: number; countertopPerM: number; corner: number; island: number }
  /** Surcharge for the front material, % of the base */
  facadePct: Record<FacadeMaterial, number>
  /** Surcharge for the carcass material, % of the base */
  bodyPct: Record<BodyMaterial, number>
  /** Premium fittings, % of base + materials */
  premiumFittingsPct: number
  /** Fixed price per unit of an option */
  options: Record<OptionId, number>
  /** Non-standard sizes, angles, bevels, curves: % of everything above */
  complexityPct: number
  /** Installation, % of the rounded furniture price of the item */
  installPct: number
  /** Removal of old furniture, flat fee per item */
  dismantle: number
  /** Minimum for the furniture part of the order (installation and delivery are added on top) */
  minOrder: number
  /** Measurement visit; 0 = free */
  measureFee: number
  /** Delivery within the city */
  deliveryFee: number
  /** Extra fee for an address outside the city (measurement, delivery, installation) */
  outOfCityFee: number
  /** Carrying up without a lift, per floor above the first */
  liftPerFloor: number
  /** Round each item to this step, UAH */
  roundTo: number
}

export interface ItemConfig {
  type: FurnitureType
  /** Case furniture, mm */
  width: number
  height: number
  depth: number
  /** Vertical sections of case furniture */
  sections: number
  /** Sliding doors (wardrobe only) */
  doors: number
  /** Kitchen */
  layout: KitchenLayout
  lowerLength: number
  upperLength: number
  island: boolean
  /** Materials and colours (#rrggbb from the workshop palette) */
  body: BodyMaterial
  facade: FacadeMaterial
  bodyColor: string
  facadeColor: string
  fittings: Fittings
  options: Partial<Record<OptionId, number>>
  complex: boolean
  install: boolean
  dismantle: boolean
  description: string
}

export interface CartItem {
  id: string
  config: ItemConfig
  qty: number
}

export interface Swatch {
  name: string
  hex: string
  /** Show a wood grain in 3D */
  grain: boolean
}

export interface CompanySettings {
  name: string
  tagline: string
  phone: string
  email: string
  telegram: string
  viber: string
  city: string
  serviceArea: string
  workHours: string
  legalName: string
  accent: Accent
  retentionDays: number
  /** Production time shown on the type cards, working days */
  leadDays: Record<Exclude<FurnitureType, 'other'>, number>
  swatches: Swatch[]
}

export interface GameSettings {
  mode: GameMode
  bonusAmount: number
  validDays: number
  minNextOrder: number
}

export interface CharacterSettings {
  personality: Personality
  faces: boolean
  phrases: boolean
}

export interface PublicSettings {
  company: CompanySettings
  prices: PriceList
  game: GameSettings
  characters: CharacterSettings
}

export interface PriceLine {
  kind: 'base' | 'material' | 'fittings' | 'option' | 'complex' | 'rounding' | 'install' | 'dismantle'
  label: string
  amount: number
}

export interface ItemEstimate {
  manual: boolean
  /** Furniture lines up to and including rounding */
  lines: PriceLine[]
  /** Installation and removal lines (outside the minimum) */
  serviceLines: PriceLine[]
  /** Furniture price for one piece, rounded */
  unit: number | null
  /** Installation + removal for one piece */
  service: number
  /** (unit + service) × qty */
  total: number | null
}

export interface OrderOptions {
  outOfCity: boolean
  delivery: boolean
  floor: number
  elevator: boolean
}

export interface OrderEstimate {
  items: { id: string; qty: number; estimate: ItemEstimate }[]
  /** Σ furniture of priced items */
  knownSum: number
  minimumTopUp: number
  furnitureTotal: number
  serviceTotal: number
  measureFee: number
  deliveryFee: number
  outOfCityFee: number
  liftFee: number
  total: number
  manualCount: number
  hasKnown: boolean
}

export interface PublicBonus {
  code: string
  amount: number
  minOrder: number
  expiresAt: string | null
  status: string
}

/** What the private order link returns: no phone, address, photos or owner note. */
export interface PublicOrder {
  token: string
  status: OrderStatus
  firstName: string
  options: OrderOptions
  preferredDate: string | null
  preferredTime: string | null
  items: CartItem[]
  estimate: OrderEstimate
  minOrder: number
  measureAt: string | null
  finalPrice: number | null
  productionDays: number | null
  agreedAt: string | null
  photoCount: number
  createdAt: string | null
  updatedAt: string | null
  bonus: PublicBonus | null
}
