<template lang="pug">
fieldset.swatches
  legend.swatches__legend {{ legend }}
  .swatches__list
    label.swatches__item(v-for="sw in swatches" :key="sw.hex" :class="{ 'is-active': sw.hex === modelValue }" :title="sw.name")
      input.swatches__input(type="radio" :name="name" :value="sw.hex" :checked="sw.hex === modelValue" @change="emit('update:modelValue', sw.hex)")
      span.swatches__chip(:style="{ background: sw.hex }" :class="{ 'is-grain': sw.grain }" aria-hidden="true")
      span.swatches__name {{ sw.name }}
</template>

<script setup lang="ts">
import type { Swatch } from '#shared/types'

defineProps<{ modelValue: string; legend: string; swatches: Swatch[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const name = useId()
</script>

<style lang="scss" scoped>
.swatches {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;

  &__legend {
    margin-bottom: $sp-2;
    padding: 0;
    font-weight: $fw-semibold;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: $sp-2;
    min-height: $tap;
    padding: 0 $sp-3 0 $sp-1;
    border: $border-strong solid $c-line;
    border-radius: $r-pill;
    background: $c-surface;
    font-size: $fs-sm;
    font-weight: $fw-medium;
    cursor: pointer;
    transition: border-color $dur-fast $ease-out;

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

  &__chip {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: $border solid $c-line;

    &.is-grain {
      background-image: repeating-linear-gradient(100deg, rgb(0 0 0 / 0.08) 0 2px, transparent 2px 7px) !important;
      background-blend-mode: multiply;
    }
  }
}
</style>
