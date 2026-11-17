<template lang="pug">
.detail
  NuxtLink.detail__back(to="/admin/orders") ← Усі заявки
  p.muted(v-if="loading && !order") Завантажуємо…
  .detail__error(v-else-if="error && !order" role="alert")
    p {{ error }}
    AppButton(size="sm" variant="secondary" @click="load") Спробувати ще

  template(v-else-if="order")
    header.detail__head
      div
        h1.detail__title {{ order.name }}
        p.muted Надійшла {{ formatDateTime(order.createdAt) }}
      StatusBadge(:status="order.status")
    p.detail__anon(v-if="order.anonymized") Персональні дані знеособлено за політикою зберігання.

    .detail__grid
      .detail__col
        section.card
          h2.card__title Контакт
          dl.facts
            .facts__row
              dt Телефон
              dd
                a(v-if="order.phone" :href="`tel:${order.phone}`") {{ formatPhone(order.phone) }}
                span(v-else) —
            .facts__row
              dt Адреса
              dd {{ order.address || '—' }}
            .facts__row
              dt За місто
              dd {{ order.options.outOfCity ? `так (+${formatUah(order.priceSnapshot.outOfCityFee)})` : 'ні' }}
            .facts__row
              dt Доставка
              dd {{ order.options.delivery ? `так, ${order.options.floor} поверх, ${order.options.elevator ? 'є ліфт' : 'без ліфта'}` : 'самовивіз' }}
            .facts__row
              dt Бажаний замір
              dd {{ order.preferredDate ? `${formatDate(order.preferredDate)} ${order.preferredTime ?? ''}` : 'без побажань' }}
          .card__note(v-if="order.comment")
            strong Коментар клієнта
            p {{ order.comment }}

        section.card(v-if="order.photos.length")
          h2.card__title Фото ({{ order.photos.length }})
          ul.photos
            li(v-for="(p, i) in order.photos" :key="p.id")
              a(:href="`/api/admin/photos/${p.id}`" target="_blank" rel="noopener")
                img(:src="`/api/admin/photos/${p.id}`" :alt="`Фото ${i + 1} з ${order.photos.length}`" loading="lazy")

        section.card
          h2.card__title Склад і попередній розрахунок
          ul.items
            li.items__item(v-for="row in itemRows" :key="row.item.id")
              .items__head
                strong {{ row.info.title }}
                  span(v-if="row.item.qty > 1")  × {{ row.item.qty }}
              p.muted {{ row.info.params.join(' · ') }}
              p.muted(v-if="row.info.options.length") + {{ row.info.options.join(', ') }}
              p.muted(v-if="row.info.services.length") Послуги: {{ row.info.services.join(', ') }}
              PriceLines(v-if="row.estimate" :estimate="row.estimate" :qty="row.item.qty")
          OrderTotals(:estimate="order.estimate" :min-order="order.priceSnapshot.minOrder")

      .detail__col
        form.card.manage(@submit.prevent="save")
          h2.card__title Замір і погодження
          SegmentedControl(v-model="form.status" legend="Статус" :options="statusOptions")
          label.field
            span.field__label Дата й час заміру
            input.field__input(v-model="form.measureLocal" type="datetime-local" :aria-invalid="Boolean(formError && form.status === 'measure' && !form.measureLocal)")
            span.field__hint Потрібно для статусу «Замір». Клієнт побачить її за своїм посиланням.
          .manage__grid
            label.field
              span.field__label Остаточна ціна, ₴
              input.field__input(v-model.number="form.finalPrice" type="number" min="0" step="100" inputmode="numeric" :aria-invalid="Boolean(formError && needsAgreement && form.finalPrice === null)")
              button.manage__fill(type="button" @click="form.finalPrice = order.estimate.total") Взяти розрахунок ({{ formatUah(order.estimate.total) }})
            label.field
              span.field__label Строк виготовлення, роб. днів
              input.field__input(v-model.number="form.productionDays" type="number" min="1" max="365" inputmode="numeric" :aria-invalid="Boolean(formError && needsAgreement && form.productionDays === null)")
              span.field__hint(v-if="leadHint") Типово: {{ leadHint }}
          label.field
            span.field__label Дата монтажу
              span.field__optional  — можна пізніше
            input.field__input(v-model="form.agreedLocal" type="datetime-local")
          label.field
            span.field__label Приватна нотатка
            textarea.field__input(v-model="form.ownerNote" rows="3" maxlength="4000" placeholder="Бачите лише ви. Клієнт її не бачить.")
          p.field__error(v-if="formError" role="alert") {{ formError }}
          AppButton(type="submit" block :loading="saving") Зберегти

        section.card
          h2.card__title Посилання для клієнта
          p.muted Клієнт бачить статус, ціну й час за цим посиланням.
          .link
            input.link__input(:value="clientUrl" readonly aria-label="Посилання для клієнта")
            AppButton(size="sm" variant="secondary" @click="copy(clientUrl)") Копіювати

        section.card(v-if="order.bonus")
          h2.card__title Бонус з гри
          p
            strong {{ order.bonus.code }}
            |  — {{ formatUah(order.bonus.amount) }} на наступне від {{ formatUah(order.bonus.minOrder) }}, до {{ formatShort(order.bonus.expiresAt) }}
          p.muted Статус: {{ BONUS_LABELS[order.bonus.status] ?? order.bonus.status }}
          .card__actions
            AppButton(v-if="order.bonus.status === 'issued'" size="sm" variant="secondary" @click="setBonus('redeemed')") Позначити використаним
            AppButton(v-if="order.bonus.status === 'issued'" size="sm" variant="ghost" @click="setBonus('void')") Анулювати
            AppButton(v-if="order.bonus.status !== 'issued'" size="sm" variant="ghost" @click="setBonus('issued')") Повернути в «видано»

        section.card
          h2.card__title Історія
          ol.history
            li(v-for="e in order.events" :key="e.id")
              span.history__at {{ formatShort(e.at) }}
              span {{ eventLabel(e) }}

        section.card.card--danger
          h2.card__title Видалення
          p.muted Видаляє заявку разом із фото й історією без можливості відновлення. Використовуйте на запит клієнта.
          AppButton(variant="danger" size="sm" @click="confirmOpen = true") Видалити заявку

  ConfirmDialog(
    :open="confirmOpen"
    title="Видалити заявку?"
    :text="`Заявку ${order?.name ?? ''} і ${order?.photos.length ?? 0} фото буде видалено назавжди.`"
    confirm-label="Видалити"
    danger
    @answer="onConfirm"
  )
