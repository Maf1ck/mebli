import type { H3Event } from 'h3'
import { orderNoticeText } from '#shared/notify'
import type { OrderNotice } from '#shared/notify'

interface TgResponse<T> {
  ok: boolean
  result?: T
  description?: string
}

export interface TgResult<T> {
  ok: boolean
  result?: T
  error?: string
}

function botToken(): string {
  return useRuntimeConfig().telegramBotToken || process.env.NUXT_TELEGRAM_BOT_TOKEN || ''
}

export function telegramConfigured(): boolean {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken())
}

/**
 * Calls the Bot API with a short timeout. Never throws: a Telegram outage must not
 * break the order flow, so callers get { ok: false, error } instead.
 */
export async function telegramCall<T>(method: string, body: Record<string, unknown> = {}): Promise<TgResult<T>> {
  if (!telegramConfigured()) return { ok: false, error: 'Токен бота не задано (NUXT_TELEGRAM_BOT_TOKEN)' }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json()) as TgResponse<T>
    return data.ok ? { ok: true, result: data.result } : { ok: false, error: data.description ?? `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Немає звʼязку з Telegram' }
  }
}

export async function sendTelegram(chatId: string, text: string): Promise<TgResult<unknown>> {
  return telegramCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } })
}

/** Sends the new-order notice if notifications are on; records the outcome in the order history. */
export async function notifyNewOrder(event: H3Event, notice: OrderNotice): Promise<void> {
  const settings = await getSetting('notify')
  if (!settings.enabled || !settings.telegramChatId || !telegramConfigured()) return
  const text = orderNoticeText(notice, `${siteOrigin(event)}/admin/orders/${notice.id}`, settings.includeContacts)
  const res = await sendTelegram(settings.telegramChatId, text)
  const db = await useDb()
  await logEvent(db, notice.id, 'telegram', res.ok ? { ok: true } : { ok: false, error: res.error })
}
