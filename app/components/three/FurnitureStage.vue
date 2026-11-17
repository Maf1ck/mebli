<template lang="pug">
.fstage(ref="root" :class="`fstage--${status}`")
  .fstage__poster(:class="{ 'is-hidden': status === 'ready' }" aria-hidden="true")
    FurniturePoster(:type="config.type" :front="config.facadeColor" :body="config.bodyColor")
  ClientOnly
    component.fstage__canvas(
      v-if="canvasComponent && status !== 'unsupported'"
      :is="canvasComponent"
      :key="attempt"
      ref="canvas"
      :config="config"
      :grain="grain"
      :line-color="lineColor"
      :ground-color="groundColor"
      :open="open"
      :dims="dims"
      :reduced="reduced"
      @ready="status = 'ready'"
      @error="onCanvasError"
    )
  .fstage__status(v-if="status === 'loading'" role="status")
    span.fstage__spinner(aria-hidden="true")
    | Будуємо 3D-модель…
  .fstage__status.fstage__status--error(v-else-if="status === 'error'" role="alert")
    span Не вдалося показати 3D.
    AppButton(size="sm" variant="secondary" @click="retry") Спробувати ще
  .fstage__status(v-else-if="status === 'unsupported'" role="note")
    | 3D недоступне на цьому пристрої — показуємо схему. Розміри й ціна працюють як завжди.
  .fstage__tools(v-if="status === 'ready'")
    button.fstage__tool(type="button" :aria-pressed="open" @click="open = !open") {{ openLabel }}
    button.fstage__tool(type="button" :aria-pressed="dims" @click="dims = !dims") Розміри
    button.fstage__reset(type="button" aria-label="Скинути ракурс" title="Скинути ракурс" @click="resetView")
      svg(viewBox="0 0 24 24" aria-hidden="true")
        path(d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4")
  p.fstage__hint(v-if="status === 'ready'") {{ reduced ? 'Потягніть, щоб повернути' : 'Потягніть, щоб обертати · колесо або щипок — масштаб' }}
  p.visually-hidden Тривимірна модель: {{ summary }}. Її можна обертати пальцем або мишею; кнопка «{{ openLabel }}» показує наповнення.
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { ItemConfig } from '#shared/types'

const props = defineProps<{ config: ItemConfig; summary: string }>()

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'

const settings = useSettings()
const { resolved } = useTheme()
const reduced = useReducedMotion()

const root = ref<HTMLElement | null>(null)
const canvas = ref<{ resetView: () => void } | null>(null)
const canvasComponent = shallowRef<Component | null>(null)
const status = ref<Status>('idle')
const attempt = ref(0)
const open = ref(false)
const dims = ref(true)
const groundColor = ref('#e5dccd')
const lineColor = ref('#221d18')

const grain = computed(() => settings.value.company.swatches.filter((s) => s.grain).map((s) => s.hex))
const openLabel = computed(() => (open.value ? 'Закрити' : props.config.type === 'walkin' ? 'Висунути ящики' : 'Відкрити'))

function readColors(): void {
  if (!import.meta.client) return
  const css = getComputedStyle(document.documentElement)
  const ground = css.getPropertyValue('--scene-ground').trim()
  const ink = css.getPropertyValue('--c-ink-2').trim()
  if (ground) groundColor.value = ground
  if (ink) lineColor.value = ink
}

watch(resolved, () => nextTick(readColors))

async function load(): Promise<void> {
  status.value = 'loading'
  try {
    const mod = await import('./FurnitureCanvas.vue')
    canvasComponent.value = markRaw(mod.default)
  } catch {
    status.value = 'error'
  }
}

function onCanvasError(): void {
  status.value = 'error'
  canvasComponent.value = null
}

function retry(): void {
  attempt.value += 1
  void load()
}

function resetView(): void {
  canvas.value?.resetView()
}

onMounted(() => {
  readColors()
  if (!hasWebGL()) {
    status.value = 'unsupported'
    return
  }
  void load()
})
</script>

<style lang="scss" scoped>
.fstage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
  border-radius: $r-xl;
  background:
    radial-gradient(110% 80% at 50% 100%, var(--c-accent-soft) 0%, transparent 62%),
    $c-surface;
  border: $border solid $c-line;
  overflow: hidden;
  isolation: isolate;
  touch-action: pan-y;

  &__poster {
    position: absolute;
    inset: 14% 14% 12%;
    transition: opacity $dur-slow $ease-out;

    &.is-hidden {
      opacity: 0;
    }
  }

  &__canvas {
    position: absolute !important;
    inset: 0;
  }

  &__status {
    position: absolute;
    left: $sp-3;
    right: $sp-3;
    bottom: $sp-3;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: $sp-2;
    padding: $sp-2 $sp-3;
    border-radius: $r-md;
    background: color-mix(in srgb, var(--c-surface) 88%, transparent);
    color: $c-ink-2;
    font-size: $fs-sm;
    text-align: center;

    &--error {
      color: $c-ink;
    }
  }

  &__spinner {
    width: 16px;
    height: 16px;
    border: $border-strong solid $c-accent;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  // Narrow screens: controls at the bottom so the top dimension labels stay visible.
  &__tools {
    position: absolute;
    bottom: $sp-3;
    right: $sp-3;
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: $sp-2;

    @include up($bp-md) {
      top: $sp-3;
      bottom: auto;
    }
  }

  &__tool {
    min-height: $tap-sm;
    padding: 0 $sp-4;
    border: $border solid $c-line;
    border-radius: $r-pill;
    background: color-mix(in srgb, var(--c-surface) 92%, transparent);
    color: $c-ink;
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    box-shadow: $shadow-1;
    transition:
      background-color $dur-fast $ease-out,
      border-color $dur-fast $ease-out;

    &:hover {
      border-color: $c-ink-3;
    }

    &[aria-pressed='true'] {
      border-color: $c-accent;
      background: $c-accent;
      color: $c-accent-ink;
    }
  }

  &__reset {
    display: grid;
    place-items: center;
    width: $tap-sm;
    height: $tap-sm;
    border: $border solid $c-line;
    border-radius: 50%;
    background: $c-surface;
    color: $c-ink;
    box-shadow: $shadow-1;

    svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  &__hint {
    position: absolute;
    left: $sp-3;
    bottom: $sp-3;
    z-index: 2;
    display: none;
    padding: $sp-1 $sp-3;
    border-radius: $r-pill;
    background: color-mix(in srgb, var(--c-surface) 82%, transparent);
    color: $c-ink-3;
    font-size: $fs-xs;

    @include up($bp-md) {
      display: block;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
