<template lang="pug">
.calc.container
  header.calc__head
    p.eyebrow {{ editing ? 'Редагування позиції' : '3D-конфігуратор' }}
    h1.calc__title {{ editing ? 'Змініть параметри' : 'Зберіть меблі й побачте ціну' }}
  .calc__layout
    aside.calc__visual
      .calc__stage
        FurnitureStage(v-if="config.type !== 'other'" :config="config" :summary="summaryText")
        CharacterStage(v-else active="toolbox" compact)
      p.calc__note(v-if="config.type !== 'other'")
        strong Візуалізація орієнтовна, остаточний проєкт — після заміру.
        |  Розміри, секції, двері, ящики, полиці, кольори й підсвітка перебудовують модель одразу;
        |  внутрішнє наповнення показане схематично, а вирізи й кути кухні — спрощено.
      p.calc__note(v-else) {{ CHARACTERS.toolbox.name }} допоможе з нестандартною задачею: опишіть її, а фото чи ескіз додасте на кроці оформлення.
      .guide(v-if="characters.phrases && config.type !== 'other'")
        .guide__face
          CharacterPoster(:id="character" :faces="characters.faces")
        p.guide__text
          strong {{ CHARACTERS[character].name }}
          span {{ guideLine }}

    form.calc__form(@submit.prevent="submit" novalidate)
      section.block
        h2.block__title 1. Що робимо
        ServiceTypePicker(v-model="config.type")

      section.block(v-if="caseLimits")
        h2.block__title 2. Розміри
        .block__grid
          NumberStepper(v-model="config.width" :min="caseLimits.width.min" :max="caseLimits.width.max" :step="caseLimits.width.step" :label="config.type === 'walkin' ? 'Довжина системи' : 'Ширина'" unit="мм")
          NumberStepper(v-model="config.height" :min="caseLimits.height.min" :max="caseLimits.height.max" :step="caseLimits.height.step" label="Висота" unit="мм")
          NumberStepper(v-model="config.depth" :min="caseLimits.depth.min" :max="caseLimits.depth.max" :step="caseLimits.depth.step" label="Глибина" unit="мм" hint="впливає на проєкт, не на тариф")
          NumberStepper(v-model="config.sections" :min="caseLimits.sections.min" :max="caseLimits.sections.max" label="Секцій" hint="вертикальних відділень")
          NumberStepper(v-if="config.type === 'wardrobe'" v-model="config.doors" :min="LIMITS.doors.min" :max="LIMITS.doors.max" label="Дверей-купе" hint="на ціну не впливає: рахуємо площу фасаду")
        p.block__fine Площа фасаду: {{ area.toLocaleString('uk-UA') }} м² — від неї рахується база.

      section.block(v-else-if="config.type === 'kitchen'")
        h2.block__title 2. Розміри кухні
        SegmentedControl(v-model="config.layout" legend="Форма" :options="layoutOptions")
        .block__grid
          NumberStepper(v-model="config.lowerLength" :min="LIMITS.lower.min" :max="LIMITS.lower.max" :step="LIMITS.lower.step" label="Нижні модулі" unit="мм" hint="загальна довжина вздовж стін")
          NumberStepper(v-model="config.upperLength" :min="LIMITS.upper.min" :max="LIMITS.upper.max" :step="LIMITS.upper.step" label="Верхні модулі" unit="мм" hint="0 — без верхніх")
        ToggleSwitch(v-model="config.island" label="Острів" :hint="`+${formatUah(prices.kitchen.island)}`")

      section.block(v-else)
        h2.block__title 2. Опишіть задачу
        label.field
          span.field__label Що потрібно зробити
          textarea.field__input(
            v-model="config.description"
            rows="4"
            :maxlength="LIMITS.description.max"
            placeholder="Наприклад: шафа в мансардну нішу зі скосом, ширина близько 1,6 м, висота від 0,9 до 2,2 м"
            :aria-invalid="Boolean(descriptionError)"
            aria-describedby="desc-hint"
          )
          span#desc-hint.field__hint(:class="{ 'is-error': descriptionError }") {{ descriptionError || 'Фото або ескіз додасте на кроці оформлення — щонайменше одне.' }}

      template(v-if="config.type !== 'other'")
        section.block
          h2.block__title 3. Матеріали й колір
          SegmentedControl(v-model="config.facade" legend="Фасади" :options="facadeOptions")
          SwatchPicker(v-model="config.facadeColor" legend="Колір фасадів" :swatches="swatches")
          SegmentedControl(v-model="config.body" legend="Корпус" :options="bodyOptions")
          SwatchPicker(v-model="config.bodyColor" legend="Колір корпусу" :swatches="swatches")
          SegmentedControl(v-model="config.fittings" legend="Фурнітура" :options="fittingsOptions")

        section.block
          h2.block__title 4. Наповнення й опції
          OptionsPicker(v-model="config.options" :ids="optionIds")

        section.block
          h2.block__title 5. Монтаж і особливості
          ToggleSwitch(v-model="config.install" label="Монтаж" :hint="`+${prices.installPct}% від ціни меблів`")
          ToggleSwitch(v-model="config.dismantle" label="Демонтаж старих меблів" :hint="`+${formatUah(prices.dismantle)}`")
          ToggleSwitch(v-model="config.complex" label="Складна форма" :hint="`+${prices.complexityPct}% — скоси, кути, криволінійні елементи`")

      section.block.block--summary(aria-live="polite")
        h2.block__title Орієнтовна вартість
        PriceLines(:estimate="estimate")
        p.block__fine
          | Мінімальне замовлення меблів — {{ formatUah(prices.minOrder) }}. Доставку й підйом порахуємо в кошику.
          | Остаточну ціну називаємо після заміру.
        .block__actions
          AppButton(type="submit" size="lg" block) {{ editing ? 'Зберегти зміни' : 'Додати в кошик' }}
          AppButton(v-if="editing" to="/cart" variant="ghost" block) Скасувати

  Transition(name="added")
    .added(v-if="added" role="status")
      p.added__text
        strong {{ added.merged ? 'Така позиція вже є — збільшили кількість.' : 'Додано в кошик.' }}
        |  Можна додати ще виріб, наприклад шафу до кухні.
      .added__actions
        AppButton(to="/cart") До кошика ({{ cart.count }})
        AppButton(variant="secondary" @click="addAnother") Додати ще виріб

  .calc__bar(v-if="!added")
    .calc__bar-price
      span.calc__bar-label Орієнтовно
      strong {{ estimate.manual ? 'після фото' : formatUah((estimate.unit ?? 0) + estimate.service) }}
    AppButton(@click="submit") {{ editing ? 'Зберегти' : 'У кошик' }}
