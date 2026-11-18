/** Notification settings for the cabinet: whether the bot token is set, the bot name, saved chat. */
export default defineEventHandler(async () => {
  const settings = await getSetting('notify')
  const configured = telegramConfigured()
  let bot: { username: string; name: string } | null = null
  let botError = ''
  if (configured) {
    const me = await telegramCall<{ username: string; first_name: string }>('getMe')
    if (me.ok && me.result) bot = { username: me.result.username, name: me.result.first_name }
    else botError = me.error ?? 'Невідома помилка'
  }
  return { configured, bot, botError, settings }
})
