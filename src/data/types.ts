/** Domain types. Spatial values are metres from the venue origin — never pixels. */

export type TableShape = 'round' | 'rect'

export type Table = {
  id: string
  label: string
  seats: number
  shape: TableShape
  x: number // metres from origin
  y: number // metres from origin
  rot: number // degrees
  zone: string
}

export type BookingStatus = 'confirmed' | 'seated' | 'cancelled' | 'no_show'

export type Booking = {
  id: string
  tableId: string
  startsAt: string // ISO
  durationMin: number
  partySize: number
  guestName: string
  phone: string
  email: string
  notes?: string
  status: BookingStatus
}

/** Everything a caller supplies when making a booking. */
export type NewBooking = Omit<Booking, 'id' | 'status'> & {
  status?: BookingStatus
}

/** Placeholder owner session. Replaced wholesale when a real backend lands. */
export type Session = {
  role: 'owner'
  since: string // ISO
}

export type DateKey = string // 'YYYY-MM-DD', venue-local

export interface DataAdapter {
  listTables(): Promise<Table[]>
  listBookings(date: DateKey): Promise<Booking[]>
  createBooking(input: NewBooking): Promise<Booking>
  updateBooking(id: string, patch: Partial<Booking>): Promise<Booking>
  cancelBooking(id: string): Promise<Booking>
  signIn(passcode: string): Promise<Session | null>
  signOut(): Promise<void>
  currentUser(): Session | null
}
