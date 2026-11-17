import { OPTION_IDS } from '#shared/types'
import type { ItemConfig } from '#shared/types'
import { BODY_LABELS, FACADE_LABELS, FITTINGS_LABELS, LAYOUT_LABELS, OPTION_LABELS, TYPE_LABELS } from '#shared/content/services'
import { isCaseType } from '#shared/pricing'

const metres = (mm: number): string => `${(mm / 1000).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} м`

/** Human-readable lines describing one configured item. */
export function describeItem(c: ItemConfig, colorName: (hex: string) => string = (hex) => hex): { title: string; params: string[]; options: string[]; services: string[] } {
  const params: string[] = []
  if (isCaseType(c.type)) {
    params.push(`${c.width} × ${c.height} × ${c.depth} мм`, `${c.sections} секц.`)
    if (c.type === 'wardrobe') params.push(`${c.doors} дверей-купе`)
  } else if (c.type === 'kitchen') {
    params.push(`${LAYOUT_LABELS[c.layout].toLowerCase()}`, `низ ${metres(c.lowerLength)}`)
    if (c.upperLength > 0) params.push(`верх ${metres(c.upperLength)}`)
    if (c.island) params.push('з островом')
  } else if (c.description) {
    params.push(c.description.length > 90 ? `${c.description.slice(0, 90)}…` : c.description)
  }
  if (c.type !== 'other') {
    params.push(`фасади ${FACADE_LABELS[c.facade]}, ${colorName(c.facadeColor)}`)
    params.push(`корпус ${BODY_LABELS[c.body]}, ${colorName(c.bodyColor)}`)
    params.push(`фурнітура ${FITTINGS_LABELS[c.fittings].toLowerCase()}`)
    if (c.complex) params.push('складна форма')
  }
  const options = OPTION_IDS.filter((id) => (c.options[id] ?? 0) > 0).map((id) => `${OPTION_LABELS[id].title} × ${c.options[id]}`)
  const services: string[] = []
  if (c.install) services.push('монтаж')
  if (c.dismantle) services.push('демонтаж старих меблів')
  return { title: TYPE_LABELS[c.type], params, options, services }
}

/** Swatch name by colour from the workshop palette; falls back to the hex code. */
export function useColorName() {
  const settings = useSettings()
  return (hex: string): string => settings.value.company.swatches.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex
}
