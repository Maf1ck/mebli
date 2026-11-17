/**
 * Parametric furniture model built from the item configuration. Everything is
 * procedural (boxes, cylinders), so changing a size or an option rebuilds the model
 * in a few milliseconds and no model files have to be downloaded.
 *
 * Units: metres. The model stands on y = 0 and is centred on x / z.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three'
import type { Material, Object3D } from 'three'
import type { FacadeMaterial, ItemConfig } from '#shared/types'
import { cornerCount, isCaseType } from '#shared/pricing'

const T = 0.018 // panel thickness
const PLINTH = 0.07
/** Context walls: a warm grey that separates from both white and dark carcasses */
const WALL = '#cbc2b4'

// ---------------------------------------------------------------------------
// Materials

const cache = new Map<string, Material>()
const grainCache = new Map<string, CanvasTexture>()

/** Procedural wood grain: soft vertical streaks, tinted by the material colour. */
function grainTexture(seed: number): CanvasTexture {
  const key = String(seed)
  const hit = grainCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  let s = seed
  const rnd = (): number => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (let i = 0; i < 70; i++) {
    const x = rnd() * c.width
    const w = 1 + rnd() * 5
    const shade = Math.round(205 + rnd() * 40)
    ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= c.height; y += 32) ctx.lineTo(x + Math.sin(y / 70 + i) * (2 + rnd() * 5), y)
    ctx.stroke()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  grainCache.set(key, tex)
  return tex
}

type Finish = FacadeMaterial | 'body' | 'metal' | 'mirror' | 'counter' | 'wall' | 'floor' | 'glow' | 'dark' | 'fabric'

export function finishMat(hex: string, finish: Finish, grain: boolean, opacity = 1): Material {
  const key = `${hex}|${finish}|${grain ? 1 : 0}|${opacity}`
  const hit = cache.get(key)
  if (hit) return hit
  const color = new Color(hex)
  let m: Material
  const transparent = opacity < 1
  switch (finish) {
    case 'acrylic':
      m = new MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent, opacity })
      break
    case 'mdf_paint':
      m = new MeshStandardMaterial({ color, roughness: 0.62, transparent, opacity })
      break
    case 'metal':
      m = new MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.85 })
      break
    case 'mirror':
      m = new MeshStandardMaterial({ color: new Color('#eef3f5'), roughness: 0.08, metalness: 0.85, envMapIntensity: 2.4, transparent, opacity })
      break
    case 'glow':
      m = new MeshStandardMaterial({ color: new Color('#fff4dc'), emissive: new Color('#ffd89a'), emissiveIntensity: 1.6, roughness: 0.4 })
      break
    case 'dark':
      m = new MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.2 })
      break
    case 'wall':
    case 'floor':
    case 'fabric':
      m = new MeshStandardMaterial({ color, roughness: 0.95 })
      break
    default:
      m = new MeshStandardMaterial({
        color,
        roughness: finish === 'veneer' ? 0.48 : 0.55,
        map: grain || finish === 'veneer' ? grainTexture(hex.length * 977 + parseInt(hex.slice(1), 16) % 9973) : null,
        transparent,
        opacity,
      })
  }
  cache.set(key, m)
  return m
}

export function disposeMaterialCache(): void {
  for (const m of cache.values()) m.dispose()
  for (const t of grainCache.values()) t.dispose()
  cache.clear()
  grainCache.clear()
}

function box(w: number, h: number, d: number, material: Material, x: number, y: number, z: number, shadow = true): Mesh {
  const m = new Mesh(new BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), material)
  m.position.set(x, y, z)
  m.castShadow = shadow
  m.receiveShadow = true
  return m
}

// ---------------------------------------------------------------------------
// Rig: moving parts for the "open" toggle

export interface Movable {
  obj: Object3D
  kind: 'hinge' | 'slide' | 'drawer'
  /** Rotation (hinge) or offset (slide/drawer) when fully open */
  amount: number
  axis: 'x' | 'z'
  base: number
  /** Fronts fade a little when open so the interior reads (sliding doors) */
  fade?: Material[]
}

export interface FurnitureModel {
  group: Group
  movables: Movable[]
  /** Bounding size for camera framing, metres */
  size: Vector3
  center: Vector3
}

