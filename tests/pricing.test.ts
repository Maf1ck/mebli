import { describe, expect, it } from 'vitest'
import { configKey, estimateItem, estimateOrder, isItemConfig, liftFee, normalizeConfig, roundTo } from '../shared/pricing'
import { defaultConfig } from '../shared/limits'
import { DEFAULT_PRICES } from '../shared/defaults'
import { orderInputSchema } from '../shared/schemas'
import type { ItemConfig, OrderOptions, PriceList } from '../shared/types'

const prices: PriceList = structuredClone(DEFAULT_PRICES)
const cfg = (patch: Partial<ItemConfig>): ItemConfig => ({ ...defaultConfig(patch.type ?? 'wardrobe'), options: {}, install: false, ...patch })
const pickup: OrderOptions = { outOfCity: false, delivery: false, floor: 1, elevator: true }

describe('estimateItem — case furniture', () => {
  it('base = front m² × rate, rounded to 100', () => {
    // 2000 × 2400 mm = 4.8 m² × 7200 = 34 560 → 34 600
    const e = estimateItem(cfg({ type: 'wardrobe', width: 2000, height: 2400 }), prices)
    expect(e.lines[0]?.amount).toBe(34560)
    expect(e.unit).toBe(34600)
    expect(e.lines.at(-1)?.kind).toBe('rounding')
    expect(e.service).toBe(0)
  })

  it('applies materials → fittings → options → complexity → rounding in that order', () => {
    // base 34 560; facade mdf_paint 35% = 12 096; body mdf 18% = 6 220.8 → 52 876.8
    // premium 20% = 10 575.36 → 63 452.16; options: 6 shelves × 280 + rod 320 + 2 drawers × 950 = 3 900 → 67 352.16
    // complex 20% = 13 470.43 → 80 822.59 → 80 800
    const e = estimateItem(
      cfg({ type: 'wardrobe', width: 2000, height: 2400, facade: 'mdf_paint', body: 'mdf', fittings: 'premium', options: { shelf: 6, rod: 1, drawer: 2 }, complex: true }),
      prices,
    )
    expect(e.lines.map((l) => l.kind)).toEqual(['base', 'material', 'material', 'fittings', 'option', 'option', 'option', 'complex', 'rounding'])
    expect(e.lines.find((l) => l.kind === 'fittings')?.amount).toBe(10575.36)
    expect(e.lines.find((l) => l.kind === 'complex')?.amount).toBe(13470.43)
    expect(e.unit).toBe(80800)
  })

  it('installation is a % of the rounded unit, removal is flat; both outside the unit', () => {
    const e = estimateItem(cfg({ type: 'wardrobe', width: 2000, height: 2400, install: true, dismantle: true }), prices)
    expect(e.unit).toBe(34600)
    // 10% of 34 600 = 3 460 → 3 500 (rounded to 100), removal 900
    expect(e.serviceLines.map((l) => l.amount)).toEqual([3500, 900])
    expect(e.service).toBe(4400)
    expect(e.total).toBe(39000)
  })

  it('options that do not fit the type are dropped (no mirror in a kitchen)', () => {
    const n = normalizeConfig(cfg({ type: 'kitchen', options: { mirror: 2, drawer: 3 } }))
    expect(n.options.mirror).toBeUndefined()
    expect(n.options.drawer).toBe(3)
  })

  it('clamps sizes to the type range and snaps to the step', () => {
    const n = normalizeConfig(cfg({ type: 'wardrobe', width: 99999, height: 10, depth: 612, sections: 40, doors: 9 }))
    expect(n.width).toBe(4000)
    expect(n.height).toBe(1800)
    expect(n.depth).toBe(600)
    expect(n.sections).toBe(6)
    expect(n.doors).toBe(4)
  })
})

describe('estimateItem — kitchen', () => {
  it('lower, upper, countertop, corner modules and island', () => {
    // lower 3.2 m × 11 500 = 36 800; upper 2.4 × 8 200 = 19 680; countertop 3.2 × 2 600 = 8 320;
    // U = 2 corners × 3 800 = 7 600; island 21 000 → 93 400
    const e = estimateItem(cfg({ type: 'kitchen', layout: 'u', lowerLength: 3200, upperLength: 2400, island: true, facade: 'ldsp' }), prices)
    const base = e.lines.filter((l) => l.kind === 'base').reduce((s, l) => s + l.amount, 0)
    expect(base).toBe(93400)
    expect(e.unit).toBe(93400)
  })

  it('size fields of other types do not leak into a kitchen', () => {
    const n = normalizeConfig(cfg({ type: 'kitchen', width: 3000, sections: 4 }))
    expect(n.width).toBe(0)
    expect(n.sections).toBe(0)
  })
})

describe('"Інше"', () => {
  it('is manual and never priced as zero', () => {
    const e = estimateItem(cfg({ type: 'other', description: 'Шафа в мансардну нішу' }), prices)
    expect(e.manual).toBe(true)
    expect(e.unit).toBeNull()
    expect(e.total).toBeNull()
  })
})

