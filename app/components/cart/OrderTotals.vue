<template lang="pug">
.totals
  .totals__row(v-if="estimate.hasKnown")
    span Меблі з відомою ціною
    span {{ formatUah(estimate.knownSum) }}
  .totals__row(v-if="estimate.minimumTopUp > 0")
    span Доплата до мінімального замовлення ({{ formatUah(minOrder) }})
    span +{{ formatUah(estimate.minimumTopUp) }}
  .totals__row(v-if="estimate.serviceTotal > 0")
    span Монтаж і демонтаж
    span +{{ formatUah(estimate.serviceTotal) }}
  .totals__row
    span Виїзд на замір
    span {{ estimate.measureFee > 0 ? `+${formatUah(estimate.measureFee)}` : 'безкоштовно' }}
  .totals__row(v-if="estimate.deliveryFee > 0")
    span Доставка по місту
    span +{{ formatUah(estimate.deliveryFee) }}
  .totals__row(v-if="estimate.outOfCityFee > 0")
    span Доплата за місто
    span +{{ formatUah(estimate.outOfCityFee) }}
  .totals__row(v-if="estimate.liftFee > 0")
    span Підйом без ліфта
    span +{{ formatUah(estimate.liftFee) }}
  .totals__row.totals__row--manual(v-if="estimate.manualCount > 0")
    span Позиції з ручною оцінкою
    span {{ estimate.manualCount }} — після фото й заміру
  .totals__sum
    span {{ estimate.manualCount > 0 ? 'Відома сума' : 'Орієнтовно разом' }}
    strong {{ formatUah(estimate.total) }}
  p.totals__fine(v-if="estimate.manualCount > 0") + вартість позицій «Інше» після оцінки. Вони не безкоштовні: ціна просто ще невідома.
  p.totals__fine Орієнтовна вартість. Остаточну ціну й строк називаємо після заміру.
</template>

<script setup lang="ts">
import type { OrderEstimate } from '#shared/types'
import { formatUah } from '#shared/pricing'

defineProps<{ estimate: OrderEstimate; minOrder: number }>()
</script>

<style lang="scss" scoped>
.totals {
  display: grid;
  gap: $sp-2;

  &__row {
    display: flex;
    justify-content: space-between;
    gap: $sp-3;
    font-size: $fs-sm;
    color: $c-ink-2;

    span:last-child {
      flex: none;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    &--manual {
      color: $c-ink;
      font-weight: $fw-semibold;
    }
  }

  &__sum {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: $sp-3;
    padding-top: $sp-3;
    border-top: $border solid $c-line;

    strong {
      font-family: $font-display;
      font-size: $fs-2xl;
      font-weight: $fw-semibold;
    }
  }

  &__fine {
    font-size: $fs-xs;
    color: $c-ink-3;
  }
}
</style>
