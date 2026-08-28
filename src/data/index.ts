import { localAdapter } from './localAdapter'
import type { DataAdapter } from './types'

/**
 * The single door to data. Components import from here and never reach for an
 * adapter directly, so swapping the backend is a one-line change.
 *
 * Supabase adapter slots in here: `export const data: DataAdapter = supabaseAdapter`.
 */
export const data: DataAdapter = localAdapter

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
export * from './time'
export { room, zones, tables, fixtures, service, sizeOf, footprint, auditVenue } from './venue'
export type { Zone, Fixture } from './venue'