describe('estimateOrder', () => {
  it('tops up furniture to the minimum; installation and delivery go on top', () => {
    // cabinet 1200 × 850 = 1.02 m² × 8 200 = 8 364 → 8 400 < 9 000 → top-up 600
    const o = estimateOrder([{ id: 'a', qty: 1, config: cfg({ type: 'cabinet', width: 1200, height: 850, install: true }) }], prices, {
      outOfCity: true,
      delivery: true,
      floor: 5,
      elevator: false,
    })
    expect(o.knownSum).toBe(8400)
    expect(o.minimumTopUp).toBe(600)
    expect(o.furnitureTotal).toBe(9000)
    expect(o.serviceTotal).toBe(800) // 10% of 8 400 = 840 → 800
    expect(o.deliveryFee).toBe(700)
    expect(o.outOfCityFee).toBe(1000)
    expect(o.liftFee).toBe(600) // 4 floors × 150
    expect(o.total).toBe(9000 + 800 + 0 + 700 + 1000 + 600)
  })

  it('mixed order: known sum is shown, manual items are counted, not free', () => {
    const o = estimateOrder(
      [
        { id: 'a', qty: 1, config: cfg({ type: 'wardrobe', width: 2000, height: 2400 }) },
        { id: 'b', qty: 1, config: cfg({ type: 'other', description: 'Стелаж у нішу зі скосом' }) },
      ],
      prices,
      pickup,
    )
    expect(o.manualCount).toBe(1)
    expect(o.knownSum).toBe(34600)
    expect(o.items.find((r) => r.id === 'b')?.estimate.total).toBeNull()
  })

  it('only manual items → no minimum top-up', () => {
    const o = estimateOrder([{ id: 'a', qty: 1, config: cfg({ type: 'other', description: 'Перебрати шафу' }) }], prices, pickup)
    expect(o.minimumTopUp).toBe(0)
    expect(o.hasKnown).toBe(false)
  })

  it('quantity multiplies furniture and installation', () => {
    const o = estimateOrder([{ id: 'a', qty: 2, config: cfg({ type: 'wardrobe', width: 2000, height: 2400, install: true }) }], prices, pickup)
    expect(o.knownSum).toBe(69200)
    expect(o.serviceTotal).toBe(7000)
  })

  it('lift fee only with delivery, without a lift, above the first floor', () => {
    expect(liftFee({ outOfCity: false, delivery: true, floor: 1, elevator: false }, prices)).toBe(0)
    expect(liftFee({ outOfCity: false, delivery: true, floor: 3, elevator: true }, prices)).toBe(0)
    expect(liftFee({ outOfCity: false, delivery: false, floor: 9, elevator: false }, prices)).toBe(0)
    expect(liftFee({ outOfCity: false, delivery: true, floor: 3, elevator: false }, prices)).toBe(300)
  })

  it('measurement visit is added only when it is not free', () => {
    const paid = { ...prices, measureFee: 400 }
    const o = estimateOrder([{ id: 'a', qty: 1, config: cfg({ type: 'wardrobe' }) }], paid, pickup)
    expect(o.measureFee).toBe(400)
    expect(o.total).toBe(o.furnitureTotal + 400)
  })
})

describe('cart helpers', () => {
  it('identical settings give the same key, different colour does not', () => {
    const a = cfg({ type: 'wardrobe', facadeColor: '#c49a6c' })
    const b = { ...a, options: { ...a.options } }
    expect(configKey(a)).toBe(configKey(b))
    expect(configKey(a)).not.toBe(configKey({ ...a, facadeColor: '#2f4157' }))
  })

  it('isItemConfig rejects garbage from storage', () => {
    expect(isItemConfig(defaultConfig('kitchen'))).toBe(true)
    expect(isItemConfig({ type: 'kitchen' })).toBe(false)
    expect(isItemConfig(null)).toBe(false)
  })

  it('roundTo rounds half up to the step', () => {
    expect(roundTo(34550, 100)).toBe(34600)
    expect(roundTo(34549, 100)).toBe(34500)
  })
})

describe('order input schema', () => {
  const base = {
    idempotencyKey: 'abcdefghijklmnop1234',
    items: [{ id: 'x', qty: 1, config: defaultConfig('wardrobe') }],
    customer: { name: 'Тест', phone: '+380501112233', address: 'вул. Тестова, 1' },
    options: { outOfCity: false, delivery: true, floor: 2, elevator: true },
    preferredDate: '',
    preferredTime: '',
    comment: '',
    photoTokens: [],
    consent: true,
  }

  it('accepts a valid order', () => {
    expect(orderInputSchema.safeParse(base).success).toBe(true)
  })

  it('requires a date for a specific time', () => {
    const r = orderInputSchema.safeParse({ ...base, preferredTime: '10:00' })
    expect(r.success).toBe(false)
  })

  it('"Інше" needs a photo and a description', () => {
    const r = orderInputSchema.safeParse({ ...base, items: [{ id: 'x', qty: 1, config: { ...defaultConfig('other'), description: '' } }] })
    expect(r.success).toBe(false)
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('photoTokens')
      expect(paths).toContain('items.0.config.description')
    }
  })

  it('rejects colours that are not #rrggbb', () => {
    const r = orderInputSchema.safeParse({ ...base, items: [{ id: 'x', qty: 1, config: { ...defaultConfig('wardrobe'), facadeColor: 'red' } }] })
    expect(r.success).toBe(false)
  })
})
