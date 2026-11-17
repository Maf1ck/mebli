import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Group, MeshStandardMaterial, Object3D, SphereGeometry, TorusGeometry } from 'three'
import type { Mesh } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { CharacterId } from '#shared/content/services'
import { PALETTE, at, makeArm, makeFace, makeFoot, mat, mesh } from './parts'

export interface CharacterRig {
  id: CharacterId
  root: Group
  /** Squashes gently for the idle "breathing" */
  body: Group
  /** Arm that waves on greeting */
  waveArm: Group
  face: Group
  eyes: Mesh[]
  /** Point above the head the speech bubble is attached to */
  anchor: Object3D
  /** Extra idle motion; t in seconds */
  idle?: (t: number, amp: number) => void
}

function finish(id: CharacterId, body: Group, waveArm: Group, face: ReturnType<typeof makeFace>, anchorPos: [number, number, number], idle?: CharacterRig['idle']): CharacterRig {
  const root = new Group()
  root.name = `character-${id}`
  root.add(body)
  const anchor = new Object3D()
  anchor.position.set(...anchorPos)
  root.add(anchor)
  return { id, root, body, waveArm, face: face.group, eyes: face.eyes, anchor, idle }
}

/** Шуруп — cordless drill standing on its battery: body, grip, chuck and bit, trigger. */
function drill(): CharacterRig {
  const body = new Group()
  // Battery pack as the "shoes"
  body.add(at(mesh(new RoundedBoxGeometry(0.86, 0.26, 0.66, 4, 0.08), mat(PALETTE.charcoal, 0.6)), 0, 0.15, 0))
  body.add(at(mesh(new RoundedBoxGeometry(0.88, 0.06, 0.68, 2, 0.02), mat(PALETTE.orange, 0.5)), 0, 0.3, 0))
  // Grip (where the face is)
  body.add(at(mesh(new CapsuleGeometry(0.29, 0.5, 8, 32), mat(PALETTE.orange, 0.45)), 0, 0.72, 0))
  body.add(at(mesh(new RoundedBoxGeometry(0.2, 0.42, 0.62, 3, 0.08), mat(PALETTE.charcoal, 0.75)), -0.22, 0.74, 0))
  // Motor housing across the top, chuck and bit pointing right
  const head = new Group()
  const housing = mesh(new CapsuleGeometry(0.27, 0.58, 8, 32), mat(PALETTE.orange, 0.45))
  housing.rotation.z = Math.PI / 2
  head.add(housing)
  for (const x of [-0.18, -0.08, 0.02]) {
    const vent = mesh(new BoxGeometry(0.035, 0.2, 0.02), mat(PALETTE.charcoal, 0.6), false)
    head.add(at(vent, x, 0.04, 0.27))
  }
  const chuck = mesh(new CylinderGeometry(0.13, 0.17, 0.24, 24), mat(PALETTE.charcoal, 0.4))
  chuck.rotation.z = Math.PI / 2
  head.add(at(chuck, 0.62, 0, 0))
  const bit = mesh(new CylinderGeometry(0.025, 0.035, 0.34, 12), mat(PALETTE.steel, 0.25, 0.85))
  bit.rotation.z = Math.PI / 2
  head.add(at(bit, 0.9, 0, 0))
  body.add(at(head, 0.12, 1.32, 0))
  const trigger = mesh(new RoundedBoxGeometry(0.1, 0.16, 0.16, 2, 0.04), mat(PALETTE.charcoal, 0.5))
  body.add(at(trigger, 0.3, 1.02, 0))

  const face = makeFace(0.22, 1.05)
  at(face.group, 0.02, 0.74, 0.29)
  body.add(face.group)

  const right = makeArm([[0.27, 0.8, 0.08], [0.46, 0.78, 0.18], [0.5, 0.98, 0.12]])
  body.add(right.pivot)
  const left = makeArm([[0, 0, 0], [-0.2, -0.1, 0.08], [-0.32, 0.04, 0.18]])
  at(left.pivot, -0.3, 0.8, 0.06)
  body.add(left.pivot)

  const idle = (t: number, amp: number): void => {
    bit.rotation.y = t * 6 * amp
  }
  return finish('drill', body, left.pivot, face, [0.5, 1.75, 0.2], idle)
}

