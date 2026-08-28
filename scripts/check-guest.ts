/** Guest-flow state check for the acceptance screenshot. `npm run check:guest`. */
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
console.log('bookings today:', bookings.length, '| tomorrow:', (await d.listBookings(d.shiftDays(today, 1))).length)

for (const [party, time] of [[6, '19:00'], [2, '19:00'], [4, '12:30']] as const) {
  const when = d.at(today, time)
  const counts: Record<string, string[]> = {}
  for (const t of tables) {
    const s = d.tableStateAt(t, when, party, bookings)
    ;(counts[s] ??= []).push(t.label)
  }
  console.log(`\nparty ${party} @ ${time}`)
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(10)} ${v.length}  ${v.join(' ')}`)
}

// The three panel variants for a party of 6 at 19:00
const when = d.at(today, '19:00')
const c1 = tables.find((t) => t.id === 'c1')!
const b1 = tables.find((t) => t.id === 'b1')!
console.log('\nC1 (booked) blockers:', d.blockersFor(c1.id, when, 6, bookings).map((b) => `${d.timeLabel(new Date(b.startsAt))} party ${b.partySize}`).join(', '))
console.log('C1 next free:', (() => { const s = d.nextFreeSlot(c1, today, 6, bookings, when); return s ? d.timeLabel(s) : 'none' })())
console.log('C1 alternatives:', d.alternativesAt(c1, tables, when, 6, bookings, 3).map((t) => t.label).join(', ') || 'none')
console.log('B1 (too small) alternatives:', d.alternativesAt(b1, tables, when, 6, bookings, 3).map((t) => t.label).join(', ') || 'none')
