<template lang="pug">
svg.fposter(viewBox="0 0 240 200" role="img" :aria-label="`Схема: ${title}`")
  ellipse.fposter__shadow(cx="120" cy="186" rx="96" ry="8")
  g(v-if="type === 'kitchen'")
    rect(x="20" y="40" width="200" height="50" rx="3" :fill="front")
    rect(x="16" y="112" width="208" height="8" rx="2" :fill="body")
    rect(x="20" y="120" width="200" height="62" rx="3" :fill="front")
    path(d="M70 40v50M120 40v50M170 40v50M70 120v62M120 120v62M170 120v62" class="fposter__seam")
  g(v-else-if="type === 'wardrobe'")
    rect(x="40" y="14" width="160" height="170" rx="3" :fill="body")
    rect(x="44" y="22" width="78" height="156" rx="2" :fill="front")
    rect(x="118" y="22" width="78" height="156" rx="2" :fill="front" opacity="0.92")
    path(d="M44 22h152" class="fposter__seam")
  g(v-else-if="type === 'walkin'")
    rect(x="20" y="18" width="200" height="166" rx="2" :fill="body" opacity="0.5")
    path(d="M22 18v166M86 18v166M152 18v166M218 18v166" class="fposter__post")
    path(d="M30 40h50M96 40h50M162 40h50M30 70h50M162 100h50M96 150h50M30 160h50" class="fposter__shelf")
  g(v-else-if="type === 'hallway'")
    rect(x="36" y="20" width="168" height="164" rx="3" :fill="body")
    path(d="M44 44h48" class="fposter__shelf")
    rect(x="100" y="26" width="48" height="152" rx="2" :fill="front")
    rect(x="150" y="26" width="48" height="152" rx="2" class="fposter__mirror")
  g(v-else-if="type === 'cabinet'")
    rect(x="30" y="96" width="180" height="84" rx="3" :fill="body")
    rect(x="36" y="102" width="54" height="72" rx="2" :fill="front")
    rect(x="93" y="102" width="54" height="72" rx="2" :fill="front")
    rect(x="150" y="102" width="54" height="22" rx="2" :fill="front")
    rect(x="150" y="127" width="54" height="22" rx="2" :fill="front")
    rect(x="150" y="152" width="54" height="22" rx="2" :fill="front")
  g(v-else)
    rect(x="60" y="80" width="120" height="96" rx="10" :fill="front")
    path(d="M96 80v-18a24 12 0 0 1 48 0v18" class="fposter__seam")
</template>

<script setup lang="ts">
import type { FurnitureType } from '#shared/types'
import { TYPE_LABELS } from '#shared/content/services'

const props = defineProps<{ type: FurnitureType; front: string; body: string }>()
const title = computed(() => TYPE_LABELS[props.type])
</script>

<style lang="scss" scoped>
.fposter {
  width: 100%;
  height: 100%;

  &__shadow {
    fill: $c-ink;
    opacity: 0.08;
  }

  &__seam,
  &__post,
  &__shelf {
    fill: none;
    stroke: $c-ink;
    stroke-opacity: 0.35;
    stroke-width: 2;
    stroke-linecap: round;
  }

  &__post {
    stroke-width: 4;
  }

  &__mirror {
    fill: $c-surface-2;
    stroke: $c-line;
  }
}
</style>