/** Метрик — tape measure: rounded case, rubber ring, tape pulled out along the floor with a hook. */
function tape(): CharacterRig {
  const body = new Group()
  const caseGeo = new CylinderGeometry(0.6, 0.6, 0.5, 64)
  const shell = mesh(caseGeo, mat(PALETTE.sun, 0.45))
  shell.rotation.x = Math.PI / 2
  body.add(at(shell, 0, 0.72, 0))
  for (const z of [-0.26, 0.26]) {
    const ring = mesh(new TorusGeometry(0.6, 0.05, 12, 64), mat(PALETTE.charcoal, 0.75))
    body.add(at(ring, 0, 0.72, z))
  }
  // Exit slot and the tape along the floor
  body.add(at(mesh(new RoundedBoxGeometry(0.22, 0.12, 0.42, 2, 0.03), mat(PALETTE.charcoal, 0.6)), 0.56, 0.2, 0))
  const strip = mesh(new BoxGeometry(0.95, 0.012, 0.3), mat('#f6d36b', 0.5))
  body.add(at(strip, 1.12, 0.03, 0))
  for (let i = 0; i < 9; i++) {
    const mark = mesh(new BoxGeometry(0.012, 0.004, i % 2 ? 0.08 : 0.16), mat(PALETTE.charcoal, 0.6), false)
    body.add(at(mark, 0.72 + i * 0.1, 0.038, 0.07 - (i % 2 ? 0.04 : 0)))
  }
  body.add(at(mesh(new BoxGeometry(0.03, 0.1, 0.3), mat(PALETTE.steel, 0.3, 0.8)), 1.6, 0.07, 0))
  // Lock button on top
  body.add(at(mesh(new RoundedBoxGeometry(0.22, 0.12, 0.16, 2, 0.04), mat(PALETTE.charcoal, 0.5)), 0.1, 1.33, 0))

  const face = makeFace(0.24, 1.15)
  at(face.group, -0.04, 0.74, 0.255)
  body.add(face.group)
  body.add(makeFoot(-0.24, 0.16))
  body.add(makeFoot(0.2, 0.16))

  const right = makeArm([[0.55, 0.85, 0.06], [0.74, 0.72, 0.16], [0.82, 0.54, 0.2]])
  body.add(right.pivot)
  const left = makeArm([[0, 0, 0], [-0.22, -0.1, 0.08], [-0.34, 0.04, 0.16]])
  at(left.pivot, -0.58, 0.82, 0.05)
  body.add(left.pivot)

  return finish('tape', body, left.pivot, face, [0.3, 1.6, 0.2])
}

