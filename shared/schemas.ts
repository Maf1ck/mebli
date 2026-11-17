import { z } from 'zod'
import {
  ACCENTS,
  BODY_MATERIALS,
  FACADE_MATERIALS,
  FITTINGS,
  FURNITURE_TYPES,
  GAME_MODES,
  KITCHEN_LAYOUTS,
  ORDER_STATUSES,
  PERSONALITIES,
} from './types'
import { HEX_RE, LIMITS, PHONE_RE, TIME_SLOTS } from './limits'

const price = z.number().min(0).max(1000000)
const pct = z.number().min(0).max(200)

export const priceListSchema = z.object({
  perM2: z.object({ wardrobe: price, walkin: price, hallway: price, cabinet: price }),
  kitchen: z.object({ lowerPerM: price, upperPerM: price, countertopPerM: price, corner: price, island: price }),
  facadePct: z.object({ ldsp: pct, mdf_paint: pct, acrylic: pct, veneer: pct }),
  bodyPct: z.object({ ldsp: pct, mdf: pct }),
  premiumFittingsPct: pct,
  options: z.object({
    drawer: price,
    shelf: price,
    rod: price,
    basket: price,
    lighting: price,
    softclose: price,
    handle: price,
    mirror: price,
    cutout: price,
  }),
  complexityPct: pct,
  installPct: z.number().min(0).max(100),
  dismantle: price,
  minOrder: price,
  measureFee: price,
  deliveryFee: price,
  outOfCityFee: price,
  liftPerFloor: price,
  roundTo: z.union([z.literal(1), z.literal(10), z.literal(50), z.literal(100), z.literal(500)]),
})

const optionalUrlish = z.string().trim().max(200)
const days = z.number().int().min(1).max(365)

export const swatchSchema = z.object({
  name: z.string().trim().min(1, 'Назва кольору').max(40),
  hex: z.string().toLowerCase().regex(HEX_RE, 'Колір у форматі #rrggbb'),
  grain: z.boolean(),
})

export const companySchema = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(140),
  phone: z.union([z.literal(''), z.string().regex(PHONE_RE, 'Телефон у форматі +380XXXXXXXXX')]),
  email: z.union([z.literal(''), z.email().max(120)]),
  telegram: optionalUrlish.regex(/^$|^[A-Za-z0-9_]{5,32}$/, 'Лише імʼя користувача без @'),
  viber: z.union([z.literal(''), z.string().regex(PHONE_RE, 'Номер Viber у форматі +380XXXXXXXXX')]),
  city: z.string().trim().min(1).max(80),
  serviceArea: z.string().trim().max(300),
  workHours: z.string().trim().max(80),
  legalName: z.string().trim().max(160),
  accent: z.enum(ACCENTS),
  retentionDays: z.number().int().min(30).max(3650),
  leadDays: z.object({ kitchen: days, wardrobe: days, walkin: days, hallway: days, cabinet: days }),
  swatches: z.array(swatchSchema).min(1, 'Потрібен хоча б один колір').max(LIMITS.swatches),
})

export const gameSchema = z.object({
  mode: z.enum(GAME_MODES),
  bonusAmount: z.number().int().min(0).max(50000),
  validDays: z.number().int().min(1).max(365),
  minNextOrder: z.number().int().min(0).max(1000000),
})

export const charactersSchema = z.object({
  personality: z.enum(PERSONALITIES),
  faces: z.boolean(),
  phrases: z.boolean(),
})

const count = (min: number, max: number) => z.number().int().min(min).max(max)
const mm = z.number().int().min(0).max(10000)
const optionCount = count(0, LIMITS.option.max).optional()

export const itemConfigSchema = z.object({
  type: z.enum(FURNITURE_TYPES),
  width: mm,
  height: mm,
  depth: mm,
  sections: count(0, 10),
  doors: count(0, LIMITS.doors.max),
  layout: z.enum(KITCHEN_LAYOUTS),
  lowerLength: mm,
  upperLength: mm,
  island: z.boolean(),
  body: z.enum(BODY_MATERIALS),
  facade: z.enum(FACADE_MATERIALS),
  bodyColor: z.string().regex(HEX_RE),
  facadeColor: z.string().regex(HEX_RE),
  fittings: z.enum(FITTINGS),
  options: z.object({
    drawer: optionCount,
    shelf: optionCount,
    rod: optionCount,
    basket: optionCount,
    lighting: optionCount,
    softclose: optionCount,
    handle: optionCount,
    mirror: optionCount,
    cutout: optionCount,
  }),
  complex: z.boolean(),
  install: z.boolean(),
  dismantle: z.boolean(),
  description: z.string().max(LIMITS.description.max),
})

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const orderInputSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
    items: z
      .array(z.object({ id: z.string().max(64), qty: count(LIMITS.qty.min, LIMITS.qty.max), config: itemConfigSchema }))
      .min(1)
      .max(LIMITS.cartItems),
    customer: z.object({
      name: z.string().trim().min(2, 'Вкажіть імʼя').max(LIMITS.name.max),
      phone: z.string().regex(PHONE_RE, 'Телефон у форматі +380XXXXXXXXX'),
      address: z.string().trim().min(5, 'Вкажіть адресу обʼєкта').max(LIMITS.address.max),
    }),
    options: z.object({
      outOfCity: z.boolean(),
      delivery: z.boolean(),
      floor: count(LIMITS.floor.min, LIMITS.floor.max),
      elevator: z.boolean(),
    }),
    preferredDate: z.union([z.literal(''), isoDate]),
    preferredTime: z.union([z.literal(''), z.enum(TIME_SLOTS)]),
    comment: z.string().trim().max(LIMITS.comment.max),
    photoTokens: z.array(z.string().regex(/^[A-Za-z0-9_-]{20,64}$/)).max(LIMITS.photos.max),
    consent: z.literal(true, 'Потрібна згода на обробку даних'),
  })
  .superRefine((value, ctx) => {
    if (value.preferredTime && !value.preferredDate) {
      ctx.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Для конкретного часу оберіть дату' })
    }
    const other = value.items.filter((i) => i.config.type === 'other')
    if (other.length > 0 && value.photoTokens.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['photoTokens'], message: 'Для «Інше» додайте хоча б одне фото чи ескіз' })
    }
    for (const [index, item] of value.items.entries()) {
      if (item.config.type === 'other' && item.config.description.trim().length < 5) {
        ctx.addIssue({ code: 'custom', path: ['items', index, 'config', 'description'], message: 'Опишіть задачу для «Інше»' })
      }
    }
  })

export type OrderInput = z.infer<typeof orderInputSchema>

export const adminOrderPatchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  measureAt: z.iso.datetime({ offset: true }).nullable().optional(),
  finalPrice: z.number().int().min(0).max(10000000).nullable().optional(),
  productionDays: z.number().int().min(1).max(365).nullable().optional(),
  agreedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  ownerNote: z.string().max(4000).optional(),
})

export const passwordChangeSchema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(10, 'Мінімум 10 символів').max(200),
})
