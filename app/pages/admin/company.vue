<template lang="pug">
form.settings-page(@submit.prevent="save")
  header
    h1.settings-page__title Майстерня
    p.muted Ці дані показуються на сайті, у контактах і в розмітці для пошукових систем. Порожні контакти на сайті не показуються.

  section.panel
    h2.panel__title Назва
    .form-grid
      label.field
        span.field__label Назва майстерні
        input.field__input(v-model.trim="form.name" maxlength="80" required)
      label.field
        span.field__label Короткий опис
        input.field__input(v-model.trim="form.tagline" maxlength="140")
      label.field
        span.field__label Юридична назва
          span.field__optional  — за бажанням
        input.field__input(v-model.trim="form.legalName" maxlength="160" placeholder="ФОП … або ТОВ …")

  section.panel
    h2.panel__title Контакти
    p.muted Вказуйте лише робочі канали. Без телефону кнопка «Подзвонити» на сайті не зʼявиться.
    .form-grid
      label.field
        span.field__label Телефон
        input.field__input(v-model.trim="form.phone" type="tel" placeholder="+380XXXXXXXXX")
        span.field__hint Формат +380 і 9 цифр
      label.field
        span.field__label Telegram
        input.field__input(v-model.trim="form.telegram" placeholder="username без @")
      label.field
        span.field__label Viber
        input.field__input(v-model.trim="form.viber" type="tel" placeholder="+380XXXXXXXXX")
      label.field
        span.field__label Email
        input.field__input(v-model.trim="form.email" type="email")
      label.field
        span.field__label Години роботи
        input.field__input(v-model.trim="form.workHours" maxlength="80")

  section.panel
    h2.panel__title Місто й територія
    .form-grid
      label.field
        span.field__label Місто
        input.field__input(v-model.trim="form.city" maxlength="80" required)
      label.field
        span.field__label Територія обслуговування
        textarea.field__input(v-model.trim="form.serviceArea" rows="2" maxlength="300")

  section.panel
    h2.panel__title Акцентний колір
    .swatches(role="radiogroup" aria-label="Акцентний колір")
      label.swatch(v-for="a in ACCENT_OPTIONS" :key="a.value" :class="{ 'is-active': form.accent === a.value }")
        input.visually-hidden(v-model="form.accent" type="radio" name="accent" :value="a.value")
        span.swatch__dot.accent-dot(:data-accent="a.value")
        span {{ a.label }}
    p.field__hint Повна палітра, логотип і шрифти змінюються в коді (див. docs/ADAPTATION.md).

  section.panel
    h2.panel__title Строки виготовлення
    p.muted Показуються в картках вибору як орієнтир. Точний строк ви вказуєте в заявці після заміру.
    .form-grid
      NumberField(v-for="t in LEAD_TYPES" :key="t" v-model="form.leadDays[t]" :label="TYPE_LABELS[t]" suffix="роб. днів" :min="1" :max="365")

  section.panel
    h2.panel__title Палітра матеріалів
    p.muted Кольори корпусу й фасадів у конфігураторі. «Текстура дерева» додає волокна в 3D. До {{ LIMITS.swatches }} кольорів.
    ul.palette
      li.palette__row(v-for="(sw, i) in form.swatches" :key="i")
        input.palette__color(v-model="sw.hex" type="color" :aria-label="`Колір ${sw.name}`")
        label.field.palette__name
          span.visually-hidden Назва кольору
          input.field__input(v-model.trim="sw.name" maxlength="40" required)
        label.check.palette__grain
          input(v-model="sw.grain" type="checkbox")
          span Текстура дерева
        AppButton(size="sm" variant="ghost" :disabled="form.swatches.length <= 1" :aria-label="`Видалити колір ${sw.name}`" @click="removeSwatch(i)") Видалити
    AppButton(v-if="form.swatches.length < LIMITS.swatches" size="sm" variant="secondary" @click="addSwatch") Додати колір

  section.panel
    h2.panel__title Зберігання персональних даних
    NumberField(v-model="form.retentionDays" label="Знеособлювати виконані й скасовані заявки через" suffix="днів" :min="30" :max="3650" hint="Імʼя, телефон, адреса, коментар, нотатка й фото видаляються; склад і суми лишаються для обліку.")

  SaveBar(:dirty="dirty" :saving="saving" :error="error" @reset="reset")
</template>

<script setup lang="ts">
import type { Accent } from '#shared/types'
import { TYPE_LABELS } from '#shared/content/services'
import { LIMITS } from '#shared/limits'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Майстерня' })

const ACCENT_OPTIONS: { value: Accent; label: string }[] = [
  { value: 'walnut', label: 'Горіх' },
  { value: 'sage', label: 'Шавлія' },
  { value: 'ink', label: 'Чорнило' },
  { value: 'clay', label: 'Глина' },
]

const LEAD_TYPES = ['kitchen', 'wardrobe', 'walkin', 'hallway', 'cabinet'] as const

function addSwatch(): void {
  if (form.value.swatches.length >= LIMITS.swatches) return
  form.value.swatches.push({ name: 'Новий колір', hex: '#b08d6a', grain: false })
}

function removeSwatch(index: number): void {
  if (form.value.swatches.length > 1) form.value.swatches.splice(index, 1)
}

const { form, saving, error, dirty, save, reset } = useSettingsForm('company')
</script>

<style lang="scss" scoped>
.palette {
  display: grid;
  gap: $sp-2;
  margin: 0;
  padding: 0;
  list-style: none;

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $sp-3;
    padding: $sp-2 0;
    border-bottom: $border solid $c-line;
  }

  &__color {
    width: $tap;
    height: $tap;
    padding: 0;
    border: $border-strong solid $c-line;
    border-radius: $r-md;
    background: none;
    cursor: pointer;
  }

  &__name {
    flex: 1 1 180px;
  }

  &__grain {
    min-height: $tap-sm;
    align-items: center;
  }
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-2;
}

.swatch {
  display: inline-flex;
  align-items: center;
  gap: $sp-2;
  min-height: $tap;
  padding: 0 $sp-4 0 $sp-2;
  border: $border-strong solid $c-line;
  border-radius: $r-pill;
  cursor: pointer;
  font-weight: $fw-semibold;

  &.is-active {
    border-color: $c-ink;
  }

  &:has(:focus-visible) {
    @include focus-ring;
  }

  &__dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
}
</style>
