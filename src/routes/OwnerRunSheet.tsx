import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelBooking,
  listBookings,
  periodOf,
  sittingFor,
  tables,
  timeLabel,
  todayKey,
  updateBooking,
  type Booking,
  type BookingStatus,
  type DateKey,
  BookingRejected,
} from '../data'
import BookingFlow from '../components/BookingFlow'
import { DateBar, OwnerBar } from '../components/OwnerChrome'

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  seated: 'Seated',
  cancelled: 'Cancelled',
  no_show: 'No show',
}

/** Cancelled and no-show rows drain, the same way an unavailable table does. */
const RELEASED: BookingStatus[] = ['cancelled', 'no_show']

const labelOf = (id: string) => tables.find((t) => t.id === id)?.label ?? id

export default function OwnerRunSheet() {
  const [date, setDate] = useState<DateKey>(todayKey())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const refresh = useCallback(async (key: DateKey) => {
    setBookings(await listBookings(key))
  }, [])

  useEffect(() => {
    void refresh(date)
  }, [date, refresh])

  const services = useMemo(() => {
    const groups: Array<[string, Booking[]]> = [
      ['Lunch', []],
      ['Dinner', []],
      ['Outside service', []],
    ]
    for (const b of [...bookings].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
      const p = periodOf(new Date(b.startsAt))
      const i = p === 'lunch' ? 0 : p === 'dinner' ? 1 : 2
      groups[i][1].push(b)
    }
    return groups.filter(([, list]) => list.length)
  }, [bookings])

  const act = async (id: string, patch: Partial<Booking>) => {
    setProblem(null)
    try {
      await updateBooking(id, patch)
    } catch (e) {
      setProblem(e instanceof BookingRejected ? e.message : 'That change did not save.')
    }
    await refresh(date)
  }

  const drop = async (id: string) => {
    setProblem(null)
    try {
      await cancelBooking(id)
    } catch (e) {
      setProblem(e instanceof BookingRejected ? e.message : 'That change did not save.')
    }
    await refresh(date)
  }

  if (creating) {
    return (
      <div className="app">
        <OwnerBar />
        <BookingFlow
          onExit={() => {
            setCreating(false)
            void refresh(date)
          }}
          exitLabel="Back to run sheet"
        />
      </div>
    )
  }

  return (
    <div className="app">
      <OwnerBar />
      <DateBar date={date} onChange={setDate}>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
          New booking
        </button>
      </DateBar>

      <main className="app__body app__body--sheet scroll-y">
        {problem ? (
          <p className="t-13 sheet__problem" role="status">
            {problem}
          </p>
        ) : null}
        {!services.length ? (
          <p className="t-13 ink-45 sheet__empty">Nothing booked for this day.</p>
        ) : (
          services.map(([name, list]) => (
            <section key={name} className="sheet__service">
              <h2 className="display t-13 sheet__heading">
                {name}
                <span className="ink-45"> · {list.length}</span>
              </h2>
              <table className="sheet">
                <thead>
                  <tr>
                    <th className="label">Time</th>
                    <th className="label">Table</th>
                    <th className="label">Party</th>
                    <th className="label">Name</th>
                    <th className="label">Phone</th>
                    <th className="label">Status</th>
                    <th className="label">Notes</th>
                    <th className="label sheet__actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <Row
                      key={b.id}
                      booking={b}
                      editing={editing === b.id}
                      onEdit={() => setEditing(editing === b.id ? null : b.id)}
                      onAct={act}
                      onCancel={drop}
                      onDone={() => setEditing(null)}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}
      </main>
    </div>
  )
}

function Row({
  booking,
  editing,
  onEdit,
  onAct,
  onCancel,
  onDone,
}: {
  booking: Booking
  editing: boolean
  onEdit: () => void
  onAct: (id: string, patch: Partial<Booking>) => Promise<void>
  onCancel: (id: string) => Promise<void>
  onDone: () => void
}) {
  const released = RELEASED.includes(booking.status)
  return (
    <>
      <tr className={released ? 'sheet__row is-released' : 'sheet__row'}>
        <td className="t-13" data-label="Time">{timeLabel(new Date(booking.startsAt))}</td>
        <td className="t-13" data-label="Table">{labelOf(booking.tableId)}</td>
        <td className="t-13" data-label="Party">{booking.partySize}</td>
        <td className="t-13" data-label="Name">{booking.guestName}</td>
        <td className="t-13" data-label="Phone">{booking.phone}</td>
        <td className="t-13" data-label="Status">{STATUS_LABEL[booking.status]}</td>
        <td className="t-13 sheet__notes" data-label="Notes">{booking.notes ?? ''}</td>
        <td className="sheet__actions">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onAct(booking.id, { status: 'seated' })}
            disabled={booking.status === 'seated'}
          >
            Seat
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onAct(booking.id, { status: 'no_show' })}
            disabled={booking.status === 'no_show'}
          >
            No show
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onCancel(booking.id)}
            disabled={booking.status === 'cancelled'}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn--sm${editing ? ' btn--primary' : ''}`}
            onClick={onEdit}
          >
            Edit
          </button>
        </td>
      </tr>
      {editing ? (
        <tr className="sheet__edit-row">
          <td colSpan={8}>
            <EditForm booking={booking} onAct={onAct} onDone={onDone} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function EditForm({
  booking,
  onAct,
  onDone,
}: {
  booking: Booking
  onAct: (id: string, patch: Partial<Booking>) => Promise<void>
  onDone: () => void
}) {
  const start = new Date(booking.startsAt)
  const [guestName, setGuestName] = useState(booking.guestName)
  const [phone, setPhone] = useState(booking.phone)
  const [email, setEmail] = useState(booking.email)
  const [partySize, setPartySize] = useState(String(booking.partySize))
  const [time, setTime] = useState(timeLabel(start))
  const [notes, setNotes] = useState(booking.notes ?? '')
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const size = Math.max(1, Number(partySize) || booking.partySize)
    const [h, m] = time.split(':').map(Number)
    const when = new Date(start)
    when.setHours(h ?? start.getHours(), m ?? start.getMinutes(), 0, 0)
    await onAct(booking.id, {
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      partySize: size,
      startsAt: when.toISOString(),
      // A changed party size changes the sitting length with it.
      durationMin: sittingFor(size),
      notes: notes.trim() || undefined,
    })
    setBusy(false)
    onDone()
  }

  return (
    <form className="edit enter" onSubmit={save}>
      <label className="edit__field">
        <span className="label">Name</span>
        <input className="field" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
      </label>
      <label className="edit__field">
        <span className="label">Phone</span>
        <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className="edit__field">
        <span className="label">Email</span>
        <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="edit__field edit__field--narrow">
        <span className="label">Party</span>
        <input
          className="field"
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
        />
      </label>
      <label className="edit__field edit__field--narrow">
        <span className="label">Time</span>
        <input
          className="field"
          type="time"
          step={1800}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>
      <label className="edit__field edit__field--wide">
        <span className="label">Notes</span>
        <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="edit__actions">
        <button type="button" className="btn btn--sm btn--quiet" onClick={onDone} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