</template>

<script setup lang="ts">
import { BODY_MATERIALS, FACADE_MATERIALS, FITTINGS, FURNITURE_TYPES, KITCHEN_LAYOUTS } from '#shared/types'
import type { FurnitureType, ItemConfig } from '#shared/types'
import { BODY_LABELS, FACADE_LABELS, FITTINGS_LABELS, LAYOUT_LABELS, SERVICE_BY_TYPE } from '#shared/content/services'
import { CHARACTERS } from '#shared/content/characters'
import { LIMITS, SIZE_LIMITS, defaultConfig } from '#shared/limits'
import { allowedOptions, estimateItem, formatUah, frontArea, isCaseType } from '#shared/pricing'

const route = useRoute()
const router = useRouter()
const settings = useSettings()
const prices = computed(() => settings.value.prices)
const characters = computed(() => settings.value.characters)
const swatches = computed(() => settings.value.company.swatches)
const cart = useCartStore()
const { show } = useToast()
const colorName = useColorName()

function typeFromQuery(): FurnitureType {
  const t = String(route.query.type ?? '')
  return (FURNITURE_TYPES as readonly string[]).includes(t) ? (t as FurnitureType) : 'wardrobe'
}

const editId = computed(() => (typeof route.query.edit === 'string' ? route.query.edit : ''))
const editing = computed(() => Boolean(editId.value && cart.byId(editId.value)))
const config = reactive<ItemConfig>(defaultConfig(typeFromQuery()))
const added = ref<{ merged: boolean } | null>(null)
const descriptionError = ref('')
let loadingEdit = false

