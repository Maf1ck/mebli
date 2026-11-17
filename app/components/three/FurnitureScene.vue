<template lang="pug">
primitive(:object="world")
</template>

<script setup lang="ts">
import { useLoop, useTres } from '@tresjs/core'
import { CircleGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, PMREMGenerator, ShadowMaterial, Vector3 } from 'three'
import type { Material, PerspectiveCamera, WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { ItemConfig } from '#shared/types'
import { buildFurniture, disposeMaterialCache, disposeModel } from '~/three/furniture'
import type { FurnitureModel } from '~/three/furniture'

const props = defineProps<{
  config: ItemConfig
  grain: string[]
  lineColor: string
  groundColor: string
  open: boolean
  dims: boolean
  reduced: boolean
}>()

interface ControlsLike {
  target: Vector3
  update: () => void
}

const { camera, controls, invalidate, renderer, scene } = useTres()
const { onBeforeRender } = useLoop()

// --- World: light rig, floor and shadow catcher
const world = new Group()
world.name = 'configurator'
world.add(new HemisphereLight('#ffffff', '#b8ab98', 1.05))
const sun = new DirectionalLight('#ffffff', 2.2)
sun.position.set(3, 6, 5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.02
world.add(sun)
world.add(sun.target)

const floorMat = new MeshStandardMaterial({ color: new Color(props.groundColor), roughness: 0.95 })
const floor = new Mesh(new CircleGeometry(6, 64), floorMat)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.002
floor.receiveShadow = true
world.add(floor)
const catcher = new Mesh(new CircleGeometry(6, 48), new ShadowMaterial({ opacity: 0.2 }))
catcher.rotation.x = -Math.PI / 2
catcher.receiveShadow = true
world.add(catcher)

if (!scene.value.environment) {
  const pmrem = new PMREMGenerator(renderer as WebGLRenderer)
  scene.value.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.value.environmentIntensity = 0.5
  pmrem.dispose()
}

// --- Model lifecycle
interface Leaving {
  model: FurnitureModel
  t: number
}
let model: FurnitureModel | null = null
let leaving: Leaving[] = []
let appear = 1
let appearV = 0
let openT = props.open ? 1 : 0
let lastType: ItemConfig['type'] | null = null

const VIEW_DIR = new Vector3(0.42, 0.28, 1).normalize()
const goalTarget = new Vector3(0, 1, 0)
let goalDist = 5
let framing = 0 // seconds of camera easing left

function cam(): PerspectiveCamera | null {
  return (camera.value as PerspectiveCamera | undefined) ?? null
}

function ctrl(): ControlsLike | null {
  return (controls.value as unknown as ControlsLike | null) ?? null
}

function frame(resetDirection: boolean): void {
  const c = cam()
  if (!model || !c) return
  const s = model.size
  const fov = (c.fov * Math.PI) / 180
  const aspect = c.aspect || 1
  // Leave room for the dimension labels and the overlay buttons at the top of the stage.
  const fitH = (s.y * 1.6) / 2 / Math.tan(fov / 2)
  const fitW = (Math.max(s.x, s.z * 0.8) * 1.45 + 0.5) / 2 / Math.tan(fov / 2) / Math.min(aspect, 1.6)
  goalDist = Math.max(fitH, fitW) + s.z * 0.6
  goalTarget.copy(model.center)
  goalTarget.y += s.y * 0.06
  if (resetDirection) {
    const t = ctrl()
    if (t) t.target.copy(goalTarget)
    c.position.copy(goalTarget).addScaledVector(VIEW_DIR, goalDist)
  }
  framing = props.reduced || resetDirection ? 0.0001 : 0.7
  // Shadow camera follows the model size.
  const r = Math.max(s.x, s.z, s.y) * 0.9 + 0.6
  const sc = sun.shadow.camera
  sc.left = -r
  sc.right = r
  sc.top = r
  sc.bottom = -r
  sc.near = 0.5
  sc.far = 20
  sun.position.copy(model.center).add(new Vector3(3, 6, 5))
  sun.target.position.copy(model.center)
  sc.updateProjectionMatrix()
  invalidate()
}

function applyOpen(m: FurnitureModel, t: number): void {
  for (const mv of m.movables) {
    if (mv.kind === 'hinge') mv.obj.rotation.y = mv.amount * t
    else if (mv.kind === 'drawer') mv.obj.position.z = mv.base + mv.amount * t
    else {
      mv.obj.position.x = mv.base + mv.amount * t
      if (mv.fade && mv.obj instanceof Mesh) mv.obj.material = t > 0.5 ? mv.fade[1]! : mv.fade[0]!
    }
  }
}

function rebuild(): void {
  const next = buildFurniture(props.config, new Set(props.grain), props.lineColor)
  const typeChanged = lastType !== null && lastType !== props.config.type
  const first = lastType === null
  lastType = props.config.type
  if (model) {
    if (typeChanged && !props.reduced) leaving.push({ model, t: 0 })
    else {
      world.remove(model.group)
      disposeModel(model)
    }
  }
  model = next
  if (model) {
    model.group.traverse((o) => {
      if (o.name === 'dimensions') o.visible = props.dims
    })
    applyOpen(model, openT)
    world.add(model.group)
    if (typeChanged && !props.reduced) {
      appear = 0.001
      appearV = 0
    }
    model.group.scale.setScalar(Math.max(0.001, appear))
    frame(first || typeChanged)
  }
  invalidate()
}

// Rebuilding is cheap; coalesce bursts of changes (typing in a stepper) into one frame.
let pending = 0
watch(
  () => [props.config, props.grain, props.lineColor] as const,
  () => {
    if (pending) cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => {
      pending = 0
      rebuild()
    })
  },
  { deep: true },
)

watch(
  () => props.dims,
  (v) => {
    model?.group.traverse((o) => {
      if (o.name === 'dimensions') o.visible = v
    })
    invalidate()
  },
)

watch(
  () => props.groundColor,
  (c) => {
    floorMat.color.set(c)
    invalidate()
  },
)

watch(
  () => props.open,
  () => invalidate(),
)

onMounted(() => {
  rebuild()
})

function reset(): void {
  frame(true)
}

function cancelFraming(): void {
  framing = 0
}

defineExpose({ reset, cancelFraming })

const tmp = new Vector3()

onBeforeRender(({ delta }) => {
  const dt = Math.min(delta, 1 / 20)
  let busy = false

  // Doors and drawers
  const goal = props.open ? 1 : 0
  if (openT !== goal) {
    openT = props.reduced ? goal : openT + (goal - openT) * Math.min(1, dt * 7)
    if (Math.abs(goal - openT) < 0.002) openT = goal
    if (model) applyOpen(model, openT)
    busy = true
  }

  // New model springs in; old ones shrink away and are disposed.
  if (model && appear < 1) {
    appearV += (160 * (1 - appear) - 18 * appearV) * dt
    appear += appearV * dt
    if (appear > 0.999 && Math.abs(appearV) < 0.02) appear = 1
    model.group.scale.setScalar(Math.max(0.001, appear))
    model.group.position.y = (1 - Math.min(1, appear)) * -0.2
    busy = true
  }
  if (leaving.length) {
    for (const l of leaving) {
      l.t += dt / 0.22
      const k = Math.max(0.001, 1 - l.t)
      l.model.group.scale.setScalar(k)
    }
    const done = leaving.filter((l) => l.t >= 1)
    for (const l of done) {
      world.remove(l.model.group)
      disposeModel(l.model)
    }
    leaving = leaving.filter((l) => l.t < 1)
    busy = true
  }

  // Camera easing toward the framed view, keeping the visitor's viewing direction.
  const c = cam()
  const t = ctrl()
  if (framing > 0 && c && t) {
    const k = Math.min(1, dt * 6)
    t.target.lerp(goalTarget, k)
    tmp.copy(c.position).sub(t.target)
    const dist = tmp.length()
    tmp.normalize().multiplyScalar(dist + (goalDist - dist) * k)
    c.position.copy(t.target).add(tmp)
    t.update()
    framing -= dt
    busy = true
  }

  if (busy) invalidate()
})

onBeforeUnmount(() => {
  if (pending) cancelAnimationFrame(pending)
  if (model) disposeModel(model)
  for (const l of leaving) disposeModel(l.model)
  world.traverse((obj) => {
    if (obj instanceof Mesh && (obj === floor || obj === catcher)) {
      obj.geometry.dispose()
      ;(obj.material as Material).dispose()
    }
  })
  disposeMaterialCache()
  scene.value.environment?.dispose()
  scene.value.environment = null
})
</script>