interface Ctx {
  c: ItemConfig
  grainHexes: Set<string>
  lineColor: string
  movables: Movable[]
  dims: Group
  /** Label size in metres, proportional to the model so small pieces get small labels */
  labelScale: number
}

const front = (ctx: Ctx, opacity = 1): Material => finishMat(ctx.c.facadeColor, ctx.c.facade, ctx.grainHexes.has(ctx.c.facadeColor), opacity)
const carcass = (ctx: Ctx): Material => finishMat(ctx.c.bodyColor, 'body', ctx.grainHexes.has(ctx.c.bodyColor))
const inside = (ctx: Ctx): Material => finishMat(shade(ctx.c.bodyColor, -0.06), 'body', false)
const metal = (): Material => finishMat('#b9bfc2', 'metal', false)

function shade(hex: string, amount: number): string {
  const col = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  col.getHSL(hsl)
  col.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)))
  return `#${col.getHexString()}`
}

function handleBar(length: number, vertical: boolean): Mesh {
  const m = new Mesh(new BoxGeometry(vertical ? 0.012 : length, vertical ? length : 0.012, 0.022), metal())
  m.castShadow = true
  return m
}

// ---------------------------------------------------------------------------
// Dimension lines with labels

/** Label on a pill that contrasts with the text colour, so it reads over walls and fronts. */
function label(text: string, color: string, scale: number): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 80
  const ctx = canvas.getContext('2d')!
  const light = new Color(color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5
  ctx.fillStyle = light ? 'rgba(24, 19, 15, 0.82)' : 'rgba(255, 253, 249, 0.9)'
  ctx.beginPath()
  ctx.roundRect(14, 10, 228, 62, 31)
  ctx.fill()
  ctx.font = '600 42px Onest, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, 128, 43)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  sprite.scale.set(scale, scale * 0.31, 1)
  sprite.renderOrder = 10
  return sprite
}

function dimension(ctx: Ctx, a: Vector3, b: Vector3, offset: Vector3, mm: number): void {
  const a2 = a.clone().add(offset)
  const b2 = b.clone().add(offset)
  const tick = offset.clone().normalize().multiplyScalar(0.05)
  const pts = [a2, b2, a.clone().add(offset).sub(tick), a2.clone().add(tick), b.clone().add(offset).sub(tick), b2.clone().add(tick)]
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3))
  const line = new LineSegments(geo, new LineBasicMaterial({ color: ctx.lineColor, transparent: true, opacity: 0.75, depthTest: false }))
  line.renderOrder = 9
  ctx.dims.add(line)
  const tag = label(`${Math.round(mm)} мм`, ctx.lineColor, ctx.labelScale)
  tag.position.copy(a2).add(b2).multiplyScalar(0.5).add(offset.clone().normalize().multiplyScalar(ctx.labelScale * 0.15))
  ctx.dims.add(tag)
}

// ---------------------------------------------------------------------------
// Interior planning for case furniture

interface SectionPlan {
  drawers: number
  baskets: number
  rods: number
  shelves: number
  lit: boolean
  door: boolean
  mirror: boolean
}

function planSections(c: ItemConfig): SectionPlan[] {
  const n = c.sections
  const plans: SectionPlan[] = Array.from({ length: n }, () => ({ drawers: 0, baskets: 0, rods: 0, shelves: 0, lit: false, door: c.type !== 'walkin', mirror: false }))
  const o = c.options
  const spread = (count: number, key: 'drawers' | 'baskets' | 'rods' | 'shelves', max: number, order: number[]): void => {
    let left = count
    let guard = 0
    while (left > 0 && guard < 200) {
      for (const i of order) {
        const p = plans[i]
        if (!p || left <= 0) continue
        if (p[key] < max) {
          p[key] += 1
          left -= 1
        }
      }
      guard += 1
    }
  }
  const forward = plans.map((_, i) => i)
  const backward = [...forward].reverse()
  // Hallway: the first section is an open hanger; rods go there first.
  if (c.type === 'hallway' && plans[0]) plans[0].door = false
  spread(o.rod ?? 0, 'rods', 2, c.type === 'hallway' ? forward : backward)
  spread(o.drawer ?? 0, 'drawers', c.height < 1000 ? 3 : 4, forward.filter((i) => plans[i]!.rods < 2 || n === 1))
  spread(o.basket ?? 0, 'baskets', 3, backward)
  spread(o.shelf ?? 0, 'shelves', 8, forward)
  for (let i = 0; i < Math.min(o.lighting ?? 0, n); i++) plans[i]!.lit = true
  // Mirror fronts go to the last hinged doors.
  let mirrors = o.mirror ?? 0
  for (const i of backward) {
    if (mirrors <= 0) break
    if (plans[i]!.door) {
      plans[i]!.mirror = true
      mirrors -= 1
    }
  }
  return plans
}

