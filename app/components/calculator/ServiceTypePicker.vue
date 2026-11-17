<template lang="pug">
fieldset.picker
  legend.picker__legend Тип меблів
  .picker__grid
    label.picker__card(v-for="s in SERVICES" :key="s.type" :class="{ 'is-active': s.type === modelValue }")
      input.picker__input(type="radio" :name="name" :value="s.type" :checked="s.type === modelValue" @change="emit('update:modelValue', s.type)")
      span.picker__title {{ s.title }}
      span.picker__rate {{ rateLabel(s.type, prices) }}
      span.picker__lead {{ s.lead }}
  .picker__details(v-if="active" aria-live="polite")
    p.picker__row
      b Входить:
      |  {{ active.includes.join(', ') }}.
    p.picker__row.picker__row--no
      b Не входить:
      |  {{ active.excludes.join(', ') }}.
    p.picker__row.picker__row--no(v-if="lead") Виготовлення — від {{ lead }} роб. днів після погодження проєкту.
</template>

<script setup lang="ts">
import type { FurnitureType } from '#shared/types'
import { SERVICES } from '#shared/content/services'
import { rateLabel } from '#shared/pricing'

const props = defineProps<{ modelValue: FurnitureType }>()
const emit = defineEmits<{ 'update:modelValue': [value: FurnitureType] }>()
const name = useId()
const settings = useSettings()
const prices = computed(() => settings.value.prices)
const active = computed(() => SERVICES.find((x) => x.type === props.modelValue))
const lead = computed(() => (props.modelValue === 'other' ? 0 : settings.value.company.leadDays[props.modelValue]))
</script>

<style lang="scss" scoped>
.picker {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;

  &__legend {
    @include visually-hidden;
  }

  &__grid {
    display: grid;
    gap: $sp-2;

    @include up($bp-sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__card {
    position: relative;
    display: grid;
    gap: $sp-1;
    padding: $sp-3 $sp-4;
    border: $border-strong solid $c-line;
    border-radius: $r-md;
    background: $c-surface;
    cursor: pointer;
    transition:
      border-color $dur-fast $ease-out,
      background-color $dur-fast $ease-out;

    &:hover {
      border-color: $c-ink-3;
    }

    &.is-active {
      border-color: $c-accent;
      background: $c-accent-soft;
    }

    &:has(:focus-visible) {
      @include focus-ring;
    }
  }

  &__input {
    @include visually-hidden;
  }


  &__title {
    font-weight: $fw-bold;
    font-size: $fs-lg;
  }

  &__rate {
    font-weight: $fw-semibold;
    font-size: $fs-sm;
    color: $c-accent;
  }

  &__lead {
    font-size: $fs-sm;
    color: $c-ink-2;
  }

  &__details {
    display: grid;
    gap: $sp-1;
    margin-top: $sp-3;
    padding: $sp-3 $sp-4;
    border-radius: $r-md;
    background: $c-surface-2;
    font-size: $fs-sm;
  }

  &__row--no {
    color: $c-ink-2;
  }
}
</style>
