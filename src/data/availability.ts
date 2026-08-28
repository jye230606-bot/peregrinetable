import type { Booking, DateKey, Table } from './types'
import { service } from './venue'
import { addMinutes, allSlots, occupancyMinutes, sittingFor } from './time'

/**
 * Availability. One rule, applied everywhere:
 *
 *   a slot is available for a table if no confirmed booking overlaps
 *   [slot, slot + sitting + buffer)
 *
 * Sitting length comes from the party size; cancelled and no-show bookings
 * release their table.
 */

export type TableState = 'available' | 'partly' | 'full' | 'too-small'

const HOLDS_TABLE: Booking['status'][] = ['confirmed', 'seated']

export function holdsTable(b: Booking): boolean {
  return HOLDS_TABLE.includes(b.status)
}

/** The window a booking keeps its table out of circulation. */
export function bookingSpan(b: Booking): [number, number] {
  const start = new Date(b.startsAt).getTime()
  return [start, start + (b.durationMin + service.bufferMinutes) * 60_000]
}

function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

export function isSlotFree(
  slot: Date,
  partySize: number,
  tableBookings: Booking[],
): boolean {
  const want: [number, number] = [
    slot.getTime(),
    slot.getTime() + occupancyMinutes(partySize) * 60_000,
  ]
  return !tableBookings.filter(holdsTable).some((b) => overlaps(want, bookingSpan(b)))
}

export function bookingsFor(tableId: string, bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => b.tableId === tableId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

/** Every start time this table can take this party on this date. */
export function availableSlots(
  table: Table,
  date: DateKey,
  partySize: number,
  bookings: Booking[],
): Date[] {
  if (table.seats < partySize) return []
  const mine = bookingsFor(table.id, bookings)
  // The sitting itself has to finish before the venue shuts; the buffer may
  // run past close, since nobody is seated in it.
  return bookableSlots(date, partySize).filter((slot) => isSlotFree(slot, partySize, mine))
}

/** Slots on this date whose sitting fits inside a service period. */
export function bookableSlots(date: DateKey, partySize: number): Date[] {
  const sitting = sittingFor(partySize)
  return allSlots(date).filter((slot) => withinService(slot, addMinutes(slot, sitting), date))
}

function withinService(start: Date, end: Date, _date: DateKey): boolean {
  // A sitting must sit inside one service period.
  for (const period of ['lunch', 'dinner'] as const) {
    const [from, to] = service.serviceHours[period].split('–')
    const [fh, fm] = from.split(':').map(Number)
    const [th, tm] = to.split(':').map(Number)
    const d = new Date(start)
    const open = new Date(d.getFullYear(), d.getMonth(), d.getDate(), fh, fm)
    const close = new Date(d.getFullYear(), d.getMonth(), d.getDate(), th, tm)
    if (start >= open && end <= close) return true
  }
  return false
}

/**
 * How a table should read on the floor plan. Four states, no legend —
 * the desaturation does the explaining (art direction §4).
 */
export function tableState(
  table: Table,
  date: DateKey,
  partySize: number,
  bookings: Booking[],
): TableState {
  if (table.seats < partySize) return 'too-small'
  const open = availableSlots(table, date, partySize, bookings).length
  if (open === 0) return 'full'
  const total = bookableSlots(date, partySize).length
  // 'Partly' means scarce, not merely 'not empty'. Kept narrow on purpose: if
  // most of the room sat in the middle band the floor plan would read as one
  // flat value, and the desaturation would stop explaining anything (§4).
  return open <= Math.max(2, total * 0.25) ? 'partly' : 'available'
}

/** Nearest alternative to a table that cannot take the party — never a dead click. */
export function nearestAlternative(
  from: Table,
  tables: Table[],
  date: DateKey,
  partySize: number,
  bookings: Booking[],
  near?: Date,
): { table: Table; slot: Date } | null {
  const candidates = tables
    .filter((t) => t.id !== from.id && t.seats >= partySize)
    .map((t) => ({ t, slots: availableSlots(t, date, partySize, bookings) }))
    .filter((c) => c.slots.length > 0)

  if (!candidates.length) return null

  const target = near?.getTime() ?? new Date(`${date}T19:00:00`).getTime()

  let best: { table: Table; slot: Date; cost: number } | null = null
  for (const { t, slots } of candidates) {
    // Distance in metres, then distance in time — same zone and a close time
    // beats a perfect time across the room.
    const metres = Math.hypot(t.x - from.x, t.y - from.y)
    for (const slot of slots) {
      const minutes = Math.abs(slot.getTime() - target) / 60_000
      const cost = minutes + metres * 6 + (t.zone === from.zone ? 0 : 30)
      if (!best || cost < best.cost) best = { table: t, slot, cost }
    }
  }
  return best ? { table: best.table, slot: best.slot } : null
}

/** What a table is doing right now / next — for the owner floor view. */
export function currentOrNext(
  tableId: string,
  bookings: Booking[],
  now = new Date(),
): Booking | null {
  const mine = bookingsFor(tableId, bookings).filter(holdsTable)
  const t = now.getTime()
  const live = mine.find((b) => {
    const [s, e] = bookingSpan(b)
    return t >= s && t < e
  })
  if (live) return live
  return mine.find((b) => new Date(b.startsAt).getTime() >= t) ?? mine[mine.length - 1] ?? null
}
