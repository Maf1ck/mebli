<template lang="pug">
TresCanvas(
  alpha
  :clear-alpha="0"
  clear-color="#000000"
  shadows
  :dpr="[1, 1.75]"
  render-mode="on-demand"
  @ready="emit('ready')"
  @error="onError"
)
  TresPerspectiveCamera(:position="[2, 1.8, 5]" :fov="35" :near="0.05" :far="60")
  OrbitControls(
    make-default
    :target="[0, 1, 0]"
    :enable-pan="false"
    :enable-damping="!reduced"
    :damping-factor="0.08"
    :min-distance="1.2"
    :max-distance="14"
    :min-polar-angle="0.25"
    :max-polar-angle="1.5"
    :rotate-speed="0.8"
    @start="onStart"
    @end="emit('drag', false)"
  )
  FurnitureScene(
    ref="sceneRef"
    :config="config"
    :grain="grain"
    :line-color="lineColor"
    :ground-color="groundColor"
    :open="open"
    :dims="dims"
    :reduced="reduced"
  )
</template>

<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import type { ItemConfig } from '#shared/types'
import FurnitureScene from './FurnitureScene.vue'

defineProps<{
  config: ItemConfig
  grain: string[]
  lineColor: string
  groundColor: string
  open: boolean
  dims: boolean
  reduced: boolean
}>()

const emit = defineEmits<{ ready: []; error: [message: string]; drag: [active: boolean] }>()

const sceneRef = ref<{ reset: () => void; cancelFraming: () => void } | null>(null)

function onError(error: Error): void {
  emit('error', error.message)
}

function onStart(): void {
  sceneRef.value?.cancelFraming()
  emit('drag', true)
}

function resetView(): void {
  sceneRef.value?.reset()
}

defineExpose({ resetView })
</script>
