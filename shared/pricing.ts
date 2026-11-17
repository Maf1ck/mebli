/**
 * Single source of truth for price calculation. Used by the browser for the live
 * estimate and by the server, which recalculates every order and ignores any sum
 * sent by the client.
 *
 * Order of operations for one item (documented in docs/PRICING.md):
 *   1. base       case furniture: price per m² × front area (width × height)
 *                 kitchen: lower m × rate + upper m × rate + countertop m × rate
 *                          + corner modules (corner: 1, U: 2) + island
 *   2. materials  base × (front % + carcass %)
 *   3. fittings   (1 + 2) × premium %                    (premium fittings only)
 *   4. options    Σ unit price × quantity
 *   5. complexity (1 + 2 + 3 + 4) × complexity %         (non-standard shape)
 *   6. unit       round to `roundTo` UAH (half up)        ← furniture price of one piece
 *   7. service    installation = unit × install %, rounded; + removal flat fee
 *   8. item total (unit + service) × quantity
 * Order level:
 *   known sum     = Σ unit × qty of priced items ("Інше" is estimated manually)
 *   minimum       = if 0 < known sum < minOrder → top up to minOrder (furniture only)
 *   + installation and removal of all items
 *   + measurement visit (if not free) + delivery + out-of-city fee + carrying without a lift
 */
import { BODY_MATERIALS, CASE_TYPES, FACADE_MATERIALS, FITTINGS, FURNITURE_TYPES, KITCHEN_LAYOUTS, OPTION_IDS } from './types'
import type { CartItem, CaseType, ItemConfig, ItemEstimate, OptionId, OrderEstimate, OrderOptions, PriceLine, PriceList } from './types'
import { DEFAULT_BODY_COLOR, DEFAULT_FACADE_COLOR, HEX_RE, LIMITS, SIZE_LIMITS, clamp, snap } from './limits'
import { BODY_LABELS, FACADE_LABELS, LAYOUT_LABELS, OPTION_LABELS, TYPE_LABELS, TYPE_OPTIONS } from './content/services'

const has = <T extends string>(list: readonly T[], v: unknown): v is T => (list as readonly unknown[]).includes(v)

/** Cheap structural check for configs read back from localStorage (no zod in the client bundle). */
export function isItemConfig(value: unknown): value is ItemConfig {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    has(FURNITURE_TYPES, v.type) &&
    has(KITCHEN_LAYOUTS, v.layout) &&
    has(BODY_MATERIALS, v.body) &&
    has(FACADE_MATERIALS, v.facade) &&
    has(FITTINGS, v.fittings) &&
    ['width', 'height', 'depth', 'sections', 'doors', 'lowerLength', 'upperLength'].every((k) => typeof v[k] === 'number' && Number.isFinite(v[k])) &&
    ['island', 'complex', 'install', 'dismantle'].every((k) => typeof v[k] === 'boolean') &&
    typeof v.bodyColor === 'string' &&
    typeof v.facadeColor === 'string' &&
    typeof v.description === 'string' &&
    typeof v.options === 'object' &&
    v.options !== null
  )
}

export function isCaseType(type: ItemConfig['type']): type is CaseType {
  return has(CASE_TYPES, type)
}

export function allowedOptions(type: ItemConfig['type']): OptionId[] {
  return type === 'other' ? [] : TYPE_OPTIONS[type]
}

/** Drops fields that do not apply to the chosen type and clamps sizes, so equal orders compare equal. */
export function normalizeConfig(input: ItemConfig): ItemConfig {
  const type = input.type
  const options: Partial<Record<OptionId, number>> = {}
  for (const id of allowedOptions(type)) {
    const n = Math.round(clamp(Number(input.options[id] ?? 0), LIMITS.option.min, LIMITS.option.max))
    if (n > 0) options[id] = n
  }
  const other = type === 'other'
  const kitchen = type === 'kitchen'
  const c = isCaseType(type) ? SIZE_LIMITS[type] : null
  const lower = kitchen ? snap(clamp(input.lowerLength, LIMITS.lower.min, LIMITS.lower.max), LIMITS.lower.step) : 0
  return {
    type,
    width: c ? snap(clamp(input.width, c.width.min, c.width.max), c.width.step) : 0,
    height: c ? snap(clamp(input.height, c.height.min, c.height.max), c.height.step) : 0,
    depth: c ? snap(clamp(input.depth, c.depth.min, c.depth.max), c.depth.step) : 0,
    sections: c ? Math.round(clamp(input.sections, c.sections.min, c.sections.max)) : 0,
    doors: type === 'wardrobe' ? Math.round(clamp(input.doors, LIMITS.doors.min, LIMITS.doors.max)) : 0,
    layout: kitchen && has(KITCHEN_LAYOUTS, input.layout) ? input.layout : 'straight',
    lowerLength: lower,
    upperLength: kitchen ? snap(clamp(input.upperLength, LIMITS.upper.min, LIMITS.upper.max), LIMITS.upper.step) : 0,
    island: kitchen ? Boolean(input.island) : false,
    body: other || !has(BODY_MATERIALS, input.body) ? 'ldsp' : input.body,
    facade: other || !has(FACADE_MATERIALS, input.facade) ? 'ldsp' : input.facade,
    bodyColor: !other && HEX_RE.test(input.bodyColor) ? input.bodyColor : DEFAULT_BODY_COLOR,
    facadeColor: !other && HEX_RE.test(input.facadeColor) ? input.facadeColor : DEFAULT_FACADE_COLOR,
    fittings: other || !has(FITTINGS, input.fittings) ? 'standard' : input.fittings,
    options,
    complex: other ? false : Boolean(input.complex),
    install: other ? false : Boolean(input.install),
    dismantle: other ? false : Boolean(input.dismantle),
    description: other ? input.description.trim().slice(0, LIMITS.description.max) : '',
  }
}

