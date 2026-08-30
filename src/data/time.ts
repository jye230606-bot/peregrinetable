import { VENUE_TZ, service } from './venue'
import type { DateKey } from './types'

/** Venue-local time helpers. Everything the app shows is venue-local. */

const pad = (n: number) => String(n).padStart(2, '0')

export function dateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const venueDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: VENUE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Which of the venue's days an instant falls on, regardless of where the code
 * is running. The browser's own clock is usually the same thing for a guest
 * standing in Melbourne; a server in UTC is not, which is why anything that
 * files or filters by date has to use this rather than `dateKey`.
 */
export function venueDateKey(d: Date): DateKey {
  return venueDay.format(d)
}

export function todayKey(): DateKey {
  return dateKey(new Date())
}

/** 'YYYY-MM-DD' + 'HH:MM' → a local Date. */
export function at(key: DateKey, hhmm: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}

export function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000)
}

export function timeLabel(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function dateLabel(key: DateKey): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function shiftDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + days))
}

export type Period = 'lunch' | 'dinner'

export const periods: Period[] = ['lunch', 'dinner']

export function periodRange(key: DateKey, period: Period): [Date, Date] {
  const [from, to] = service.serviceHours[period].split('–')
  return [at(key, from), at(key, to)]
}

/** Which service period a moment falls in, or null if the venue is shut. */
export function periodOf(when: Date): Period | null {
  const key = dateKey(when)
  for (const p of periods) {
    const [start, end] = periodRange(key, p)
    if (when >= start && when < end) return p
  }
  return null
}

/** Every bookable start time in a period, on the slot grid. */
export function slotsIn(key: DateKey, period: Period): Date[] {
  const [start, end] = periodRange(key, period)
  const out: Date[] = []
  for (let t = start; t < end; t = addMinutes(t, service.slotMinutes)) out.push(t)
  return out
}

export function allSlots(key: DateKey): Date[] {
  return periods.flatMap((p) => slotsIn(key, p))
}

/** Sitting length for a party. Large = 5 or more. */
export function sittingFor(partySize: number): number {
  return partySize >= 5 ? service.sittingMinutes.large : service.sittingMinutes.small
}

/** The window a booking actually occupies: sitting plus turnaround buffer. */
export function occupancyMinutes(partySize: number): number {
  return sittingFor(partySize) + service.bufferMinutes
}
