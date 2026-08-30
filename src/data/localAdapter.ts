import type { Booking, DataAdapter, DateKey, NewBooking, Session, Table } from './types'
import { tables } from './venue'
import { at, dateKey, shiftDays, sittingFor, todayKey } from './time'
import { BookingRejected, checkBooking, sanitise } from './rules'

/**
 * localStorage-backed adapter. Zero backend: everything lives in the browser,
 * seeded once on first run so the floor plan has something to say.
 *
 * The Supabase adapter slots in here — same DataAdapter shape, swapped in src/data/index.ts.
 */

const KEY_BOOKINGS = 'peacock.bookings.v2'
const KEY_SESSION = 'peacock.session.v1'
const KEY_SEEDED = 'peacock.seeded.v2'

/** A console left open on the pass shouldn't stay signed in overnight. */
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000

/**
 * Placeholder owner auth. Deliberately trivial — a real one replaces it whole,
 * so nothing elaborate is built on top of it. The credentials are the literal
 * words, which is the point: this is a stand-in, not a security boundary.
 */
const OWNER_USERNAME = 'username'
const OWNER_PASSWORD = 'password'

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

/**
 * A hand-authored day rather than a random one. Fifteen bookings across today
 * and tomorrow, clustered on the lunch and dinner peaks, chosen so that any
 * party size lands on a floor plan with a real mix of states rather than a
 * uniformly half-full room.
 */
type SeedRow = [
  day: 0 | 1,
  tableId: string,
  time: string,
  partySize: number,
  guestName: string,
  phone: string,
  email: string,
  notes?: string,
]

const SEED: SeedRow[] = [
  // Today
  [0, 'd1', '12:00', 4, 'Ana Ferreira', '0412 884 201', 'ana.ferreira@example.com', 'Window if possible'],
  [0, 'b5', '12:30', 3, 'Marcus Hale', '0403 771 950', 'm.hale@example.com'],
  [0, 'd5', '13:00', 5, 'Priya Raman', '0431 209 668', 'priya.raman@example.com', 'One high chair'],
  [0, 'c1', '18:00', 7, 'Tom Whitlock', '0455 310 872', 'twhitlock@example.com', 'Birthday — bringing a cake'],
  [0, 'b1', '18:30', 2, 'Sinead Byrne', '0421 664 118', 'sinead.b@example.com'],
  [0, 'd2', '18:30', 4, 'Danny Okafor', '0498 002 745', 'd.okafor@example.com'],
  [0, 'd3', '19:00', 4, 'Rachel Lim', '0417 553 902', 'rachel.lim@example.com', 'Coeliac in the party'],
  [0, 'd4', '19:00', 2, 'Josef Novak', '0466 128 337', 'j.novak@example.com'],
  [0, 'd7', '19:30', 4, 'Bea Consalvi', '0402 917 460', 'bea.c@example.com'],
  [0, 'b3', '20:00', 2, 'Hugh Fairweather', '0439 845 172', 'hugh.f@example.com'],
  // Tomorrow
  [1, 'c2', '12:30', 6, 'Yuki Tanaka', '0425 336 019', 'yuki.tanaka@example.com', 'Regular, likes the courtyard'],
  [1, 'd6', '13:00', 4, 'Nadia Haddad', '0411 728 553', 'nadia.h@example.com'],
  [1, 'b2', '18:00', 2, 'Elliot Marsh', '0409 615 284', 'e.marsh@example.com'],
  [1, 'd5', '19:00', 6, 'Carmen Ruiz', '0434 880 176', 'c.ruiz@example.com'],
  [1, 'c1', '20:00', 8, 'Owen Pryce', '0451 302 947', 'owen.pryce@example.com', 'Long table, one wheelchair'],
]

function seedBookings(): Booking[] {
  const today = todayKey()
  return SEED.map(([day, tableId, time, partySize, guestName, phone, email, notes]) => ({
    id: newReference(),
    tableId,
    startsAt: at(shiftDays(today, day), time).toISOString(),
    durationMin: sittingFor(partySize), // sitting only; the buffer is applied by availability
    partySize,
    guestName,
    phone,
    email,
    notes,
    status: 'confirmed' as const,
  }))
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
    const clean = sanitise(input)
    const violation = checkBooking(clean, all)
    if (violation) throw new BookingRejected(violation)
    const booking: Booking = { ...clean, id: newReference(), status: clean.status ?? 'confirmed' }
    all.push(booking)
    write(KEY_BOOKINGS, all)
    return booking
  },

  async updateBooking(id: string, patch: Partial<Booking>): Promise<Booking> {
    const all = load()
    const i = all.findIndex((b) => b.id === id)
    if (i === -1) throw new Error(`No booking ${id}`)
    const next = { ...all[i], ...sanitise(patch), id: all[i].id }
    // An edit has to satisfy the same rules as a new booking — moving a party
    // onto an occupied slot or a table too small for it is still a bad diary.
    if (next.status === 'confirmed' || next.status === 'seated') {
      const violation = checkBooking(next, all, id)
      if (violation) throw new BookingRejected(violation)
    }
    all[i] = next
    write(KEY_BOOKINGS, all)
    return next
  },

  async cancelBooking(id: string): Promise<Booking> {
    return this.updateBooking(id, { status: 'cancelled' })
  },

  async signIn(username: string, password: string): Promise<Session | null> {
    if (username.trim() !== OWNER_USERNAME || password !== OWNER_PASSWORD) return null
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
    if (session && Date.now() - new Date(session.since).getTime() > SESSION_MAX_AGE_MS) {
      session = null
      try {
        localStorage.removeItem(KEY_SESSION)
      } catch {
        /* ignore */
      }
    }
    return session
  },
}

/** Wipe and re-seed. Wired to nothing in the UI; handy from the console. */
export function resetLocalData() {
  ;[KEY_BOOKINGS, KEY_SEEDED, KEY_SESSION].forEach((k) => localStorage.removeItem(k))
}