/** Stable key: identical settings → identical key → merged in the cart. */
export function configKey(config: ItemConfig): string {
  const c = normalizeConfig(config)
  const options = OPTION_IDS.filter((id) => c.options[id]).map((id) => `${id}:${c.options[id]}`).join(',')
  return [
    c.type, c.width, c.height, c.depth, c.sections, c.doors, c.layout, c.lowerLength, c.upperLength, c.island ? 1 : 0,
    c.body, c.facade, c.bodyColor, c.facadeColor, c.fittings, options, c.complex ? 1 : 0, c.install ? 1 : 0, c.dismantle ? 1 : 0, c.description,
  ].join('|')
}

export function roundTo(value: number, step: number): number {
  if (step <= 1) return Math.round(value)
  return Math.round(value / step) * step
}

const money = (n: number): number => Math.round(n * 100) / 100
const metres = (mm: number): string => (mm / 1000).toLocaleString('uk-UA', { maximumFractionDigits: 2 })

/** Number of corner modules for a kitchen layout. */
export function cornerCount(layout: ItemConfig['layout']): number {
  return layout === 'u' ? 2 : layout === 'corner' ? 1 : 0
}

export function frontArea(c: Pick<ItemConfig, 'width' | 'height'>): number {
  return Math.round((c.width * c.height) / 10000) / 100
}

function baseLines(c: ItemConfig, prices: PriceList): PriceLine[] {
  if (isCaseType(c.type)) {
    const area = frontArea(c)
    return [{ kind: 'base', label: `${TYPE_LABELS[c.type]}: ${area.toLocaleString('uk-UA')} м² фасаду × ${formatUah(prices.perM2[c.type])}`, amount: money(area * prices.perM2[c.type]) }]
  }
  const k = prices.kitchen
  const lines: PriceLine[] = [{ kind: 'base', label: `Нижні модулі: ${metres(c.lowerLength)} м × ${formatUah(k.lowerPerM)}`, amount: money((c.lowerLength / 1000) * k.lowerPerM) }]
  if (c.upperLength > 0) lines.push({ kind: 'base', label: `Верхні модулі: ${metres(c.upperLength)} м × ${formatUah(k.upperPerM)}`, amount: money((c.upperLength / 1000) * k.upperPerM) })
  lines.push({ kind: 'base', label: `Стільниця: ${metres(c.lowerLength)} м × ${formatUah(k.countertopPerM)}`, amount: money((c.lowerLength / 1000) * k.countertopPerM) })
  const corners = cornerCount(c.layout)
  if (corners > 0) lines.push({ kind: 'base', label: `${LAYOUT_LABELS[c.layout]}: кутових модулів ${corners} × ${formatUah(k.corner)}`, amount: money(corners * k.corner) })
  if (c.island) lines.push({ kind: 'base', label: 'Острів', amount: money(k.island) })
  return lines
}