function loadEditItem(): void {
  const item = editId.value ? cart.byId(editId.value) : undefined
  if (!item) return
  loadingEdit = true
  Object.assign(config, structuredClone(toRaw(item.config)), { options: { ...item.config.options } })
  void nextTick(() => {
    loadingEdit = false
  })
}

// The cart is restored after hydration; load the edited line once it is available.
watch(
  () => cart.ready,
  (ready) => {
    if (ready) loadEditItem()
  },
  { immediate: true },
)

watch(
  () => route.query.type,
  () => {
    if (!editing.value && route.query.type && route.query.type !== config.type) config.type = typeFromQuery()
  },
)

// A new type starts from its own sensible defaults (sizes, options); colours carry over.
watch(
  () => config.type,
  (type, prev) => {
    descriptionError.value = ''
    if (!loadingEdit && prev && type !== prev) {
      const keep = { facadeColor: config.facadeColor, bodyColor: config.bodyColor }
      Object.assign(config, defaultConfig(type), type === 'kitchen' ? {} : keep)
    }
    if (!editing.value && route.query.type !== type) void router.replace({ query: { ...route.query, type } })
  },
)

watch(
  () => config.description,
  () => {
    if (descriptionError.value && config.description.trim().length >= 5) descriptionError.value = ''
  },
)

// Picked colours must exist in the workshop palette.
watch(
  swatches,
  (list) => {
    const hexes = list.map((s) => s.hex)
    if (hexes.length && !hexes.includes(config.facadeColor)) config.facadeColor = list.find((s) => s.grain)?.hex ?? hexes[0]!
    if (hexes.length && !hexes.includes(config.bodyColor)) config.bodyColor = hexes[0]!
  },
  { immediate: true },
)

const caseLimits = computed(() => (isCaseType(config.type) ? SIZE_LIMITS[config.type] : null))
const area = computed(() => frontArea(config))
const character = computed(() => SERVICE_BY_TYPE[config.type].character)
const guideLine = computed(() => CHARACTERS[character.value].lines[characters.value.personality][0] ?? '')
const optionIds = computed(() => allowedOptions(config.type))
const estimate = computed(() => estimateItem(config, prices.value))
const summaryText = computed(() => {
  const d = describeItem(config, colorName)
  return [d.title, ...d.params, ...d.options].join(', ')
})

const layoutOptions = KITCHEN_LAYOUTS.map((value) => ({ value, label: LAYOUT_LABELS[value] }))
const facadeOptions = computed(() =>
  FACADE_MATERIALS.map((value) => ({ value, label: FACADE_LABELS[value], badge: prices.value.facadePct[value] > 0 ? `+${prices.value.facadePct[value]}%` : undefined })),
)
const bodyOptions = computed(() =>
  BODY_MATERIALS.map((value) => ({ value, label: BODY_LABELS[value], badge: prices.value.bodyPct[value] > 0 ? `+${prices.value.bodyPct[value]}%` : undefined })),
)
const fittingsOptions = computed(() =>
  FITTINGS.map((value) => ({ value, label: FITTINGS_LABELS[value], badge: value === 'premium' && prices.value.premiumFittingsPct > 0 ? `+${prices.value.premiumFittingsPct}%` : undefined })),
)

function submit(): void {
  if (config.type === 'other' && config.description.trim().length < 5) {
    descriptionError.value = 'Опишіть задачу хоча б кількома словами'
    return
  }
  const snapshot: ItemConfig = structuredClone(toRaw(config))
  if (editing.value) {
    const res = cart.update(editId.value, snapshot)
    show(res.merged ? 'Позиції однакові — обʼєднали в одну' : 'Зміни збережено', { tone: 'success' })
    void router.push('/cart')
    return
  }
  const res = cart.add(snapshot)
  added.value = { merged: res.merged }
}

