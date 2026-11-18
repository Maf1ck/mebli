interface TgChat {
  id: number
  type: string
  title?: string
  first_name?: string
  last_name?: string
  username?: string
}

interface TgUpdate {
  message?: { chat: TgChat }
  channel_post?: { chat: TgChat }
  my_chat_member?: { chat: TgChat }
}

/**
 * Lists chats that recently wrote to the bot (or added it to a group), so the owner
 * can pick one instead of looking up a chat id by hand.
 */
export default defineEventHandler(async () => {
  const res = await telegramCall<TgUpdate[]>('getUpdates', { limit: 100, allowed_updates: ['message', 'channel_post', 'my_chat_member'] })
  if (!res.ok) throw createError({ statusCode: 502, message: `Telegram: ${res.error}` })
  const chats = new Map<string, { id: string; title: string; type: string }>()
  for (const u of res.result ?? []) {
    const chat = u.message?.chat ?? u.channel_post?.chat ?? u.my_chat_member?.chat
    if (!chat) continue
    const title = chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || (chat.username ? `@${chat.username}` : String(chat.id)))
    chats.set(String(chat.id), { id: String(chat.id), title, type: chat.type })
  }
  return { chats: [...chats.values()].reverse() }
})
