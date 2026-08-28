import type { Booking, DataAdapter, DateKey, NewBooking, Session, Table } from './types'
import { tables } from './venue'
import { at, dateKey, occupancyMinutes, shiftDays, sittingFor, todayKey } from './time'

/**
 * localStorage-backed adapter. Zero backend: everything lives in the browser,
 * seeded once on first run so the floor plan has something to say.
 *
 * The Supabase adapter slots in here — same DataAdapter shape, swapped in src/data/index.ts.
 */

const KEY_BOOKINGS = 'peacock.bookings.v1'
const KEY_SESSION = 'peacock.session.v1'
const KEY_SEEDED = 'peacock.seeded.v1'

/** Placeholder owner auth. Deliberately trivial — a real one replaces it whole. */
const OWNER_PASSCODE = '2468'

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1

function newReference(): string {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length]
  return `PK-${out}`
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode, quota — the app still works, it just forgets */
  }
}

// --- Seed ------------------------------------------------------------------

const SEED_NAMES: Array<[string, string, string]> = [
  ['Ana Ferreira', '0412 884 201', 'ana.ferreira@example.com'],
  ['Marcus Hale', '0403 771 950', 'm.hale@example.com'],
  ['Priya Raman', '0431 209 668', 'priya.raman@example.com'],
  ['Tom Whitlock', '0455 310 872', 'twhitlock@example.com'],
  ['Sinead Byrne', '0421 664 118', 'sinead.b@example.com'],
  ['Danny Okafor', '0498 002 745', 'd.okafor@example.com'],
  ['Rachel Lim', '0417 553 902', 'rachel.lim@example.com'],
  ['Josef Novak', '0466 128 337', 'j.novak@example.com'],
  ['Bea Consalvi', '0402 917 460', 'bea.c@example.com'],
  ['Hugh Fairweather', '0439 845 172', 'hugh.f@example.com'],
  ['Yuki Tanaka', '0425 336 019', 'yuki.tanaka@example.com'],
  ['Nadia Haddad', '0411 728 553', 'nadia.h@example.com'],
]

const SEED_NOTES = [
  'Window if possible',
  'Birthday — bringing a cake',
  'One high chair',
  'Coeliac in the party',
  '',
  '',
  '',
  'Regular, likes the courtyard',
]

/** Deterministic small PRNG so a reload doesn't reshuffle the room. */
function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedBookings(): Booking[] {
  const out: Booking[] = []
  const rand = mulberry(20250828)
  const today = todayKey()

  // Today plus the next three days, so a guest browsing forward sees a room
  // that empties out rather than one that is uniformly half full.
  const days: Array<[DateKey, number]> = [
    [today, 0.8],
    [shiftDays(today, 1), 0.62],
    [shiftDays(today, 2), 0.4],
    [shiftDays(today, 3), 0.22],
  ]

  let n = 0
  for (const [key, density] of days) {
    for (const table of tables) {
      for (const [period, starts] of [
        ['lunch', ['12:00', '12:30', '13:00', '13:30', '14:00']],
        ['dinner', ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']],
      ] as const) {
        // Dinner runs fuller than lunch, and the courtyard fills first.
        const weight =
          density *
          (period === 'dinner' ? 1 : 0.55) *
          (table.zone === 'courtyard' ? 1.25 : table.zone === 'dining' ? 1 : 0.75)

        const taken: Array<[number, number]> = []
        for (const hhmm of starts) {
          if (rand() > weight * 0.55) continue
          const start = at(key, hhmm)
          const partySize = Math.max(
            1,
            Math.min(table.seats, table.seats - Math.floor(rand() * 2)),
          )
          const span: [number, number] = [
            start.getTime(),
            start.getTime() + occupancyMinutes(partySize) * 60_000,
          ]
          if (taken.some(([s, e]) => span[0] < e && s < span[1])) continue
          taken.push(span)

          const [guestName, phone, email] = SEED_NAMES[n % SEED_NAMES.length]
          const note = SEED_NOTES[Math.floor(rand() * SEED_NOTES.length)]
          out.push({
            id: newReference(),
            tableId: table.id,
            startsAt: start.toISOString(),
            durationMin: sittingFor(partySize), // sitting only; buffer is applied by availability
            partySize,
            guestName,
            phone,
            email,
            notes: note || undefined,
            status: 'confirmed',
          })
          n++
        }
      }
    }
  }
  return out
}

function load(): Booking[] {
  if (!read<boolean>(KEY_SEEDED, false)) {
    const seeded = seedBookings()
    write(KEY_BOOKINGS, seeded)
    write(KEY_SEEDED, true)
    return seeded
  }
  return read<Booking[]>(KEY_BOOKINGS, [])
}

// --- Adapter ---------------------------------------------------------------

let session: Session | null = null

export const localAdapter: DataAdapter = {
  async listTables(): Promise<Table[]> {
    return tables
  },

  async listBookings(date: DateKey): Promise<Booking[]> {
    return load()
      .filter((b) => dateKey(new Date(b.startsAt)) === date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  },

  async createBooking(input: NewBooking): Promise<Booking> {
    const all = load()
    const booking: Booking = { ...input, id: newReference(), status: input.status ?? 'confirmed' }
    all.push(booking)
    write(KEY_BOOKINGS, all)
    return booking
  },

  async updateBooking(id: string, patch: Partial<Booking>): Promise<Booking> {
    const all = load()
    const i = all.findIndex((b) => b.id === id)
    if (i === -1) throw new Error(`No booking ${id}`)
    const next = { ...all[i], ...patch, id: all[i].id }
    all[i] = next
    write(KEY_BOOKINGS, all)
    return next
  },

  async cancelBooking(id: string): Promise<Booking> {
    return this.updateBooking(id, { status: 'cancelled' })
  },

  async signIn(passcode: string): Promise<Session | null> {
    if (passcode.trim() !== OWNER_PASSCODE) return null
    session = { role: 'owner', since: new Date().toISOString() }
    write(KEY_SESSION, session)
    return session
  },

  async signOut(): Promise<void> {
    session = null
    try {
      localStorage.removeItem(KEY_SESSION)
    } catch {
      /* ignore */
    }
  },

  currentUser(): Session | null {
    if (!session) session = read<Session | null>(KEY_SESSION, null)
    return session
  },
}

/** Wipe and re-seed. Wired to nothing in the UI; handy from the console. */
export function resetLocalData() {
  ;[KEY_BOOKINGS, KEY_SEEDED, KEY_SESSION].forEach((k) => localStorage.removeItem(k))
}
