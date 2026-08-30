import { apiAdapter, refreshUser } from './apiAdapter'
import { localAdapter } from './localAdapter'
import type { DataAdapter } from './types'

/**
 * The single door to data. Components import from here and never reach for an
 * adapter directly, so swapping the backend is a one-line change.
 *
 * Which adapter is live is decided by configuration, not by code: set
 * `VITE_USE_API=true` and the app talks to the server, where the rules are
 * actually enforced. Without it the browser-only adapter runs, which is the
 * demo build — fine for showing the room, not for holding real guest data.
 */
export const usingApi = import.meta.env?.VITE_USE_API === 'true'

export const data: DataAdapter = usingApi ? apiAdapter : localAdapter

/**
 * Restore the session on boot. Only the server can answer this when the API is
 * live, because the cookie carrying it is deliberately unreadable from script.
 */
export async function restoreSession(): Promise<void> {
  if (usingApi) await refreshUser()
}

export const {
  listTables,
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  signIn,
  signOut,
  currentUser,
} = bind(data)

function bind(a: DataAdapter) {
  return {
    listTables: a.listTables.bind(a),
    listBookings: a.listBookings.bind(a),
    createBooking: a.createBooking.bind(a),
    updateBooking: a.updateBooking.bind(a),
    cancelBooking: a.cancelBooking.bind(a),
    signIn: a.signIn.bind(a),
    signOut: a.signOut.bind(a),
    currentUser: a.currentUser.bind(a),
  }
}

export * from './types'
export * from './availability'
export * from './rules'
export * from './time'
export { room, zones, tables, fixtures, service, sizeOf, footprint, auditVenue } from './venue'
export type { Zone, Fixture } from './venue'
