<template lang="pug">
form.settings-page(@submit.prevent="save")
  header
    h1.settings-page__title Сповіщення
    p.muted Нова заявка приходить у Telegram одразу після відправки: склад, сума, контакт і посилання на картку в кабінеті.

  p.muted(v-if="loading && !info") Завантажуємо…
  p.field__error(v-else-if="loadError" role="alert") {{ loadError }}

  template(v-else-if="info")
    section.panel
      h2.panel__title 1. Бот
      template(v-if="info.configured && info.bot")
        p
          | Підключено бота
          |
          a(:href="`https://t.me/${info.bot.username}`" target="_blank" rel="noopener") @{{ info.bot.username }}
          | .
      template(v-else-if="info.configured")
        p.field__error(role="alert") Токен задано, але Telegram його не приймає: {{ info.botError }}
      template(v-else)
        p Бота ще не підключено. Це робиться один раз:
        ol.steps
          li
            | У Telegram відкрийте
            |
            a(href="https://t.me/BotFather" target="_blank" rel="noopener") @BotFather
            | , надішліть /newbot і задайте назву — він видасть токен.
          li
            | Додайте токен у змінну середовища
            code  NUXT_TELEGRAM_BOT_TOKEN
            |  на сервері (Vercel → Settings → Environment Variables або .env на VPS) і перезапустіть сайт.
          li Оновіть цю сторінку.
        p.field__hint Токен зберігається лише на сервері й ніколи не потрапляє в браузер.

    section.panel(v-if="info.configured && info.bot")
      h2.panel__title 2. Куди надсилати
      p.muted
        | Напишіть боту
        |
        a(:href="`https://t.me/${info.bot.username}`" target="_blank" rel="noopener") @{{ info.bot.username }}
        |  будь-яке повідомлення (наприклад, /start) або додайте його в робочу групу, потім натисніть «Знайти чат».
      .actions
        AppButton(variant="secondary" :loading="detecting" @click="detect") Знайти чат
      ul.chats(v-if="chats.length")
        li(v-for="c in chats" :key="c.id")
          label.check
            input(v-model="form.telegramChatId" type="radio" name="chat" :value="c.id")
            span
              strong {{ c.title }}
              span.muted  · {{ CHAT_TYPES[c.type] ?? c.type }} · {{ c.id }}
      p.muted(v-else-if="detected") Повідомлень боту поки немає. Напишіть йому й натисніть «Знайти чат» ще раз.
      label.field
        span.field__label Chat id
        input.field__input(v-model.trim="form.telegramChatId" inputmode="numeric" placeholder="Наприклад, 123456789 або -1001234567890")
        span.field__hint Заповнюється кнопкою вище; можна вписати вручну.
      ToggleSwitch(v-model="form.includeContacts" label="Телефон і адреса в повідомленні" hint="Якщо вимкнути, прийде лише склад, сума й посилання на кабінет")
      ToggleSwitch(v-model="form.enabled" label="Надсилати нові заявки" :disabled="!form.telegramChatId")
      .actions
        AppButton(variant="secondary" :loading="testing" :disabled="!form.telegramChatId" @click="test") Надіслати тест
      p.field__error(v-if="actionError" role="alert") {{ actionError }}

    SaveBar(:dirty="dirty" :saving="saving" :error="error" @reset="reset")
</template>

<script setup lang="ts">
import type { NotifySettings } from '#shared/types'
import { DEFAULT_NOTIFY } from '#shared/defaults'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Сповіщення' })

interface NotifyInfo {
  configured: boolean
  bot: { username: string; name: string } | null
  botError: string
  settings: NotifySettings
}

interface DetectedChat {
  id: string
  title: string
  type: string
}

const CHAT_TYPES: Record<string, string> = { private: 'особистий чат', group: 'група', supergroup: 'група', channel: 'канал' }

const { show } = useToast()
const info = ref<NotifyInfo | null>(null)
const form = ref<NotifySettings>(structuredClone(DEFAULT_NOTIFY))
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const error = ref('')
const actionError = ref('')
const detecting = ref(false)
const detected = ref(false)
const testing = ref(false)
const chats = ref<DetectedChat[]>([])

const dirty = computed(() => Boolean(info.value) && JSON.stringify(form.value) !== JSON.stringify(info.value?.settings))

watch(
  () => form.value.telegramChatId,
  (id) => {
    if (!id) form.value.enabled = false
  },
)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    info.value = await adminFetch<NotifyInfo>('/api/admin/notify')
    form.value = structuredClone(toRaw(info.value.settings))
  } catch (e) {
    loadError.value = adminErrorMessage(e, 'Не вдалося завантажити налаштування')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const saved = await adminFetch<NotifySettings>('/api/admin/settings/notify', { method: 'PUT', body: form.value })
    if (info.value) info.value = { ...info.value, settings: saved }
    form.value = structuredClone(saved)
    show(saved.enabled ? 'Збережено. Нові заявки прийдуть у Telegram.' : 'Збережено', { tone: 'success' })
  } catch (e) {
    error.value = adminErrorMessage(e, 'Не вдалося зберегти')
  } finally {
    saving.value = false
  }
}

function reset(): void {
  if (info.value) form.value = structuredClone(toRaw(info.value.settings))
  error.value = ''
}

async function detect(): Promise<void> {
  detecting.value = true
  actionError.value = ''
  try {
    const res = await adminFetch<{ chats: DetectedChat[] }>('/api/admin/notify/detect', { method: 'POST' })
    chats.value = res.chats
    detected.value = true
    const first = res.chats[0]
    if (first && !form.value.telegramChatId) form.value.telegramChatId = first.id
  } catch (e) {
    actionError.value = adminErrorMessage(e, 'Не вдалося отримати чати')
  } finally {
    detecting.value = false
  }
}

async function test(): Promise<void> {
  testing.value = true
  actionError.value = ''
  try {
    await adminFetch('/api/admin/notify/test', { method: 'POST', body: { chatId: form.value.telegramChatId } })
    show('Тестове повідомлення надіслано', { tone: 'success' })
  } catch (e) {
    actionError.value = adminErrorMessage(e, 'Не вдалося надіслати')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.steps {
  display: grid;
  gap: $sp-2;
  margin: 0;
  padding-left: $sp-5;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-2;
}

.chats {
  display: grid;
  gap: $sp-1;
  margin: 0;
  padding: 0;
  list-style: none;
}

code {
  font-family: $font-mono;
  font-size: $fs-sm;
}
</style>
