import type { CaseType, FurnitureType, ItemConfig } from './types'

interface Range {
  min: number
  max: number
  step: number
}

/** Sensible size ranges per type, mm. Outside them the item goes to "Інше". */
export const SIZE_LIMITS: Record<CaseType, { width: Range; height: Range; depth: Range; sections: { min: number; max: number } }> = {
  wardrobe: { width: { min: 900, max: 4000, step: 50 }, height: { min: 1800, max: 2800, step: 50 }, depth: { min: 450, max: 700, step: 50 }, sections: { min: 2, max: 6 } },
  walkin: { width: { min: 1000, max: 6000, step: 100 }, height: { min: 1800, max: 2800, step: 50 }, depth: { min: 350, max: 650, step: 50 }, sections: { min: 2, max: 8 } },
  hallway: { width: { min: 800, max: 3000, step: 50 }, height: { min: 1800, max: 2700, step: 50 }, depth: { min: 300, max: 600, step: 50 }, sections: { min: 2, max: 5 } },
  cabinet: { width: { min: 400, max: 3000, step: 50 }, height: { min: 400, max: 2400, step: 50 }, depth: { min: 300, max: 650, step: 50 }, sections: { min: 1, max: 6 } },
}

export const LIMITS = {
  doors: { min: 2, max: 4 },
  lower: { min: 1200, max: 8000, step: 100 },
  upper: { min: 0, max: 8000, step: 100 },
  option: { min: 0, max: 30 },
  qty: { min: 1, max: 5 },
  description: { max: 1000 },
  photos: { max: 3, maxBytes: 12 * 1024 * 1024, maxSide: 1600 },
  name: { max: 80 },
  address: { max: 300 },
  comment: { max: 1000 },
  floor: { min: 1, max: 40 },
  cartItems: 10,
  swatches: 12,
} as const

export const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'] as const

/** Fallback colours when the workshop palette is empty. */
export const DEFAULT_BODY_COLOR = '#efebe3'
export const DEFAULT_FACADE_COLOR = '#c49a6c'

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

const DEFAULT_SIZES: Record<CaseType, { width: number; height: number; depth: number; sections: number }> = {
  wardrobe: { width: 2000, height: 2400, depth: 600, sections: 3 },
  walkin: { width: 2400, height: 2400, depth: 500, sections: 4 },
  hallway: { width: 1400, height: 2200, depth: 400, sections: 3 },
  cabinet: { width: 1200, height: 850, depth: 450, sections: 3 },
}

/** Starting configuration for a type, with the options that make the 3D model read well. */
export function defaultConfig(type: FurnitureType = 'wardrobe'): ItemConfig {
  const base: ItemConfig = {
    type,
    width: 0,
    height: 0,
    depth: 0,
    sections: 0,
    doors: 0,
    layout: 'straight',
    lowerLength: 0,
    upperLength: 0,
    island: false,
    body: 'ldsp',
    facade: 'ldsp',
    bodyColor: DEFAULT_BODY_COLOR,
    facadeColor: DEFAULT_FACADE_COLOR,
    fittings: 'standard',
    options: {},
    complex: false,
    install: true,
    dismantle: false,
    description: '',
  }
  if (type === 'kitchen') {
    return { ...base, layout: 'corner', lowerLength: 3200, upperLength: 2400, facade: 'mdf_paint', facadeColor: '#9aa58c', options: { drawer: 4, softclose: 6, handle: 10, cutout: 2 } }
  }
  if (type === 'other') return { ...base, install: false }
  const size = DEFAULT_SIZES[type]
  const opts: Record<CaseType, ItemConfig['options']> = {
    wardrobe: { shelf: 6, rod: 1, drawer: 2 },
    walkin: { shelf: 8, rod: 2, drawer: 3, basket: 1 },
    hallway: { shelf: 3, rod: 1, mirror: 1 },
    cabinet: { drawer: 3, shelf: 2, handle: 6 },
  }
  return { ...base, ...size, doors: type === 'wardrobe' ? 2 : 0, options: opts[type] }
}

/** Ukrainian mobile/landline in E.164: +380 and 9 digits */
export const PHONE_RE = /^\+380\d{9}$/

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('380')) return `+${digits.slice(0, 12)}`
  if (digits.startsWith('0')) return `+38${digits.slice(0, 10)}`
  return `+380${digits.slice(0, 9)}`
}

export const HEX_RE = /^#[0-9a-f]{6}$/
