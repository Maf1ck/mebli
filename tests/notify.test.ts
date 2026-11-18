import { describe, expect, it } from 'vitest'
import { escapeHtml, orderNoticeText } from '../shared/notify'
import type { OrderNotice } from '../shared/notify'
import { defaultConfig } from '../shared/limits'
import { formatUah } from '../shared/pricing'

const notice: OrderNotice = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Тест <Тестенко>',
  phone: '+380000000000',
  address: 'вул. Вигадана, 1',
  options: { outOfCity: true, delivery: true, floor: 5, elevator: false },
  items: [
    { qty: 2, config: defaultConfig('wardrobe') },
    { qty: 1, config: { ...defaultConfig('other'), description: 'Ніша' } },
  ],
  estimate: { total: 84800, manualCount: 1, hasKnown: true },
  preferredDate: '2026-11-20',
  preferredTime: '10:00',
  comment: 'Стіна & кут',
  photoCount: 1,
}

describe('orderNoticeText', () => {
  it('contains the order essentials and a link to the cabinet', () => {
    const t = orderNoticeText(notice, 'https://site.test/admin/orders/1', true)
    expect(t).toContain('Шафа-купе × 2, Інше')
    expect(t).toContain(`≈ ${formatUah(84800)} + 1 поз. після фото`)
    expect(t).toContain('Телефон: +380000000000')
    expect(t).toContain('(за містом)')
    expect(t).toContain('5 пов., без ліфта')
    expect(t).toContain('20.11.2026 10:00')
    expect(t).toContain('<a href="https://site.test/admin/orders/1">')
  })

  it('escapes user text for HTML parse mode', () => {
    const t = orderNoticeText(notice, 'https://site.test/a', true)
    expect(t).toContain('Тест &lt;Тестенко&gt;')
    expect(t).toContain('Стіна &amp; кут')
    expect(escapeHtml('<b>')).toBe('&lt;b&gt;')
  })

  it('omits phone and address when contacts are switched off', () => {
    const t = orderNoticeText(notice, 'https://site.test/a', false)
    expect(t).not.toContain('+380000000000')
    expect(t).not.toContain('Вигадана')
  })
})