</template>

<script setup lang="ts">
import type { AdminOrder, AdminOrderEvent } from '#shared/adminTypes'
import { ORDER_STATUSES } from '#shared/types'
import type { OrderStatus } from '#shared/types'
import { STATUS_LABELS, TYPE_LABELS } from '#shared/content/services'
import { formatUah } from '#shared/pricing'


definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Заявка' })

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))
const { show } = useToast()

const order = ref<AdminOrder | null>(null)
const loading = ref(false)
const error = ref('')
const saving = ref(false)
const formError = ref('')
const confirmOpen = ref(false)
const form = reactive<{ status: OrderStatus; measureLocal: string; finalPrice: number | null; productionDays: number | null; agreedLocal: string; ownerNote: string }>({
  status: 'new',
  measureLocal: '',
  finalPrice: null,
  productionDays: null,
  agreedLocal: '',
  ownerNote: '',
})
const settings = useSettings()
const colorName = useColorName()

const BONUS_LABELS: Record<string, string> = { issued: 'видано', redeemed: 'використано', void: 'анульовано' }
const statusOptions = ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))
const needsAgreement = computed(() => form.status === 'agreed')
const leadHint = computed(() => {
  const types = [...new Set((order.value?.items ?? []).map((i) => i.config.type))].filter((t) => t !== 'other')
  const lead = settings.value.company.leadDays
  return types.map((t) => `${TYPE_LABELS[t]} — ${lead[t as keyof typeof lead]}`).join(', ')
})
const clientUrl = computed(() => (order.value && import.meta.client ? `${window.location.origin}/order/${order.value.token}` : ''))

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fill(o: AdminOrder): void {
  order.value = o
  form.status = o.status
  form.measureLocal = toLocalInput(o.measureAt)
  form.finalPrice = o.finalPrice
  form.productionDays = o.productionDays
  form.agreedLocal = toLocalInput(o.agreedAt)
  form.ownerNote = o.ownerNote
}