/** Бульбик — spirit level: aluminium bar on short legs with a glowing vial and a bubble. */
function level(): CharacterRig {
  const body = new Group()
  body.add(at(mesh(new RoundedBoxGeometry(1.7, 0.42, 0.24, 4, 0.05), mat(PALETTE.sky, 0.35, 0.3)), 0, 0.7, 0))
  body.add(at(mesh(new RoundedBoxGeometry(1.74, 0.06, 0.28, 2, 0.02), mat(PALETTE.graphite, 0.6)), 0, 0.92, 0))
  body.add(at(mesh(new RoundedBoxGeometry(1.74, 0.06, 0.28, 2, 0.02), mat(PALETTE.graphite, 0.6)), 0, 0.48, 0))
  // Vial window on the top and a side vial on the left end
  const vialMat = new MeshStandardMaterial({ color: '#c8f08a', emissive: '#9ad94f', emissiveIntensity: 0.25, roughness: 0.1, transparent: true, opacity: 0.85 })
  const vial = mesh(new CapsuleGeometry(0.06, 0.32, 6, 16), vialMat, false)
  vial.rotation.z = Math.PI / 2
  body.add(at(vial, 0, 0.98, 0))
  const bubble = mesh(new SphereGeometry(0.045, 16, 12), mat('#ffffff', 0.1), false)
  body.add(at(bubble, 0, 1.0, 0.02))
  const side = mesh(new CapsuleGeometry(0.05, 0.16, 6, 12), vialMat, false)
  body.add(at(side, -0.66, 0.7, 0.13))
  for (const x of [-0.62, 0.62]) {
    body.add(at(mesh(new CylinderGeometry(0.07, 0.09, 0.42, 16), mat(PALETTE.graphite, 0.6)), x, 0.24, 0))
    body.add(makeFoot(x, 0.06))
  }

  const face = makeFace(0.22, 1.05)
  at(face.group, 0.18, 0.7, 0.125)
  body.add(face.group)

  const right = makeArm([[0.84, 0.72, 0.04], [1.0, 0.6, 0.12], [1.06, 0.44, 0.18]])
  body.add(right.pivot)
  const left = makeArm([[0, 0, 0], [-0.2, -0.1, 0.08], [-0.3, 0.04, 0.16]])
  at(left.pivot, -0.86, 0.74, 0.04)
  body.add(left.pivot)

  const idle = (t: number, amp: number): void => {
    bubble.position.x = Math.sin(t * 0.9) * 0.1 * amp
  }
  return finish('level', body, left.pivot, face, [0.3, 1.45, 0.1], idle)
}

/** Тук — claw hammer standing on its handle: wooden handle with grip, steel head with a claw. */
function hammer(): CharacterRig {
  const body = new Group()
  body.add(at(mesh(new CapsuleGeometry(0.26, 0.82, 8, 32), mat(PALETTE.wood, 0.6)), 0, 0.62, 0))
  body.add(at(mesh(new CylinderGeometry(0.28, 0.28, 0.3, 32), mat(PALETTE.charcoal, 0.85)), 0, 0.3, 0))
  const head = new Group()
  head.add(at(mesh(new RoundedBoxGeometry(0.54, 0.3, 0.3, 3, 0.05), mat(PALETTE.steel, 0.3, 0.75)), 0.06, 0, 0))
  const face = mesh(new CylinderGeometry(0.17, 0.16, 0.22, 28), mat(PALETTE.steel, 0.25, 0.85))
  face.rotation.z = Math.PI / 2
  head.add(at(face, 0.42, 0, 0))
  for (const z of [-0.07, 0.07]) {
    const claw = mesh(new TorusGeometry(0.26, 0.05, 10, 24, Math.PI * 0.55), mat(PALETTE.steel, 0.3, 0.75))
    claw.rotation.z = Math.PI * 0.5
    head.add(at(claw, -0.22, -0.26, z))
  }
  body.add(at(head, 0, 1.3, 0))

  const f = makeFace(0.2, 1.0)
  at(f.group, 0, 0.82, 0.255)
  body.add(f.group)
  body.add(makeFoot(-0.17, 0.2))
  body.add(makeFoot(0.17, 0.2))

  const right = makeArm([[0.25, 0.8, 0.06], [0.44, 0.68, 0.14], [0.5, 0.5, 0.2]])
  body.add(right.pivot)
  const left = makeArm([[0, 0, 0], [-0.2, -0.1, 0.08], [-0.32, 0.04, 0.16]])
  at(left.pivot, -0.25, 0.84, 0.05)
  body.add(left.pivot)

  return finish('hammer', body, left.pivot, f, [0.55, 1.75, 0.1])
}