const CLOTHES = ['#6d7f8c', '#b8a48c', '#3f4a54', '#c97b63', '#8c9a7a', '#d8d0c4']

function clothes(ctx: Ctx, parent: Group, x0: number, width: number, rodY: number, depth: number, zc: number, seed: number): void {
  const count = Math.max(1, Math.floor(width / 0.09))
  for (let k = 0; k < count; k++) {
    const len = 0.55 + ((seed * 7 + k * 13) % 5) * 0.09
    const x = x0 + (k + 0.5) * (width / count)
    const garment = box(0.035, len, Math.min(0.46, depth - 0.08), finishMat(CLOTHES[(seed + k) % CLOTHES.length]!, 'fabric', false), x, rodY - 0.03 - len / 2, zc, false)
    parent.add(garment)
  }
}

// ---------------------------------------------------------------------------
// Case furniture: wardrobe, walk-in, hallway, cabinet

function buildCase(ctx: Ctx): Group {
  const c = ctx.c
  const g = new Group()
  const W = c.width / 1000
  const H = c.height / 1000
  const D = c.depth / 1000
  const walkin = c.type === 'walkin'
  const plinth = walkin ? 0 : c.height < 1000 ? 0.1 : PLINTH
  const n = c.sections
  const inner = W - 2 * T
  const sw = (inner - (n - 1) * T) / n
  const zc = 0
  const zFront = D / 2
  const bottomY = plinth + T
  const topY = walkin ? H - 0.02 : H - T

  // Carcass
  g.add(box(T, H, D, carcass(ctx), -W / 2 + T / 2, H / 2, zc))
  g.add(box(T, H, D, carcass(ctx), W / 2 - T / 2, H / 2, zc))
  if (!walkin) {
    g.add(box(W, T, D, carcass(ctx), 0, H - T / 2, zc))
    g.add(box(inner, T, D, carcass(ctx), 0, plinth + T / 2, zc))
    g.add(box(inner, plinth, T, finishMat(shade(c.bodyColor, -0.12), 'body', false), 0, plinth / 2, zFront - 0.05))
    g.add(box(inner, H - plinth - T, 0.004, inside(ctx), 0, plinth + (H - plinth - T) / 2, -D / 2 + 0.003, false))
  } else {
    g.add(box(inner, T, D, carcass(ctx), 0, 0.06, zc))
  }
  for (let i = 1; i < n; i++) {
    const x = -W / 2 + T + i * sw + (i - 0.5) * T
    g.add(box(T, topY - bottomY, D - 0.02, carcass(ctx), x, bottomY + (topY - bottomY) / 2, zc - 0.01))
  }

  const plans = planSections(c)
  const hinged = c.type === 'hallway' || c.type === 'cabinet'
  const showHandles = (c.options.handle ?? 0) > 0

  plans.forEach((p, i) => {
    const x0 = -W / 2 + T + i * (sw + T)
    const xc = x0 + sw / 2
    let y = walkin ? 0.06 + T : bottomY
    const zInner = hinged ? zFront - T / 2 : zFront - 0.06

    // Drawers (external fronts on hinged furniture, internal behind sliding doors)
    const dh = c.height < 1000 ? Math.min(0.2, (topY - bottomY) / Math.max(3, p.drawers)) : 0.19
    for (let k = 0; k < p.drawers + p.baskets; k++) {
      const isBasket = k >= p.drawers
      const drawer = new Group()
      const fz = hinged || walkin ? zFront - T / 2 : zFront - 0.08
      drawer.add(box(sw - 0.006, dh - 0.006, T, isBasket ? metal() : front(ctx), xc, y + dh / 2, fz))
      drawer.add(box(sw - 0.04, dh - 0.06, D - 0.1, inside(ctx), xc, y + dh / 2 - 0.01, fz - (D - 0.1) / 2 - T / 2, false))
      if (showHandles && !isBasket) {
        const hb = handleBar(Math.min(0.32, sw * 0.5), false)
        hb.position.set(xc, y + dh / 2, fz + T / 2 + 0.012)
        drawer.add(hb)
      }
      g.add(drawer)
      ctx.movables.push({ obj: drawer, kind: 'drawer', axis: 'z', amount: D * 0.45, base: 0 })
      y += dh
    }

    const free0 = y + (p.drawers + p.baskets > 0 ? T : 0)
    let freeTop = topY
    if (p.drawers + p.baskets > 0) g.add(box(sw, T, D - 0.03, carcass(ctx), xc, y + T / 2, zc - 0.01))

    // Rods with hanging clothes; a shelf above the top rod when there are shelves.
    let shelvesLeft = p.shelves
    if (p.rods > 0) {
      if (shelvesLeft > 0) {
        const sy = freeTop - 0.34
        g.add(box(sw, T, D - 0.04, carcass(ctx), xc, sy, zc - 0.01))
        shelvesLeft -= 1
        freeTop = sy - T / 2
      }
      const zone = Math.min(1.05, (freeTop - free0) / p.rods)
      for (let r = 0; r < p.rods; r++) {
        const ry = freeTop - 0.07 - r * zone
        const rod = new Mesh(new CylinderGeometry(0.012, 0.012, sw - 0.01, 12), metal())
        rod.rotation.z = Math.PI / 2
        rod.position.set(xc, ry, zc)
        rod.castShadow = true
        g.add(rod)
        clothes(ctx, g, x0, sw, ry, D, zc, i * 3 + r)
      }
      freeTop = freeTop - p.rods * zone
    }
    if (shelvesLeft > 0) {
      const gap = (freeTop - free0) / (shelvesLeft + 1)
      for (let s = 1; s <= shelvesLeft; s++) g.add(box(sw, T, D - 0.04, carcass(ctx), xc, free0 + gap * s, zc - 0.01))
    }
    if (p.lit) g.add(box(sw - 0.04, 0.008, 0.02, finishMat('#fff4dc', 'glow', false), xc, topY - 0.012, zFront - 0.07, false))

    // Hinged door over the free part of the section
    if (hinged && p.door) {
      const doorBottom = p.drawers + p.baskets > 0 ? y + 0.003 : bottomY - T + 0.003
      const dhgt = H - (walkin ? 0 : T) - doorBottom - 0.003
      if (dhgt > 0.12) {
        const left = i % 2 === 0
        const pivot = new Group()
        pivot.position.set(left ? x0 - T / 2 + 0.002 : x0 + sw + T / 2 - 0.002, doorBottom + dhgt / 2, zFront + T / 2)
        const dw = sw + T - 0.004
        const leaf = box(dw, dhgt, T, p.mirror ? finishMat('#e4ebef', 'mirror', false) : front(ctx), left ? dw / 2 : -dw / 2, 0, 0)
        pivot.add(leaf)
        if (showHandles) {
          const hb = handleBar(Math.min(0.3, dhgt * 0.3), true)
          hb.position.set(left ? dw - 0.04 : -dw + 0.04, c.height < 1000 ? dhgt / 2 - 0.08 : -0.05, T / 2 + 0.012)
          pivot.add(hb)
        }
        g.add(pivot)
        ctx.movables.push({ obj: pivot, kind: 'hinge', axis: 'x', amount: left ? -1.75 : 1.75, base: 0 })
      }
    }
  })

  // Sliding doors on two rails
  if (c.type === 'wardrobe') {
    const doors = c.doors
    const span = inner / doors
    const overlap = 0.03
    const dhgt = H - plinth - T - 0.01
    let mirrors = c.options.mirror ?? 0
    g.add(box(W, 0.02, 0.09, metal(), 0, H - T - 0.01, zFront + 0.045))
    for (let i = 0; i < doors; i++) {
      const frontRail = i % 2 === 1
      const isMirror = mirrors > 0 && i % 2 === 0
      if (isMirror) mirrors -= 1
      const opaque = isMirror ? finishMat('#e4ebef', 'mirror', false) : front(ctx)
      const fadeMat = isMirror ? finishMat('#e4ebef', 'mirror', false, 0.3) : front(ctx, 0.3)
      const door = box(span + overlap, dhgt, 0.02, opaque, -inner / 2 + span * (i + 0.5), plinth + dhgt / 2 + 0.005, zFront + (frontRail ? 0.068 : 0.03))
      // Vertical aluminium profiles on both edges
      for (const side of [-1, 1]) {
        const prof = new Mesh(new BoxGeometry(0.022, dhgt, 0.03), metal())
        prof.position.set((side * (span + overlap)) / 2, 0, 0.004)
        door.add(prof)
      }
      g.add(door)
      const dir = i === doors - 1 && frontRail ? -1 : frontRail ? 1 : 0
      ctx.movables.push({ obj: door, kind: 'slide', axis: 'x', amount: dir * span * 0.92, base: door.position.x, fade: [opaque, fadeMat] })
    }
  }

  if (walkin) {
    g.add(box(W + 0.6, H + 0.25, 0.04, finishMat(WALL, 'wall', false), 0, (H + 0.25) / 2, -D / 2 - 0.03))
  }

  // Dimensions: width on top, height on the right, depth on the top-right edge
  dimension(ctx, new Vector3(-W / 2, H, zFront), new Vector3(W / 2, H, zFront), new Vector3(0, 0.16, 0), c.width)
  dimension(ctx, new Vector3(W / 2, 0, zFront), new Vector3(W / 2, H, zFront), new Vector3(0.16, 0, 0), c.height)
  dimension(ctx, new Vector3(W / 2, H, zFront), new Vector3(W / 2, H, -D / 2), new Vector3(0.12, 0.08, 0), c.depth)
  return g
}

