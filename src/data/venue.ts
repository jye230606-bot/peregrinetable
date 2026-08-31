import type { Table } from './types.js'

/**
 * The Peacock, South Yarra — hand-authored floor plan.
 *
 * Origin is the inside face of the front door. x runs right along the front
 * wall, y runs into the room. All values are metres.
 *
 * Synthetic layout standing in for the surveyed one. Every table clears its
 * neighbours' edges by at least 0.9 m and sits at least 0.9 m off any wall;
 * `auditVenue()` at the bottom of this file is the check.
 */

/**
 * The venue's own timezone. A booking belongs to the day it falls on *here*,
 * not wherever a server happens to be running — on Vercel that is UTC, which
 * would file a 9am Melbourne sitting under the previous day.
 */
export const VENUE_TZ = 'Australia/Melbourne'

export const room = {
  width: 11.0, // x
  depth: 15.5, // y
  wallHeight: 3.0,
  wallThickness: 0.22,
} as const

export type Zone = {
  id: string
  name: string
  /** [yStart, yEnd) in metres */
  span: [number, number]
  /** Open to the sky — no ceiling, low parapet instead of full walls. */
  open: boolean
}

export const zones: Zone[] = [
  { id: 'front-bar', name: 'Front bar', span: [0, 5.5], open: false },
  { id: 'dining', name: 'Dining room', span: [5.5, 12], open: false },
  { id: 'courtyard', name: 'Courtyard', span: [12, 15.5], open: true },
]

/** Footprint of a table, in metres. Round tables use `w` as the diameter. */
export const tableSize = {
  2: { w: 0.72, d: 0.72 },
  4: { w: 1.2, d: 0.75 },
  6: { w: 1.8, d: 0.85 },
  8: { w: 2.4, d: 0.95 },
} as const

export function sizeOf(t: Pick<Table, 'seats'>) {
  return tableSize[t.seats as keyof typeof tableSize] ?? tableSize[4]
}

export const tables: Table[] = [
  // --- Front bar -------------------------------------------------------
  { id: 'b1', label: 'B1', seats: 2, shape: 'round', x: 2.3, y: 1.7, rot: 0, zone: 'front-bar' },
  { id: 'b2', label: 'B2', seats: 2, shape: 'round', x: 2.3, y: 3.9, rot: 0, zone: 'front-bar' },
  { id: 'b3', label: 'B3', seats: 2, shape: 'round', x: 5.2, y: 1.7, rot: 0, zone: 'front-bar' },
  { id: 'b4', label: 'B4', seats: 2, shape: 'round', x: 8.1, y: 1.7, rot: 0, zone: 'front-bar' },
  { id: 'b5', label: 'B5', seats: 4, shape: 'rect', x: 7.0, y: 4.2, rot: 0, zone: 'front-bar' },

  // --- Dining room -----------------------------------------------------
  { id: 'd1', label: 'D1', seats: 4, shape: 'rect', x: 2.0, y: 6.9, rot: 0, zone: 'dining' },
  { id: 'd2', label: 'D2', seats: 4, shape: 'rect', x: 4.7, y: 6.9, rot: 0, zone: 'dining' },
  { id: 'd3', label: 'D3', seats: 4, shape: 'rect', x: 7.4, y: 6.9, rot: 0, zone: 'dining' },
  { id: 'd4', label: 'D4', seats: 2, shape: 'round', x: 9.6, y: 6.9, rot: 0, zone: 'dining' },
  { id: 'd5', label: 'D5', seats: 6, shape: 'rect', x: 2.6, y: 9.4, rot: 0, zone: 'dining' },
  { id: 'd6', label: 'D6', seats: 4, shape: 'rect', x: 5.7, y: 9.4, rot: 0, zone: 'dining' },
  { id: 'd7', label: 'D7', seats: 4, shape: 'rect', x: 8.4, y: 9.4, rot: 0, zone: 'dining' },
  { id: 'd8', label: 'D8', seats: 2, shape: 'round', x: 9.3, y: 11.3, rot: 0, zone: 'dining' },

  // --- Courtyard -------------------------------------------------------
  { id: 'c1', label: 'C1', seats: 8, shape: 'rect', x: 3.4, y: 13.6, rot: 0, zone: 'courtyard' },
  { id: 'c2', label: 'C2', seats: 6, shape: 'rect', x: 7.6, y: 13.6, rot: 0, zone: 'courtyard' },
]

/** Non-bookable fixtures. The bar counter runs down the front-bar's left wall. */
export type Fixture = {
  id: string
  kind: 'bar'
  label: string
  x: number
  y: number
  w: number
  d: number
  h: number
}

export const fixtures: Fixture[] = [
  { id: 'bar', kind: 'bar', label: 'Bar', x: 0.35, y: 3.0, w: 0.7, d: 4.0, h: 1.05 },
]

export const service = {
  serviceHours: { lunch: '12:00–15:00', dinner: '17:00–22:00' },
  slotMinutes: 30,
  sittingMinutes: { small: 90, large: 120 }, // large = party of 5+
  bufferMinutes: 15,
} as const

export const MIN_CLEARANCE = 0.9

// ---------------------------------------------------------------------------
// Layout audit. Kept beside the data so the clearance rule is checkable rather
// than asserted; called from the venue tests and safe to call at runtime.
// ---------------------------------------------------------------------------

type Rect = { x0: number; y0: number; x1: number; y1: number }

/** Axis-aligned footprint. Rotation is 90°-snapped, so this stays exact. */
export function footprint(t: Pick<Table, 'seats' | 'rot' | 'x' | 'y'>): Rect {
  const { w, d } = sizeOf(t)
  const turned = Math.round(Math.abs(t.rot) / 90) % 2 === 1
  const hw = (turned ? d : w) / 2
  const hd = (turned ? w : d) / 2
  return { x0: t.x - hw, y0: t.y - hd, x1: t.x + hw, y1: t.y + hd }
}

function gap(a: Rect, b: Rect): number {
  const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0)
  const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0)
  if (dx === 0 && dy === 0) return -1 // overlapping
  return Math.hypot(dx, dy)
}

export function auditVenue(): string[] {
  const problems: string[] = []
  const rects = tables.map((t) => ({ t, r: footprint(t) }))

  for (const { t, r } of rects) {
    const wall = Math.min(r.x0, room.width - r.x1, r.y0, room.depth - r.y1)
    if (wall < MIN_CLEARANCE - 1e-9) {
      problems.push(`${t.label} is ${wall.toFixed(2)} m from a wall (min ${MIN_CLEARANCE})`)
    }
  }

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const g = gap(rects[i].r, rects[j].r)
      if (g < MIN_CLEARANCE - 1e-9) {
        problems.push(
          `${rects[i].t.label}–${rects[j].t.label} clear by ${g.toFixed(2)} m (min ${MIN_CLEARANCE})`,
        )
      }
    }
  }

  for (const f of fixtures) {
    const fr: Rect = { x0: f.x - f.w / 2, y0: f.y - f.d / 2, x1: f.x + f.w / 2, y1: f.y + f.d / 2 }
    for (const { t, r } of rects) {
      const g = gap(fr, r)
      if (g < MIN_CLEARANCE - 1e-9) {
        problems.push(`${t.label}–${f.label} clear by ${g.toFixed(2)} m (min ${MIN_CLEARANCE})`)
      }
    }
  }

  return problems
}