const itemRows = computed(() =>
  (order.value?.items ?? []).map((item) => ({
    item,
    info: describeItem(item.config, colorName),
    estimate: order.value?.estimate.items.find((r) => r.id === item.id)?.estimate ?? null,
  })),
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    fill(await adminFetch<AdminOrder>(`/api/admin/orders/${id.value}`))
  } catch (e) {
    error.value = adminErrorMessage(e, 'Не вдалося завантажити заявку')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  formError.value = ''
  const price = typeof form.finalPrice === 'number' && Number.isFinite(form.finalPrice) ? Math.round(form.finalPrice) : null
  const days = typeof form.productionDays === 'number' && Number.isFinite(form.productionDays) && form.productionDays > 0 ? Math.round(form.productionDays) : null
  if (form.status === 'measure' && !form.measureLocal) {
    formError.value = 'Для статусу «Замір» вкажіть дату й час заміру.'
    return
  }
  if (needsAgreement.value && (price === null || days === null)) {
    formError.value = 'Для статусу «Погоджена» вкажіть остаточну ціну й строк виготовлення.'
    return
  }
  saving.value = true
  try {
    const updated = await adminFetch<AdminOrder>(`/api/admin/orders/${id.value}`, {
      method: 'PATCH',
      body: {
        status: form.status,
        measureAt: form.measureLocal ? new Date(form.measureLocal).toISOString() : null,
        finalPrice: price,
        productionDays: days,
        agreedAt: form.agreedLocal ? new Date(form.agreedLocal).toISOString() : null,
        ownerNote: form.ownerNote,
      },
    })
    fill(updated)
    show('Збережено. Клієнт побачить зміни за своїм посиланням.', { tone: 'success' })
  } catch (e) {
    formError.value = adminErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function setBonus(status: 'issued' | 'redeemed' | 'void'): Promise<void> {
  if (!order.value?.bonus) return
  try {
    await adminFetch(`/api/admin/bonuses/${order.value.bonus.code}`, { method: 'PATCH', body: { status } })
    await load()
  } catch (e) {
    show(adminErrorMessage(e), { tone: 'error' })
  }
}

async function onConfirm(ok: boolean): Promise<void> {
  confirmOpen.value = false
  if (!ok) return
  try {
    await adminFetch(`/api/admin/orders/${id.value}`, { method: 'DELETE' })
    show('Заявку видалено', { tone: 'success' })
    await navigateTo('/admin/orders')
  } catch (e) {
    show(adminErrorMessage(e), { tone: 'error' })
  }
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    show('Посилання скопійовано')
  } catch {
    show('Не вдалося скопіювати', { tone: 'error' })
  }
}

function eventLabel(e: AdminOrderEvent): string {
  const d = e.data
  switch (e.kind) {
    case 'created':
      return `Заявку створено (≈ ${formatUah(Number(d.total ?? 0))}${Number(d.manual ?? 0) ? ', є позиції з ручною оцінкою' : ''})`
    case 'status':
      return `Статус: ${STATUS_LABELS[d.from as OrderStatus] ?? d.from} → ${STATUS_LABELS[d.to as OrderStatus] ?? d.to}`
    case 'price':
      return d.value === null ? 'Ціну скинуто' : `Остаточна ціна: ${formatUah(Number(d.value))}`
    case 'measure':
      return d.value ? `Замір: ${formatDateTime(String(d.value))}` : 'Дату заміру скинуто'
    case 'days':
      return d.value === null ? 'Строк скинуто' : `Строк виготовлення: ${Number(d.value)} роб. днів`
    case 'time':
      return d.value ? `Монтаж: ${formatDateTime(String(d.value))}` : 'Дату монтажу скинуто'
    case 'note':
      return 'Оновлено приватну нотатку'
    case 'bonus_issued':
      return `Видано бонус з гри: ${formatUah(Number(d.amount ?? 0))}`
    case 'bonus_status':
      return `Бонус: ${BONUS_LABELS[String(d.status)] ?? d.status}`
    default:
      return e.kind
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.detail {
  display: grid;
  gap: $sp-4;

  &__back {
    width: fit-content;
    color: $c-ink-2;
    text-decoration: none;
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: $sp-3;
  }

  &__title {
    font-size: $fs-2xl;
  }

  &__anon {
    padding: $sp-3;
    border-radius: $r-md;
    background: $c-sun-soft;
  }

  &__grid {
    display: grid;
    gap: $sp-4;

    @include up($bp-lg) {
      grid-template-columns: 1.2fr 1fr;
      align-items: start;
    }
  }

  &__col {
    display: grid;
    gap: $sp-4;
  }

  &__error {
    display: grid;
    gap: $sp-2;
    justify-items: start;
    color: $c-danger;
  }
}

.card {
  display: grid;
  gap: $sp-3;
  padding: $sp-5;
  border-radius: $r-lg;
  background: $c-surface;
  border: $border solid $c-line;

  &__title {
    font-size: $fs-lg;
  }

  &__note {
    display: grid;
    gap: $sp-1;
    padding: $sp-3;
    border-radius: $r-md;
    background: $c-bg;
    white-space: pre-wrap;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
  }

  &--danger {
    border-color: $c-danger;
  }
}

.facts {
  display: grid;
  gap: $sp-2;
  margin: 0;

  &__row {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: $sp-3;
    padding-bottom: $sp-2;
    border-bottom: $border solid $c-line;
  }

  dt {
    color: $c-ink-2;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: $sp-2;
  margin: 0;
  padding: 0;
  list-style: none;

  img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: $r-md;
  }
}

.items {
  display: grid;
  gap: $sp-4;
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    display: grid;
    gap: $sp-1;
    padding-bottom: $sp-4;
    border-bottom: $border solid $c-line;
    font-size: $fs-sm;
  }
}

.manage {
  border-color: $c-accent;

  &__grid {
    display: grid;
    gap: $sp-4;

    @include up($bp-sm) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__fill {
    width: fit-content;
    padding: 0;
    border: 0;
    background: none;
    color: $c-accent;
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    text-decoration: underline;
  }
}

.link {
  display: flex;
  gap: $sp-2;

  &__input {
    flex: 1;
    min-width: 0;
    min-height: $tap-sm;
    padding: 0 $sp-3;
    border: $border solid $c-line;
    border-radius: $r-sm;
    background: $c-bg;
    color: $c-ink-2;
    font-family: $font-mono;
    font-size: $fs-xs;
  }
}

.history {
  display: grid;
  gap: $sp-2;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: $fs-sm;

  li {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: $sp-2;
  }

  &__at {
    color: $c-ink-3;
    font-variant-numeric: tabular-nums;
  }
}
</style>