function addAnother(): void {
  added.value = null
  config.type = config.type === 'kitchen' ? 'wardrobe' : 'kitchen'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

usePageSeo({
  title: '3D-конфігуратор меблів і розрахунок вартості',
  description: 'Оберіть кухню, шафу-купе, гардеробну чи комод, задайте розміри, матеріали й наповнення — 3D-модель і орієнтовна ціна оновлюються одразу.',
  path: '/calculator',
})
</script>

<style lang="scss" scoped>
.calc {
  padding-top: $sp-5;
  padding-bottom: 120px;

  @include up($bp-lg) {
    padding-bottom: $sp-6;
  }

  &__head {
    display: grid;
    gap: $sp-2;
    margin-bottom: $sp-5;
  }

  &__title {
    font-size: $fs-3xl;
  }

  &__layout {
    display: grid;
    gap: $sp-5;

    @include up($bp-lg) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
      align-items: start;
      gap: $sp-6;
    }
  }

  &__visual {
    display: grid;
    gap: $sp-3;

    @include up($bp-lg) {
      position: sticky;
      top: calc(#{$header-h} + #{$sp-4});
    }
  }

  &__stage {
    height: clamp(320px, 78vw, 520px);
  }

  &__note {
    font-size: $fs-sm;
    color: $c-ink-3;
  }

  &__form {
    display: grid;
    gap: $sp-4;
  }

  &__bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: $z-sticky;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-3;
    padding: $sp-3 $sp-4 calc(#{$sp-3} + env(safe-area-inset-bottom));
    background: $c-surface;
    border-top: $border solid $c-line;
    box-shadow: $shadow-2;

    @include up($bp-lg) {
      display: none;
    }
  }

  &__bar-price {
    display: grid;

    strong {
      font-family: $font-display;
      font-size: $fs-xl;
      font-weight: $fw-semibold;
    }
  }

  &__bar-label {
    font-size: $fs-xs;
    color: $c-ink-3;
  }
}

.block {
  display: grid;
  gap: $sp-4;
  padding: $sp-5;
  border-radius: $r-lg;
  background: $c-surface;
  border: $border solid $c-line;

  &__title {
    font-size: $fs-lg;
  }

  &__grid {
    display: grid;
    gap: $sp-4;

    @include up($bp-sm) {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
  }

  &__fine {
    font-size: $fs-xs;
    color: $c-ink-3;
  }

  &__actions {
    display: grid;
    gap: $sp-2;
  }

  &--summary {
    border-color: $c-accent;
  }
}

.guide {
  display: flex;
  align-items: center;
  gap: $sp-3;
  padding: $sp-3 $sp-4;
  border-radius: $r-lg;
  background: $c-surface;
  border: $border solid $c-line;

  &__face {
    flex: none;
    width: 56px;
    height: 56px;
  }

  &__text {
    display: grid;
    gap: 2px;
    font-size: $fs-sm;
    color: $c-ink-2;

    strong {
      color: $c-accent;
      font-size: $fs-xs;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  }
}

.field__hint.is-error {
  color: $c-danger;
}

.added {
  position: fixed;
  left: 50%;
  bottom: calc(#{$sp-4} + env(safe-area-inset-bottom));
  z-index: $z-toast;
  display: grid;
  gap: $sp-3;
  width: min(520px, calc(100vw - #{$sp-6}));
  padding: $sp-4 $sp-5;
  border-radius: $r-lg;
  background: $c-surface;
  border: $border-strong solid $c-accent;
  box-shadow: $shadow-2;
  transform: translateX(-50%);

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
  }
}

.added-enter-active,
.added-leave-active {
  transition:
    opacity $dur-base $ease-out,
    transform $dur-base $ease-out;
}

.added-enter-from,
.added-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
