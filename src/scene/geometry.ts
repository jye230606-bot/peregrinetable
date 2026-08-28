import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
} from 'three'
import { room } from '../data'
import { applyQuarter, shade } from './shading'

/**
 * The geometry kit (§5). Rectangular prisms, arch cutouts, crenellations,
 * window slits, 12-sided prisms. Hard edges only — no bevels, no subdivision,
 * no organic curves. Everything here is procedural; the app loads no assets.
 */

/** Venue metres → scene coordinates. Venue y runs into the room, away from the camera. */
export function toScene(x: number, y: number): [number, number] {
  return [x - room.width / 2, room.depth / 2 - y]
}

const geoCache = new Map<string, BufferGeometry>()

function cached(key: string, build: () => BufferGeometry): BufferGeometry {
  let g = geoCache.get(key)
  if (!g) {
    g = shade(build())
    geoCache.set(key, g)
  }
  return g
}

export function boxGeo(w: number, h: number, d: number): BufferGeometry {
  return cached(`box:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d))
}

/** Round tables are 12-sided prisms, never smooth (§5). */
export function prismGeo(radius: number, h: number, sides = 12): BufferGeometry {
  return cached(`prism:${radius}:${h}:${sides}`, () => new CylinderGeometry(radius, radius, h, sides))
}

// --- Walls ------------------------------------------------------------------

export type Hole =
  /** Semicircular arch cutout springing from the floor (§5). */
  | { kind: 'arch'; x: number; width: number; height: number }
  /** Thin vertical window slit, 1:6 (§5). */
  | { kind: 'slit'; x: number; y: number; width: number }

function archPath(h: Hole & { kind: 'arch' }): Shape {
  const r = h.width / 2
  const cx = h.x
  const spring = h.height - r
  const p = new Shape()
  p.moveTo(cx - r, 0)
  p.lineTo(cx - r, spring)
  p.absarc(cx, spring, r, Math.PI, 0, true)
  p.lineTo(cx + r, 0)
  p.lineTo(cx - r, 0)
  return p
}

function slitPath(h: Hole & { kind: 'slit' }): Shape {
  const hh = h.width * 6 // 1:6 ratio
  const p = new Shape()
  p.moveTo(h.x - h.width / 2, h.y)
  p.lineTo(h.x + h.width / 2, h.y)
  p.lineTo(h.x + h.width / 2, h.y + hh)
  p.lineTo(h.x - h.width / 2, h.y + hh)
  p.lineTo(h.x - h.width / 2, h.y)
  return p
}

/**
 * A wall slab standing in the XY plane, extruded through its thickness and
 * centred on the origin. Holes are cut, not faked with overlapping boxes.
 */
export function wallGeo(
  len: number,
  height: number,
  thickness: number,
  holes: Hole[] = [],
): BufferGeometry {
  const key = `wall:${len}:${height}:${thickness}:${JSON.stringify(holes)}`
  return cached(key, () => {
    const outline = new Shape()
    outline.moveTo(0, 0)
    outline.lineTo(len, 0)
    outline.lineTo(len, height)
    outline.lineTo(0, height)
    outline.lineTo(0, 0)
    outline.holes = holes.map((h) => (h.kind === 'arch' ? archPath(h) : slitPath(h)))
    const g = new ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false })
    g.translate(-len / 2, 0, -thickness / 2)
    return g
  })
}

/** A low parapet with regular square notches along its top edge (§5). */
export function parapetGeo(
  len: number,
  base: number,
  merlon: number,
  thickness: number,
  period = 0.62,
  merlonWidth = 0.34,
): BufferGeometry {
  return cached(`parapet:${len}:${base}:${merlon}:${thickness}:${period}:${merlonWidth}`, () => {
    const top: Array<[number, number]> = []
    const hTop = base + merlon
    for (let x = 0; x + period <= len + 1e-6; x += period) {
      top.push([x, hTop], [x + merlonWidth, hTop], [x + merlonWidth, base], [x + period, base])
    }
    if (!top.length) top.push([0, base], [len, base])

    const s = new Shape()
    s.moveTo(0, 0)
    s.lineTo(len, 0)
    for (let i = top.length - 1; i >= 0; i--) s.lineTo(top[i][0], top[i][1])
    s.lineTo(0, 0)

    const g = new ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })
    g.translate(-len / 2, 0, -thickness / 2)
    return g
  })
}

// --- Ornament ---------------------------------------------------------------

/**
 * A repeating diamond border inset from a platform edge (§7). Almost invisible
 * at a glance and only resolving on a close look — high-contrast ornament kills
 * the style instantly, so contrast is capped in `ornamentOf`.
 */
export function ornamentRing(
  width: number,
  depth: number,
  inset: number,
  period = 0.4,
): Array<[number, number]> {
  const x0 = -width / 2 + inset
  const x1 = width / 2 - inset
  const z0 = -depth / 2 + inset
  const z1 = depth / 2 - inset
  const out: Array<[number, number]> = []

  const run = (from: number, to: number, place: (t: number) => [number, number]) => {
    const span = to - from
    const n = Math.max(1, Math.round(span / period))
    const step = span / n
    for (let i = 0; i < n; i++) out.push(place(from + step * (i + 0.5)))
  }

  run(x0, x1, (t) => [t, z0])
  run(x0, x1, (t) => [t, z1])
  run(z0, z1, (t) => [x0, t])
  run(z0, z1, (t) => [x1, t])
  return out
}

/** One ornament tile: a small square set on the diagonal, barely proud of the surface. */
export function ornamentTileGeo(size = 0.15): BufferGeometry {
  return cached(`orn:${size}`, () => {
    const g = new BoxGeometry(size, 0.014, size)
    g.rotateY(Math.PI / 4)
    return g
  })
}

/** Small square inlay tile set flush into a floor (§5). */
export function inlayGeo(size = 0.18): BufferGeometry {
  return cached(`inlay:${size}`, () => new BoxGeometry(size, 0.012, size))
}

/**
 * Repoint every cached geometry at the grouping for the room's current
 * quarter-turn. One call per rotation keeps the dark side of every object in
 * the scene pointing the same way on screen (§2).
 */
export function applyQuarterToAll(quarter: number) {
  for (const g of geoCache.values()) applyQuarter(g, quarter)
}