// ---------------------------------------------------------------------------
// Kitchen

const K = { depth: 0.56, top: 0.038, low: 0.85, upperY: 1.45, upperH: 0.72, upperD: 0.32 }

interface RunOptions {
  length: number
  upper: number
  drawers: number
  cutouts: number
  lit: boolean
  handles: boolean
  /** Which end of the run the upper modules start from (the corner side) */
  upperFrom: 'left' | 'right'
}

/** One straight run along x, centred at 0, back against the wall at z = -0.3. */
function kitchenRun(ctx: Ctx, o: RunOptions): Group {
  const g = new Group()
  const L = o.length
  const n = Math.max(1, Math.round(L / 0.6))
  const mw = L / n
  const back = -0.3
  const zc = back + K.depth / 2
  const zFront = back + K.depth
  const carcassH = K.low - 0.1 - K.top
  const counter = finishMat(shade(ctx.c.bodyColor, -0.25), 'counter', ctx.grainHexes.has(ctx.c.bodyColor))
  g.add(box(L, 0.1, 0.02, finishMat('#3a3d40', 'dark', false), 0, 0.05, zFront - 0.06))
  g.add(box(L + 0.02, K.top, 0.6, counter, 0, K.low - K.top / 2, back + 0.3))

  let drawersLeft = o.drawers
  const drawerModules = new Set<number>()
  for (let i = 0; i < n && drawersLeft > 0; i++) {
    const idx = n - 1 - i
    drawerModules.add(idx)
    drawersLeft -= 3
  }
  const sinkAt = o.cutouts > 0 ? Math.min(n - 1, Math.floor(n / 2)) : -1
  const hobAt = o.cutouts > 1 ? (sinkAt > 0 ? 0 : n - 1) : -1

  for (let i = 0; i < n; i++) {
    const xc = -L / 2 + mw * (i + 0.5)
    g.add(box(mw - 0.002, carcassH, K.depth - T, carcass(ctx), xc, 0.1 + carcassH / 2, zc - T / 2))
    if (drawerModules.has(i)) {
      const count = 3
      const dh = carcassH / count
      for (let k = 0; k < count; k++) {
        const d = new Group()
        d.add(box(mw - 0.006, dh - 0.006, T, front(ctx), xc, 0.1 + dh * (k + 0.5), zFront - T / 2))
        d.add(box(mw - 0.05, dh - 0.05, K.depth - 0.1, inside(ctx), xc, 0.1 + dh * (k + 0.5), zFront - T - (K.depth - 0.1) / 2, false))
        if (o.handles) {
          const hb = handleBar(Math.min(0.3, mw * 0.5), false)
          hb.position.set(xc, 0.1 + dh * (k + 0.5) + dh / 2 - 0.05, zFront + 0.012)
          d.add(hb)
        }
        g.add(d)
        ctx.movables.push({ obj: d, kind: 'drawer', axis: 'z', amount: 0.35 + k * 0.04, base: 0 })
      }
    } else {
      const left = i % 2 === 0
      const pivot = new Group()
      pivot.position.set(xc + (left ? -mw / 2 : mw / 2), 0.1 + carcassH / 2, zFront)
      const dw = mw - 0.004
      pivot.add(box(dw, carcassH - 0.004, T, front(ctx), left ? dw / 2 : -dw / 2, 0, -T / 2))
      if (o.handles) {
        const hb = handleBar(0.2, true)
        hb.position.set(left ? dw - 0.04 : -dw + 0.04, carcassH / 2 - 0.15, 0.012)
        pivot.add(hb)
      }
      g.add(pivot)
      ctx.movables.push({ obj: pivot, kind: 'hinge', axis: 'x', amount: left ? -1.6 : 1.6, base: 0 })
    }
    if (i === sinkAt) {
      g.add(box(Math.min(0.5, mw - 0.1), 0.02, 0.4, finishMat('#9aa2a6', 'metal', false), xc, K.low + 0.001, back + 0.3, false))
      const tap = new Mesh(new TorusGeometry(0.09, 0.012, 10, 24, Math.PI), metal())
      tap.position.set(xc, K.low + 0.24, back + 0.08)
      tap.rotation.y = Math.PI / 2
      g.add(tap)
      g.add(box(0.025, 0.24, 0.025, metal(), xc, K.low + 0.12, back + 0.08))
    }
    if (i === hobAt) {
      g.add(box(Math.min(0.56, mw - 0.04), 0.008, 0.5, finishMat('#141516', 'dark', false), xc, K.low + 0.004, back + 0.3, false))
    }
  }

  // Upper modules from the left end of the run
  if (o.upper > 0.2) {
    const un = Math.max(1, Math.round(o.upper / 0.6))
    const uw = o.upper / un
    const x0 = o.upperFrom === 'left' ? -L / 2 : L / 2 - o.upper
    for (let i = 0; i < un; i++) {
      const xc = x0 + uw * (i + 0.5)
      g.add(box(uw - 0.002, K.upperH, K.upperD - T, carcass(ctx), xc, K.upperY + K.upperH / 2, back + (K.upperD - T) / 2))
      const left = i % 2 === 0
      const pivot = new Group()
      pivot.position.set(xc + (left ? -uw / 2 : uw / 2), K.upperY + K.upperH / 2, back + K.upperD)
      const dw = uw - 0.004
      pivot.add(box(dw, K.upperH - 0.004, T, front(ctx), left ? dw / 2 : -dw / 2, 0, -T / 2))
      if (o.handles) {
        const hb = handleBar(0.16, true)
        hb.position.set(left ? dw - 0.04 : -dw + 0.04, -K.upperH / 2 + 0.12, 0.012)
        pivot.add(hb)
      }
      g.add(pivot)
      ctx.movables.push({ obj: pivot, kind: 'hinge', axis: 'x', amount: left ? -1.5 : 1.5, base: 0 })
    }
    if (o.lit) g.add(box(o.upper - 0.06, 0.008, 0.02, finishMat('#fff4dc', 'glow', false), x0 + o.upper / 2, K.upperY - 0.006, back + K.upperD - 0.05, false))
  }
  return g
}

