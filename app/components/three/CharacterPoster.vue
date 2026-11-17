<template lang="pug">
svg.poster(viewBox="0 0 200 200" role="img" :aria-label="`${info.name} — ${info.role}`")
  ellipse(cx="100" cy="182" rx="70" ry="9" class="poster__shadow")
  g(v-if="id === 'drill'")
    rect(x="58" y="150" width="84" height="26" rx="8" fill="#2b2a29")
    rect(x="72" y="82" width="56" height="72" rx="26" fill="#e27a3b")
    rect(x="64" y="44" width="96" height="44" rx="22" fill="#e27a3b")
    rect(x="158" y="54" width="22" height="24" rx="6" fill="#2b2a29")
    rect(x="178" y="63" width="20" height="6" rx="3" fill="#c5cacc")
  g(v-else-if="id === 'tape'")
    circle(cx="96" cy="108" r="64" fill="#f0b43c")
    circle(cx="96" cy="108" r="64" fill="none" stroke="#2b2a29" stroke-width="8")
    rect(x="150" y="168" width="48" height="6" fill="#f6d36b")
    rect(x="142" y="160" width="16" height="14" rx="3" fill="#2b2a29")
    rect(x="82" y="36" width="24" height="12" rx="4" fill="#2b2a29")
  g(v-else-if="id === 'level'")
    rect(x="14" y="92" width="172" height="44" rx="8" fill="#5b8fb9")
    rect(x="14" y="88" width="172" height="8" rx="3" fill="#4a4744")
    rect(x="80" y="78" width="40" height="12" rx="6" fill="#c8f08a")
    rect(x="36" y="136" width="10" height="36" fill="#4a4744")
    rect(x="154" y="136" width="10" height="36" fill="#4a4744")
  g(v-else-if="id === 'hammer'")
    rect(x="74" y="66" width="52" height="112" rx="26" fill="#d2a272")
    rect(x="72" y="150" width="56" height="26" rx="6" fill="#2b2a29")
    rect(x="54" y="30" width="96" height="34" rx="8" fill="#c5cacc")
    rect(x="146" y="34" width="22" height="26" rx="6" fill="#c5cacc")
  g(v-else-if="id === 'pencil'")
    path(d="M64 74h72v104H64z" fill="#c8553d")
    rect(x="64" y="160" width="72" height="10" fill="#f0b43c")
    path(d="M64 74l36-50 36 50z" fill="#d2a272")
    path(d="M92 36l8-12 8 12z" fill="#2b2a29")
  g(v-else)
    rect(x="36" y="86" width="128" height="86" rx="12" fill="#c8553d")
    rect(x="32" y="74" width="136" height="22" rx="8" fill="#9c3b29")
    path(d="M78 74a22 22 0 0 1 44 0" stroke="#2b2a29" stroke-width="8" fill="none")
    rect(x="132" y="40" width="8" height="40" rx="3" fill="#c5cacc" transform="rotate(35 136 60)")
  g(v-if="faces" :transform="faceTransform")
    ellipse(cx="-12" cy="0" rx="5" ry="6.5" fill="#1f1b18")
    ellipse(cx="12" cy="0" rx="5" ry="6.5" fill="#1f1b18")
    circle(cx="-10.5" cy="-2" r="1.6" fill="#fff")
    circle(cx="13.5" cy="-2" r="1.6" fill="#fff")
    circle(cx="-22" cy="10" r="5" fill="#f09a83" opacity="0.55")
    circle(cx="22" cy="10" r="5" fill="#f09a83" opacity="0.55")
    path(d="M-7 9q7 7 14 0" stroke="#1f1b18" stroke-width="2.6" fill="none" stroke-linecap="round")
</template>

<script setup lang="ts">
import type { CharacterId } from '#shared/content/services'
import { CHARACTERS } from '#shared/content/characters'

const props = withDefaults(defineProps<{ id: CharacterId; faces?: boolean }>(), { faces: true })

const info = computed(() => CHARACTERS[props.id])

const FACE_POS: Record<CharacterId, [number, number]> = {
  drill: [100, 112],
  tape: [92, 110],
  level: [112, 112],
  hammer: [100, 104],
  pencil: [100, 118],
  toolbox: [100, 130],
}

const faceTransform = computed(() => {
  const [x, y] = FACE_POS[props.id]
  return `translate(${x} ${y})`
})
</script>

<style lang="scss" scoped>
.poster {
  width: 100%;
  height: 100%;

  &__shadow {
    fill: $c-ink;
    opacity: 0.08;
  }
}
</style>
