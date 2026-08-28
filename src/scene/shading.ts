import { BufferGeometry, MeshBasicMaterial } from 'three'
import { DARK, MID, TOP, type Tone } from './palette'

/**
 * Assigns the three-value face system to a geometry as geometry groups, so one
 * mesh carries a materials array rather than one material per object (§2).
 *
 * The dark side is fixed in *screen* space, not object space. The room rotates
 * in 90° steps, so we precompute the grouping for all four quarters and swap
 * between them as it turns — that is what keeps every object in the scene
 * darkening on the same side no matter which way the room is facing.
 */

type Group = { start: number; count: number; materialIndex: number }

/** Rotate a normal about Y by q * 90°. */
function turn(q: number, x: number, y: number, z: number): [number, number, number] {
  switch (q & 3) {
    case 1:
      return [z, y, -x]
    case 2:
      return [-x, y, -z]
    case 3:
      return [-z, y, x]
    default:
      return [x, y, z]
  }
}

function bucket(x: number, y: number, z: number): number {
  if (y > 0.5) return TOP // +Y carries the lightest value and any accent
  return z > x ? MID : DARK // camera-left mid, camera-right darkest
}

/**
 * Bakes the four rotation variants onto a geometry. Returns the same geometry,
 * de-indexed so every triangle carries its own face normal (flat shading is
 * the only shading this style has).
 */
export function shade(input: BufferGeometry): BufferGeometry {
  const geo = input.index ? input.toNonIndexed() : input
  if (input.index) input.dispose()

  const pos = geo.getAttribute('position')
  const tris = pos.count / 3
  const variants: Group[][] = [[], [], [], []]

  const nx = new Float32Array(tris)
  const ny = new Float32Array(tris)
  const nz = new Float32Array(tris)

  for (let t = 0; t < tris; t++) {
    const i = t * 3
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i)
    const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1)
    const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2)
    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    let x = uy * vz - uz * vy
    let y = uz * vx - ux * vz
    let z = ux * vy - uy * vx
    const len = Math.hypot(x, y, z) || 1
    x /= len; y /= len; z /= len
    nx[t] = x; ny[t] = y; nz[t] = z
  }

  for (let q = 0; q < 4; q++) {
    const groups = variants[q]
    let runStart = 0
    let runIndex = -1
    for (let t = 0; t < tris; t++) {
      const [x, y, z] = turn(q, nx[t], ny[t], nz[t])
      const b = bucket(x, y, z)
      if (b !== runIndex) {
        if (runIndex !== -1) {
          groups.push({ start: runStart * 3, count: (t - runStart) * 3, materialIndex: runIndex })
        }
        runStart = t
        runIndex = b
      }
    }
    if (runIndex !== -1) {
      groups.push({ start: runStart * 3, count: (tris - runStart) * 3, materialIndex: runIndex })
    }
  }

  geo.userData.quarters = variants
  geo.groups = variants[0]
  return geo
}

/** Point a shaded geometry at the grouping for the room's current quarter. */
export function applyQuarter(geo: BufferGeometry, quarter: number) {
  const variants = geo.userData.quarters as Group[][] | undefined
  if (variants) geo.groups = variants[((quarter % 4) + 4) % 4]
}

// --- Materials --------------------------------------------------------------

const cache = new Map<string, MeshBasicMaterial[]>()

/**
 * The materials array for a tone, in group order [top, mid, dark].
 * MeshBasicMaterial only — the scene has no lights to feed anything else.
 *
 * `flatShading` is a lit-material option and does not exist on MeshBasicMaterial.
 * `shade()` de-indexes every geometry, so each triangle already carries its own
 * face normal and every surface is flat by construction — which is what the
 * flat-shading rule is actually after.
 */
export function materialsFor(key: string, tone: Tone, opacity = 1): MeshBasicMaterial[] {
  const id = `${key}:${opacity}`
  let mats = cache.get(id)
  if (!mats) {
    mats = [tone.top, tone.mid, tone.dark].map(
      (color) =>
        new MeshBasicMaterial({
          color,
          transparent: opacity < 1,
          opacity,
        }),
    )
    mats[TOP].name = `${key}-top`
    mats[MID].name = `${key}-mid`
    mats[DARK].name = `${key}-dark`
    cache.set(id, mats)
  }
  return mats
}

/** Nothing but tables is clickable (§ guest flow) — everything else opts out. */
export const noRaycast = () => null