interface Framed {
  group: Group
  size: Vector3
  center: Vector3
}

/**
 * The lower length is split between the runs: straight = one run along the back
 * wall; corner = back run (60%, includes the corner module) + left run; U = back run
 * (40%) + left and right runs (30% each). Side runs start at the front edge of the
 * back run and face the room.
 */
function buildKitchen(ctx: Ctx): Framed {
  const c = ctx.c
  const g = new Group()
  const L = c.lowerLength / 1000
  const corners = cornerCount(c.layout)
  const share = corners === 2 ? [0.4, 0.3, 0.3] : corners === 1 ? [0.6, 0.4] : [1]
  const runs = share.map((s) => Math.max(0.4, Math.round((L * s) / 0.1) * 0.1))
  let upperLeft = c.upperLength / 1000
  const totalDrawers = (c.options.drawer ?? 0) + (c.options.basket ?? 0)
  const handles = (c.options.handle ?? 0) > 0
  const lit = (c.options.lighting ?? 0) > 0
  const main = runs[0]!
  const frontZ = -0.3 + K.depth

  runs.forEach((len, r) => {
    const upper = Math.max(0, Math.min(upperLeft, len))
    upperLeft -= upper
    const run = kitchenRun(ctx, {
      length: len,
      upper,
      drawers: r === 0 ? totalDrawers : 0,
      cutouts: r === 0 ? (c.options.cutout ?? 0) : 0,
      lit,
      handles,
      // Left run turns +90°, so its corner is at local +x; the right run's corner is at local −x.
      upperFrom: r === 1 ? 'right' : 'left',
    })
    if (r > 0) {
      const side = r === 1 ? -1 : 1
      // +90° turns the run's front (+z) to face +x (left wall); −90° faces −x (right wall).
      run.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2
      run.position.set(side * (main / 2 - 0.3), 0, frontZ + len / 2)
    }
    g.add(run)
  })

  const sideMax = corners > 0 ? Math.max(...runs.slice(1)) : 0
  let depthEnd = frontZ + sideMax
  if (c.island) {
    const iz = frontZ + Math.max(sideMax * 0.6, 0.6) + 0.5
    g.add(box(1.4, K.low - K.top, 0.8, front(ctx), 0, (K.low - K.top) / 2, iz))
    g.add(box(1.6, K.top, 1.0, finishMat(shade(c.bodyColor, -0.25), 'counter', ctx.grainHexes.has(c.bodyColor)), 0, K.low - K.top / 2, iz))
    depthEnd = Math.max(depthEnd, iz + 0.5)
  }

  // Walls for context
  const wallMat = finishMat(WALL, 'wall', false)
  g.add(box(main + 0.04, 2.5, 0.04, wallMat, 0, 1.25, -0.32))
  for (let r = 1; r <= corners; r++) {
    const len = runs[r]!
    const side = r === 1 ? -1 : 1
    g.add(box(0.04, 2.5, len + K.depth + 0.02, wallMat, side * (main / 2 + 0.02), 1.25, -0.31 + (len + K.depth) / 2))
  }

  dimension(ctx, new Vector3(-main / 2, K.low, frontZ), new Vector3(main / 2, K.low, frontZ), new Vector3(0, 0, 0.22), main * 1000)
  for (let r = 1; r <= corners; r++) {
    const len = runs[r]!
    const side = r === 1 ? -1 : 1
    const xFront = side * (main / 2 - K.depth)
    dimension(ctx, new Vector3(xFront, K.low, frontZ), new Vector3(xFront, K.low, frontZ + len), new Vector3(-side * 0.2, 0.04, 0), len * 1000)
  }

  const size = new Vector3(main, 2.3, depthEnd + 0.3)
  const center = new Vector3(0, 1.05, (-0.3 + depthEnd) / 2)
  return { group: g, size, center }
}