export function estimateItem(raw: ItemConfig, prices: PriceList): ItemEstimate {
  const c = normalizeConfig(raw)
  if (c.type === 'other') return { manual: true, lines: [], serviceLines: [], unit: null, service: 0, total: null }

  const lines = baseLines(c, prices)
  const base = lines.reduce((sum, l) => sum + l.amount, 0)
  let running = base

  const facadePct = prices.facadePct[c.facade]
  if (facadePct > 0) {
    const v = money((base * facadePct) / 100)
    lines.push({ kind: 'material', label: `Фасади: ${FACADE_LABELS[c.facade]} +${facadePct}%`, amount: v })
    running += v
  }
  const bodyPct = prices.bodyPct[c.body]
  if (bodyPct > 0) {
    const v = money((base * bodyPct) / 100)
    lines.push({ kind: 'material', label: `Корпус: ${BODY_LABELS[c.body]} +${bodyPct}%`, amount: v })
    running += v
  }
  if (c.fittings === 'premium' && prices.premiumFittingsPct > 0) {
    const v = money((running * prices.premiumFittingsPct) / 100)
    lines.push({ kind: 'fittings', label: `Фурнітура преміум +${prices.premiumFittingsPct}%`, amount: v })
    running += v
  }
  for (const id of OPTION_IDS) {
    const qty = c.options[id] ?? 0
    if (qty > 0) {
      const v = money(qty * prices.options[id])
      lines.push({ kind: 'option', label: `${OPTION_LABELS[id].title}: ${qty} × ${formatUah(prices.options[id])}`, amount: v })
      running += v
    }
  }
  if (c.complex && prices.complexityPct > 0) {
    const v = money((running * prices.complexityPct) / 100)
    lines.push({ kind: 'complex', label: `Складна форма +${prices.complexityPct}%`, amount: v })
    running += v
  }

  const unit = roundTo(running, prices.roundTo)
  const delta = money(unit - running)
  if (delta !== 0) lines.push({ kind: 'rounding', label: `Заокруглення до ${prices.roundTo} ₴`, amount: delta })

  const serviceLines: PriceLine[] = []
  if (c.install && prices.installPct > 0) {
    serviceLines.push({ kind: 'install', label: `Монтаж ${prices.installPct}%`, amount: roundTo((unit * prices.installPct) / 100, prices.roundTo) })
  }
  if (c.dismantle && prices.dismantle > 0) serviceLines.push({ kind: 'dismantle', label: 'Демонтаж старих меблів', amount: prices.dismantle })
  const service = serviceLines.reduce((sum, l) => sum + l.amount, 0)

  return { manual: false, lines, serviceLines, unit, service, total: unit + service }
}

export function liftFee(options: OrderOptions, prices: PriceList): number {
  if (!options.delivery || options.elevator) return 0
  const floors = Math.round(clamp(options.floor, LIMITS.floor.min, LIMITS.floor.max)) - 1
  return floors > 0 ? floors * prices.liftPerFloor : 0
}

export function estimateOrder(items: Pick<CartItem, 'id' | 'config' | 'qty'>[], prices: PriceList, options: OrderOptions): OrderEstimate {
  const rows = items.map((item) => {
    const qty = Math.round(clamp(item.qty, LIMITS.qty.min, LIMITS.qty.max))
    const est = estimateItem(item.config, prices)
    return { id: item.id, qty, estimate: { ...est, total: est.unit === null ? null : (est.unit + est.service) * qty } }
  })
  const knownSum = rows.reduce((sum, r) => sum + (r.estimate.unit ?? 0) * r.qty, 0)
  const serviceTotal = rows.reduce((sum, r) => sum + r.estimate.service * r.qty, 0)
  const hasKnown = rows.some((r) => !r.estimate.manual)
  const minimumTopUp = hasKnown && knownSum < prices.minOrder ? prices.minOrder - knownSum : 0
  const furnitureTotal = knownSum + minimumTopUp
  const deliveryFee = options.delivery ? prices.deliveryFee : 0
  const outOfCityFee = options.outOfCity ? prices.outOfCityFee : 0
  const lift = liftFee(options, prices)
  const measureFee = prices.measureFee
  return {
    items: rows,
    knownSum,
    minimumTopUp,
    furnitureTotal,
    serviceTotal,
    measureFee,
    deliveryFee,
    outOfCityFee,
    liftFee: lift,
    total: furnitureTotal + serviceTotal + measureFee + deliveryFee + outOfCityFee + lift,
    manualCount: rows.filter((r) => r.estimate.manual).length,
    hasKnown,
  }
}

export function formatUah(value: number): string {
  return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(Math.round(value))} ₴`
}

/** Short tariff label for a type card: "від 7 500 ₴/м²", "від 11 000 ₴/пог. м", "після заміру". */
export function rateLabel(type: ItemConfig['type'], prices: PriceList): string {
  if (type === 'other') return 'після фото'
  if (type === 'kitchen') return `від ${formatUah(prices.kitchen.lowerPerM)}/пог. м`
  return `від ${formatUah(prices.perM2[type])}/м²`
}
