<template lang="pug">
primitive(:object="group")
</template>

<script setup lang="ts">
import { useTres } from '@tresjs/core'
import {
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Vector2,
} from 'three'
import type { Material, WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const props = defineProps<{
  mode: 'sand' | 'rotate'
  onProgress: (value: number) => void
}>()

const { camera, renderer, scene, invalidate } = useTres()

const BOARD_W = 2.1
const BOARD_H = 1.05
const BOARD_D = 0.08

// --- Wood under the paint: a procedural plank texture (horizontal grain and two knots).
function woodTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#d6aa76'
  ctx.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * c.height
    ctx.strokeStyle = `rgba(${120 + Math.random() * 40}, ${72 + Math.random() * 30}, ${36 + Math.random() * 20}, ${0.12 + Math.random() * 0.22})`
    ctx.lineWidth = 1 + Math.random() * 4
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= c.width; x += 40) ctx.lineTo(x, y + Math.sin(x / 120 + i) * 6)
    ctx.stroke()
  }
  for (const [x, y] of [[300, 180], [760, 330]] as const) {
    for (let r = 34; r > 4; r -= 6) {
      ctx.strokeStyle = `rgba(110, 66, 30, ${0.5 - r / 90})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(x, y, r * 1.7, r, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

// --- Old paint: a canvas mapped onto the front face by UV. Sanding removes alpha.
const SIZE_W = 1024
const SIZE_H = 512
const paintCanvas = document.createElement('canvas')
paintCanvas.width = SIZE_W
paintCanvas.height = SIZE_H
const ctx = paintCanvas.getContext('2d')
const probe = document.createElement('canvas')
probe.width = 64
probe.height = 32
const probeCtx = probe.getContext('2d', { willReadFrequently: true })
const paintTexture = new CanvasTexture(paintCanvas)
paintTexture.colorSpace = SRGBColorSpace

let initialAlpha = 1

function alphaSum(): number {
  if (!probeCtx) return 0
  probeCtx.clearRect(0, 0, 64, 32)
  probeCtx.drawImage(paintCanvas, 0, 0, 64, 32)
  const data = probeCtx.getImageData(0, 0, 64, 32).data
  let sum = 0
  for (let i = 3; i < data.length; i += 4) sum += data[i] ?? 0
  return sum
}

function paint(): void {
  if (!ctx) return
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, SIZE_W, SIZE_H)
  const hues = ['#8fb3bf', '#9dbcc6', '#86a8b4']
  ctx.fillStyle = hues[Math.floor(Math.random() * hues.length)]!
  ctx.fillRect(0, 0, SIZE_W, SIZE_H)
  // Shading and cracks so it reads as old, flaking paint
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * SIZE_W
    const y = Math.random() * SIZE_H
    const r = 30 + Math.random() * 90
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255, 255, 255, 0.14)')
    g.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.strokeStyle = 'rgba(60, 70, 74, 0.35)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 26; i++) {
    let x = Math.random() * SIZE_W
    let y = Math.random() * SIZE_H
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 6; k++) {
      x += (Math.random() - 0.5) * 70
      y += (Math.random() - 0.5) * 40
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  // A few chips where the wood already shows
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 7; i++) {
    ctx.beginPath()
    ctx.ellipse(Math.random() * SIZE_W, Math.random() * SIZE_H, 10 + Math.random() * 26, 6 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  paintTexture.needsUpdate = true
  initialAlpha = Math.max(1, alphaSum())
  props.onProgress(0)
  invalidate()
}

// --- Object: a plank on a small stand
const group = new Group()
const board = new Group()
board.position.y = 1.05
group.add(board)

const woodMap = woodTexture()
const woodMat = new MeshStandardMaterial({ map: woodMap, roughness: 0.7 })
const edgeMat = new MeshStandardMaterial({ color: '#c39261', roughness: 0.75 })
// Box faces: +x, -x, +y, -y, +z (front), -z (back)
const plank = new Mesh(new BoxGeometry(BOARD_W, BOARD_H, BOARD_D), [edgeMat, edgeMat, edgeMat, edgeMat, woodMat, woodMat])
plank.castShadow = true
board.add(plank)

const paintMat = new MeshStandardMaterial({ map: paintTexture, transparent: true, roughness: 0.85, depthWrite: false })
const paintLayer = new Mesh(new PlaneGeometry(BOARD_W, BOARD_H), paintMat)
paintLayer.position.z = BOARD_D / 2 + 0.002
paintLayer.renderOrder = 1
board.add(paintLayer)

const stand = new Mesh(new BoxGeometry(1.2, 0.08, 0.5), new MeshStandardMaterial({ color: '#4a4744', roughness: 0.7 }))
stand.position.set(0, 0.48, 0)
group.add(stand)

group.add(new HemisphereLight('#ffffff', '#b8ab98', 1))
const light = new DirectionalLight('#ffffff', 1.9)
light.position.set(2, 4, 5)
group.add(light)

if (!scene.value.environment) {
  const pmrem = new PMREMGenerator(renderer as WebGLRenderer)
  scene.value.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
}

paint()

// Face the board from the first moment; the orbit controls take over once frames run.
camera.value?.lookAt(0, board.position.y, 0)

// --- Input: raycast pointer → UV on the paint layer, but only when the paint layer is
// the first hit (the plank itself occludes it when the board is turned around).
const raycaster = new Raycaster()
const ndc = new Vector2()
const targets = [plank, paintLayer]
let drawing = false
let lastProbe = 0
let done = false

function sandAt(clientX: number, clientY: number): void {
  const cam = camera.value
  const el = (renderer as WebGLRenderer).domElement
  if (!cam || !ctx) return
  const rect = el.getBoundingClientRect()
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  // Matrices are normally refreshed by the renderer; refresh them here too so input works
  // even before the first frame (on-demand rendering, background tab).
  cam.updateMatrixWorld()
  group.updateMatrixWorld(true)
  raycaster.setFromCamera(ndc, cam)
  const hit = raycaster.intersectObjects(targets, false)[0]
  if (!hit || hit.object !== paintLayer || !hit.uv) return
  const x = hit.uv.x * SIZE_W
  const y = (1 - hit.uv.y) * SIZE_H
  // Sanding: strong in the middle, soft edge — two or three passes clean the board.
  const brush = 52
  ctx.globalCompositeOperation = 'destination-out'
  const g = ctx.createRadialGradient(x, y, 0, x, y, brush)
  g.addColorStop(0, 'rgba(0,0,0,0.9)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.7)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, brush, 0, Math.PI * 2)
  ctx.fill()
  paintTexture.needsUpdate = true
  invalidate()
  const now = performance.now()
  if (now - lastProbe > 120) {
    lastProbe = now
    reportProgress()
  }
}

function reportProgress(): void {
  const p = Math.min(1, Math.max(0, 1 - alphaSum() / initialAlpha))
  props.onProgress(p)
  if (p >= 0.9 && !done && ctx) {
    done = true
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, SIZE_W, SIZE_H)
    paintTexture.needsUpdate = true
    props.onProgress(1)
    invalidate()
  }
}

function onDown(e: PointerEvent): void {
  if (props.mode !== 'sand' || done) return
  drawing = true
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  sandAt(e.clientX, e.clientY)
}

function onMove(e: PointerEvent): void {
  if (!drawing || props.mode !== 'sand') return
  sandAt(e.clientX, e.clientY)
}

function onUp(): void {
  if (drawing) reportProgress()
  drawing = false
}

const dom = (renderer as WebGLRenderer).domElement
dom.addEventListener('pointerdown', onDown)
dom.addEventListener('pointermove', onMove)
dom.addEventListener('pointerup', onUp)
dom.addEventListener('pointercancel', onUp)

watch(
  () => props.mode,
  (m) => {
    dom.style.touchAction = 'none'
    dom.style.cursor = m === 'sand' ? 'crosshair' : 'grab'
  },
  { immediate: true },
)

function reset(): void {
  done = false
  paint()
}

defineExpose({ reset })

onBeforeUnmount(() => {
  dom.removeEventListener('pointerdown', onDown)
  dom.removeEventListener('pointermove', onMove)
  dom.removeEventListener('pointerup', onUp)
  dom.removeEventListener('pointercancel', onUp)
  group.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose()
      const m = obj.material as Material | Material[]
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m.dispose()
    }
  })
  paintTexture.dispose()
  woodMap.dispose()
})
</script>