// ---------------------------------------------------------------------------

export function buildFurniture(config: ItemConfig, grainHexes: Set<string>, lineColor: string): FurnitureModel | null {
  if (config.type === 'other') return null
  const dims = new Group()
  dims.name = 'dimensions'
  const span = config.type === 'kitchen' ? config.lowerLength / 1000 : Math.max(config.width, config.height) / 1000
  const labelScale = Math.min(0.62, Math.max(0.3, span * 0.2))
  const ctx: Ctx = { c: config, grainHexes, lineColor, movables: [], dims, labelScale }
  const group = new Group()
  // Frame on the furniture itself, not on the context walls or labels.
  let size: Vector3
  let center: Vector3
  if (config.type === 'kitchen') {
    const k = buildKitchen(ctx)
    group.add(k.group)
    size = k.size
    center = k.center
  } else if (isCaseType(config.type)) {
    group.add(buildCase(ctx))
    size = new Vector3(config.width / 1000, config.height / 1000, config.depth / 1000)
    center = new Vector3(0, size.y / 2, 0)
  } else {
    return null
  }
  group.add(dims)
  return { group, movables: ctx.movables, size, center }
}

export function disposeModel(model: FurnitureModel): void {
  model.group.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof LineSegments) obj.geometry.dispose()
    if (obj instanceof Sprite) {
      obj.material.map?.dispose()
      obj.material.dispose()
    }
    if (obj instanceof LineSegments) (obj.material as Material).dispose()
  })
}
