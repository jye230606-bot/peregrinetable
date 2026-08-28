import { useMemo } from 'react'
import {
  alternativesAt,
  availableSlots,
  blockersFor,
  nextFreeSlot,
  sittingWindow,
  timeLabel,
  zones,
  type Booking,
  type SlotState,
  type Table,
} from '../data'
import type { GateValue } from './Gate'

const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id

function TableHead({ table }: { table: Table }) {
  return (
    <header className="dock__head">
      <span className="display t-22">{table.label}</span>
      <span className="t-13 ink-60">
        {zoneName(table.zone)} · seats {table.seats}
      </span>
    </header>
  )
}

function Alternatives({
  tables,
  onPick,
  heading,
}: {
  tables: Table[]
  onPick: (t: Table) => void
  heading: string
}) {
  if (!tables.length) {
    return <p className="t-13 ink-45">Nothing else is free at that time. Try another time.</p>
  }
  return (
    <>
      <span className="label">{heading}</span>
      <div className="stack-8">
        {tables.map((t) => (
          <button key={t.id} type="button" className="btn row-btn" onClick={() => onPick(t)}>
            <span>{t.label}</span>
            <span className="ink-60">
              {zoneName(t.zone)} · seats {t.seats}
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

export default function TablePanel({
  table,
  state,
  gate,
  chosenAt,
  bookings,
  tables,
  pickedSlot,
  onPickSlot,
  onPickTable,
  onContinue,
}: {
  table: Table
  state: SlotState
  gate: GateValue
  chosenAt: Date
  bookings: Booking[]
  tables: Table[]
  pickedSlot: Date | null
  onPickSlot: (slot: Date) => void
  onPickTable: (table: Table) => void
  onContinue: () => void
}) {
  const slots = useMemo(
    () => availableSlots(table, gate.date, gate.partySize, bookings),
    [table, gate.date, gate.partySize, bookings],
  )

  const alternatives = useMemo(
    () => alternativesAt(table, tables, chosenAt, gate.partySize, bookings, 3),
    [table, tables, chosenAt, gate.partySize, bookings],
  )

  if (state === 'too-small') {
    return (
      <div className="dock__body enter">
        <TableHead table={table} />
        <hr className="rule" />
        <p className="t-13">
          This table seats {table.seats}. Your party is {gate.partySize}, so it will not fit.
        </p>
        <hr className="rule" />
        <Alternatives
          tables={alternatives}
          onPick={onPickTable}
          heading={`Tables that fit at ${gate.time}`}
        />
      </div>
    )
  }

  if (state === 'booked') {
    const blockers = blockersFor(table.id, chosenAt, gate.partySize, bookings)
    const free = nextFreeSlot(table, gate.date, gate.partySize, bookings, chosenAt)
    return (
      <div className="dock__body enter">
        <TableHead table={table} />
        <hr className="rule" />
        <span className="label">Taken at {gate.time}</span>
        <div className="stack-8">
          {blockers.map((b) => {
            const [from, to] = sittingWindow(b)
            return (
              <p key={b.id} className="t-13">
                {timeLabel(from)}–{timeLabel(to)}, party of {b.partySize}
              </p>
            )
          })}
        </div>

        <hr className="rule" />
        {free ? (
          <>
            <span className="label">Next free here</span>
            <button
              type="button"
              className={`btn${pickedSlot?.getTime() === free.getTime() ? ' btn--selected' : ''}`}
              onClick={() => onPickSlot(free)}
            >
              {timeLabel(free)}
            </button>
            {pickedSlot ? (
              <button type="button" className="btn btn--primary dock__cta" onClick={onContinue}>
                Book {table.label} at {timeLabel(pickedSlot)}
              </button>
            ) : null}
          </>
        ) : (
          <p className="t-13 ink-45">This table is not free again today.</p>
        )}

        <hr className="rule" />
        <Alternatives
          tables={alternatives}
          onPick={onPickTable}
          heading={`Free at ${gate.time} instead`}
        />
      </div>
    )
  }

  return (
    <div className="dock__body enter">
      <TableHead table={table} />
      <hr className="rule" />
      <span className="label">Start times</span>
      <div className="grid-3">
        {slots.map((s) => {
          const label = timeLabel(s)
          const isPicked = pickedSlot?.getTime() === s.getTime()
          return (
            <button
              key={label}
              type="button"
              className={`btn${isPicked ? ' btn--selected' : ''}`}
              onClick={() => onPickSlot(s)}
              aria-pressed={isPicked}
            >
              {label}
            </button>
          )
        })}
      </div>
      {pickedSlot ? (
        <button type="button" className="btn btn--primary dock__cta" onClick={onContinue}>
          Book {table.label} at {timeLabel(pickedSlot)}
        </button>
      ) : null}
    </div>
  )
}
