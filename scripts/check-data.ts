/** Data-layer smoke check. `npm run check:data`. Not shipped in the bundle. */
const store = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
}

import * as d from '../src/data'

const today = d.todayKey()
const tables = await d.listTables()
const bookings = await d.listBookings(today)
console.log('seeded bookings today:', bookings.length)
console.log('venue audit:', d.auditVenue().length ? d.auditVenue() : 'PASS')

for (const party of [2, 4, 6, 8]) {
  const counts: Record<string, number> = {}
  for (const t of tables) {
    const s = d.tableState(t, today, party, bookings)
    counts[s] = (counts[s] ?? 0) + 1
  }
  console.log(`party ${party}:`, JSON.stringify(counts))
}

const t1 = tables.find((x) => x.id === 'd1')!
console.log('D1 slots for 4:', d.availableSlots(t1, today, 4, bookings).map((s) => d.timeLabel(s)).join(' '))

const full = tables.find((x) => d.tableState(x, today, 2, bookings) === 'full')
if (full) {
  const alt = d.nearestAlternative(full, tables, today, 2, bookings)
  console.log(`full ${full.label} → alt`, alt ? `${alt.table.label} @ ${d.timeLabel(alt.slot)}` : 'none')
} else console.log('no fully-booked 2-top today')

const slots = d.allSlots(today)
console.log('slots/day:', slots.length, 'first', d.timeLabel(slots[0]), 'last', d.timeLabel(slots[slots.length - 1]))
console.log('sitting 4:', d.sittingFor(4), '| sitting 6:', d.sittingFor(6), '| occupancy 6:', d.occupancyMinutes(6))

// Double-book guard: booking a free slot must remove it from availability.
const free = d.availableSlots(t1, today, 4, bookings)[0]
const made = await d.createBooking({
  tableId: t1.id, startsAt: free.toISOString(), durationMin: d.sittingFor(4),
  partySize: 4, guestName: 'Check', phone: '0400 000 000', email: 'c@example.com',
})
const after = await d.listBookings(today)
const stillThere = d.availableSlots(t1, today, 4, after).some((s) => s.getTime() === free.getTime())
console.log('booked', made.id, 'at', d.timeLabel(free), '→ slot still offered?', stillThere, stillThere ? 'FAIL' : 'PASS')
const blocked = d.availableSlots(t1, today, 4, after)
console.log('buffer honoured (no start within 105min after):',
  !blocked.some((s) => { const dt = (s.getTime() - free.getTime()) / 60000; return dt > 0 && dt < 105 }) ? 'PASS' : 'FAIL')
await d.cancelBooking(made.id)
const afterCancel = await d.listBookings(today)
console.log('cancel releases slot:',
  d.availableSlots(t1, today, 4, afterCancel).some((s) => s.getTime() === free.getTime()) ? 'PASS' : 'FAIL')
