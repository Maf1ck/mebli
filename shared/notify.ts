/**
 * Text of the Telegram message about a new order (HTML parse mode).
 * Pure function so it can be unit-tested; the server sends it.
 */
import type { CartItem, OrderEstimate, OrderOptions } from './types'
import { TYPE_LABELS } from './content/services'
import { formatUah } from './pricing'

export interface OrderNotice {
  id: string
  name: string
  phone: string
  address: string
  options: OrderOptions
  items: Pick<CartItem, 'qty' | 'config'>[]
  estimate: Pick<OrderEstimate, 'total' | 'manualCount' | 'hasKnown'>
  preferredDate: string
  preferredTime: string
  comment: string
  photoCount: number
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function dateUa(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}.${m}.${y}` : iso
}

/** Telegram limit is 4096 characters; long comments are cut. */
export function orderNoticeText(o: OrderNotice, adminUrl: string, includeContacts: boolean): string {
  const items = o.items.map((i) => `${TYPE_LABELS[i.config.type]}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ')
  const sum = o.estimate.hasKnown ? `≈ ${formatUah(o.estimate.total)}` : 'після фото'
  const manual = o.estimate.manualCount > 0 && o.estimate.hasKnown ? ` + ${o.estimate.manualCount} поз. після фото` : ''
  const lines = [
    '<b>Нова заявка</b>',
    `Склад: ${escapeHtml(items)}`,
    `Орієнтовно: ${sum}${manual}`,
    `Імʼя: ${escapeHtml(o.name)}`,
  ]
  if (includeContacts) {
    lines.push(`Телефон: ${escapeHtml(o.phone)}`)
    lines.push(`Адреса: ${escapeHtml(o.address)}${o.options.outOfCity ? ' (за містом)' : ''}`)
  }
  const delivery = o.options.delivery ? `доставка, ${o.options.floor} пов.${o.options.elevator ? '' : ', без ліфта'}` : 'самовивіз'
  lines.push(`Отримання: ${delivery}`)
  lines.push(`Бажаний замір: ${o.preferredDate ? `${dateUa(o.preferredDate)}${o.preferredTime ? ` ${o.preferredTime}` : ''}` : 'без побажань'}`)
  if (o.photoCount > 0) lines.push(`Фото: ${o.photoCount}`)
  if (o.comment) lines.push(`Коментар: ${escapeHtml(o.comment.length > 600 ? `${o.comment.slice(0, 600)}…` : o.comment)}`)
  lines.push('', `<a href="${escapeHtml(adminUrl)}">Відкрити в кабінеті</a>`)
  return lines.join('\n')
}
