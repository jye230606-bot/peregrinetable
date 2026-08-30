import type { Booking, NewBooking, Table } from './types'
import { bookingSpan, bookingsFor, holdsTable } from './availability'
import { occupancyMinutes } from './time'
import { tables } from './venue'

/**
 * The rules a booking has to satisfy, in one place and independent of where
 * they run.
 *
 * These deliberately do not live in the form. A form can only stop the person
 * looking at it; the diary has to hold whichever way the write arrives — guest
 * flow, owner edit, or a future API handler. When the backend lands it imports
 * this module unchanged and enforces the same rules server-side, which is the
 * only place enforcement actually counts.
 */

export type Violation = {
  code: 'unknown-table' | 'too-small' | 'double-booked' | 'bad-field'
  message: string
}

/** Field caps, so a single booking can't be used to fill a store. */
export const LIMITS = {
  guestName: 80,
  phone: 32,
  email: 120,
  notes: 400,
  partySize: 12,
} as const

function tableOf(id: string): Table | undefined {
  return tables.find((t) => t.id === id)
}

/**
 * Trim and cap the free-text fields. Returns a clean copy — never mutates, and
 * never trusts a length the client claimed to have enforced.
 */
export function sanitise<T extends Partial<NewBooking>>(input: T): T {
  const out = { ...input }
  if (typeof out.guestName === 'string') out.guestName = out.guestName.trim().slice(0, LIMITS.guestName)
  if (typeof out.phone === 'string') out.phone = out.phone.trim().slice(0, LIMITS.phone)
  if (typeof out.email === 'string') out.email = out.email.trim().slice(0, LIMITS.email)
  if (typeof out.notes === 'string') {
    const notes = out.notes.trim().slice(0, LIMITS.notes)
    out.notes = (notes || undefined) as T['notes']
  }
  return out
}

/**
 * Can this booking stand, given everything else already in the diary?
 * `ignoreId` excludes the booking being edited from its own overlap check.
 */
export function checkBooking(
  candidate: Pick<Booking, 'tableId' | 'startsAt' | 'durationMin' | 'partySize'>,
  existing: Booking[],
  ignoreId?: string,
): Violation | null {
  const table = tableOf(candidate.tableId)
  if (!table) {
    return { code: 'unknown-table', message: `There is no table ${candidate.tableId}.` }
  }

  const size = Number(candidate.partySize)
  if (!Number.isFinite(size) || size < 1 || size > LIMITS.partySize) {
    return { code: 'bad-field', message: `A party of ${candidate.partySize} is not a party size.` }
  }

  const start = new Date(candidate.startsAt)
  if (Number.isNaN(start.getTime())) {
    return { code: 'bad-field', message: 'That is not a valid start time.' }
  }

  if (table.seats < size) {
    return {
      code: 'too-small',
      message: `${table.label} seats ${table.seats}; the party is ${size}.`,
    }
  }

  const want: [number, number] = [
    start.getTime(),
    start.getTime() + occupancyMinutes(size) * 60_000,
  ]

  const clash = bookingsFor(candidate.tableId, existing)
    .filter(holdsTable)
    .filter((b) => b.id !== ignoreId)
    .find((b) => {
      const [s, e] = bookingSpan(b)
      return want[0] < e && s < want[1]
    })

  if (clash) {
    return {
      code: 'double-booked',
      message: `${table.label} is already held from ${new Date(clash.startsAt).toTimeString().slice(0, 5)}.`,
    }
  }

  return null
}

/** Thrown by the adapters so a caller can show the reason rather than a shrug. */
export class BookingRejected extends Error {
  code: Violation['code']
  constructor(violation: Violation) {
    super(violation.message)
    this.name = 'BookingRejected'
    this.code = violation.code
  }
}