/** Грифель — carpenter's pencil: hexagonal body, sharpened wood cone and a graphite tip. */
function pencil(): CharacterRig {
  const body = new Group()
  const r = 0.36
  const hex = mesh(new CylinderGeometry(r, r, 1.0, 6), mat(PALETTE.red, 0.45))
  hex.rotation.y = Math.PI / 6
  body.add(at(hex, 0, 0.62, 0))
  const band = mesh(new CylinderGeometry(r + 0.01, r + 0.01, 0.1, 6), mat(PALETTE.sun, 0.35, 0.4))
  band.rotation.y = Math.PI / 6
  body.add(at(band, 0, 0.17, 0))
  const cone = mesh(new ConeGeometry(r, 0.42, 6), mat(PALETTE.wood, 0.7))
  cone.rotation.y = Math.PI / 6
  body.add(at(cone, 0, 1.33, 0))
  const tip = mesh(new ConeGeometry(0.1, 0.12, 6), mat(PALETTE.charcoal, 0.4))
  tip.rotation.y = Math.PI / 6
  body.add(at(tip, 0, 1.53, 0))

  const face = makeFace(0.22, 1.05)
  at(face.group, 0, 0.66, r * 0.866 + 0.004)
  body.add(face.group)
  body.add(makeFoot(-0.17, 0.2))
  body.add(makeFoot(0.17, 0.2))

  const right = makeArm([[0.31, 0.72, 0.08], [0.5, 0.6, 0.16], [0.56, 0.42, 0.22]])
  body.add(right.pivot)
  const left = makeArm([[0, 0, 0], [-0.2, -0.1, 0.08], [-0.32, 0.04, 0.16]])
  at(left.pivot, -0.31, 0.74, 0.08)
  body.add(left.pivot)

  return finish('pencil', body, left.pivot, face, [0.45, 1.75, 0.1])
}

/** Скринько — toolbox: box with a lid, carry handle, latches and a screwdriver peeking out. */
function toolbox(): CharacterRig {
  const body = new Group()
  body.add(at(mesh(new RoundedBoxGeometry(1.2, 0.66, 0.66, 4, 0.06), mat(PALETTE.red, 0.45)), 0, 0.45, 0))
  body.add(at(mesh(new RoundedBoxGeometry(1.24, 0.2, 0.7, 3, 0.06), mat(PALETTE.redDark, 0.5)), 0, 0.88, 0))
  const handle = mesh(new TorusGeometry(0.24, 0.045, 12, 32, Math.PI), mat(PALETTE.charcoal, 0.5))
  body.add(at(handle, 0, 0.98, 0))
  for (const x of [-0.44, 0.44]) body.add(at(mesh(new RoundedBoxGeometry(0.12, 0.14, 0.06, 2, 0.02), mat(PALETTE.steel, 0.3, 0.8)), x, 0.76, 0.34))
  // Screwdriver poking out of the lid gap
  const shaft = mesh(new CylinderGeometry(0.025, 0.025, 0.4, 12), mat(PALETTE.steel, 0.25, 0.85))
  shaft.rotation.z = -0.7
  body.add(at(shaft, 0.5, 1.12, -0.14))
  const grip = mesh(new CapsuleGeometry(0.06, 0.16, 6, 12), mat(PALETTE.sun, 0.5))
  grip.rotation.z = -0.7
  body.add(at(grip, 0.33, 0.98, -0.14))

  const face = makeFace(0.26, 1.15)
  at(face.group, 0, 0.46, 0.335)
  body.add(face.group)
  body.add(makeFoot(-0.3, 0.2))
  body.add(makeFoot(0.3, 0.2))

  const right = makeArm([[0.6, 0.5, 0.05], [0.78, 0.4, 0.14], [0.84, 0.24, 0.22]])
  body.add(right.pivot)
  const left = makeArm([[0, 0, 0], [-0.2, -0.1, 0.08], [-0.32, 0.04, 0.18]])
  at(left.pivot, -0.6, 0.52, 0.05)
  body.add(left.pivot)

  return finish('toolbox', body, left.pivot, face, [0.25, 1.4, 0.3])
}

const BUILDERS: Record<CharacterId, () => CharacterRig> = { drill, tape, level, hammer, pencil, toolbox }

export function buildCharacter(id: CharacterId): CharacterRig {
  return BUILDERS[id]()
}

export const CHARACTER_IDS: CharacterId[] = ['drill', 'tape', 'level', 'hammer', 'pencil', 'toolbox']
