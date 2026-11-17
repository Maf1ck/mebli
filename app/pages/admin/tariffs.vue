<template lang="pug">
form.settings(@submit.prevent="save")
  header
    h1.settings__title Тарифи
    p.muted Нові ціни діють для нових заявок. Уже надіслані заявки зберігають прайс на момент відправки.

  section.card
    h2.card__title Корпусні меблі — за м² фасаду
    .grid
      NumberField(v-for="t in CASE_TYPES" :key="t" v-model="form.perM2[t]" :label="TYPE_LABELS[t]" suffix="₴/м²" :max="1000000")

  section.card
    h2.card__title Кухня
    .grid
      NumberField(v-model="form.kitchen.lowerPerM" label="Нижні модулі" suffix="₴/пог. м" :max="1000000")
      NumberField(v-model="form.kitchen.upperPerM" label="Верхні модулі" suffix="₴/пог. м" :max="1000000")
      NumberField(v-model="form.kitchen.countertopPerM" label="Стільниця" suffix="₴/пог. м" :max="1000000")
      NumberField(v-model="form.kitchen.corner" label="Кутовий модуль" suffix="₴/шт" :max="1000000")
      NumberField(v-model="form.kitchen.island" label="Острів" :max="1000000")

  section.card
    h2.card__title Матеріали й фурнітура
    p.muted Відсоток від бази (розмір × тариф). 0 — без доплати.
    .grid
      NumberField(v-for="f in FACADE_MATERIALS" :key="f" v-model="form.facadePct[f]" :label="`Фасади: ${FACADE_LABELS[f]}`" suffix="%" :max="200")
      NumberField(v-for="b in BODY_MATERIALS" :key="b" v-model="form.bodyPct[b]" :label="`Корпус: ${BODY_LABELS[b]}`" suffix="%" :max="200")
      NumberField(v-model="form.premiumFittingsPct" label="Фурнітура преміум" suffix="%" :max="200")
      NumberField(v-model="form.complexityPct" label="Складна форма" suffix="%" :max="200" hint="Скоси, кути, криволінійні елементи")

  section.card
    h2.card__title Опції — фіксована ціна за одиницю
    .grid
      NumberField(v-for="id in OPTION_IDS" :key="id" v-model="form.options[id]" :label="OPTION_LABELS[id].title" :suffix="`₴/${OPTION_LABELS[id].unit}`")

  section.card
    h2.card__title Мінімум, монтаж і доставка
    .grid
      NumberField(v-model="form.minOrder" label="Мінімальне замовлення" hint="Лише меблі, без монтажу й доставки" :max="1000000")
      NumberField(v-model="form.installPct" label="Монтаж" suffix="%" :max="100" hint="Від ціни меблів позиції")
      NumberField(v-model="form.dismantle" label="Демонтаж старих меблів" suffix="₴/позиція")
      NumberField(v-model="form.measureFee" label="Виїзд на замір" hint="0 — безкоштовно")
      NumberField(v-model="form.deliveryFee" label="Доставка по місту")
      NumberField(v-model="form.outOfCityFee" label="Доплата за місто")
      NumberField(v-model="form.liftPerFloor" label="Підйом без ліфта" suffix="₴/поверх")
      label.field
        span.field__label Заокруглення
        select.field__input(v-model.number="form.roundTo")
          option(v-for="r in ROUNDING" :key="r" :value="r") до {{ r }} ₴

  section.card.preview
    h2.card__title Приклад із цими цінами
    p.muted Шафа-купе 2000 × 2400 мм, фасади МДФ фарбований, преміум-фурнітура, 6 полиць, штанга, 2 ящики, монтаж:
    PriceLines(:estimate="example")

  SaveBar(:dirty="dirty" :saving="saving" :error="error" @reset="reset")
</template>

<script setup lang="ts">
import { BODY_MATERIALS, CASE_TYPES, FACADE_MATERIALS, OPTION_IDS } from '#shared/types'
import { BODY_LABELS, FACADE_LABELS, OPTION_LABELS, TYPE_LABELS } from '#shared/content/services'
import { defaultConfig } from '#shared/limits'
import { estimateItem } from '#shared/pricing'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Тарифи' })

const ROUNDING = [1, 10, 50, 100, 500] as const
const { form, saving, error, dirty, save, reset } = useSettingsForm('prices')

const example = computed(() =>
  estimateItem({ ...defaultConfig('wardrobe'), facade: 'mdf_paint', fittings: 'premium', options: { shelf: 6, rod: 1, drawer: 2 }, install: true }, form.value),
)
</script>

<style lang="scss" scoped>
.settings {
  display: grid;
  gap: $sp-4;

  &__title {
    font-size: $fs-2xl;
    margin-bottom: $sp-1;
  }
}

.card {
  display: grid;
  gap: $sp-4;
  padding: $sp-5;
  border-radius: $r-lg;
  background: $c-surface;
  border: $border solid $c-line;

  &__title {
    font-size: $fs-lg;
  }
}

.grid {
  display: grid;
  gap: $sp-4;

  @include up($bp-sm) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

.preview {
  border-color: $c-accent;
}
</style>
