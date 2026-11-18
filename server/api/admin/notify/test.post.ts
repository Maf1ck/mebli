import { escapeHtml } from '#shared/notify'
import { z } from 'zod'
import { notifySchema } from '#shared/schemas'

const bodySchema = z.object({ chatId: notifySchema.shape.telegramChatId.optional() })

/** Sends a test message to the given chat (or the saved one). */
export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody<unknown>(event))
  if (!parsed.success) throw createError({ statusCode: 422, message: parsed.error.issues[0]?.message ?? 'Перевірте chat id' })
  const chatId = parsed.data.chatId || (await getSetting('notify')).telegramChatId
  if (!chatId) throw createError({ statusCode: 422, message: 'Спершу вкажіть або знайдіть чат' })
  const company = await getSetting('company')
  const res = await sendTelegram(chatId, `<b>${escapeHtml(company.name)}</b>: тестове сповіщення. Сюди приходитимуть нові заявки.`)
  if (!res.ok) throw createError({ statusCode: 502, message: `Telegram: ${res.error}` })
  return { ok: true }
})
