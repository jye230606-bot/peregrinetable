import { useState } from 'react'
import { dateLabel, timeLabel, zones, type Table } from '../data'
import type { GateValue } from './Gate'

export type GuestDetails = {
  guestName: string
  phone: string
  email: string
  notes: string
}

const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id

export default function BookingForm({
  table,
  gate,
  slot,
  busy,
  error,
  onBack,
  onConfirm,
}: {
  table: Table
  gate: GateValue
  slot: Date
  busy: boolean
  error: string | null
  onBack: () => void
  onConfirm: (details: GuestDetails) => void
}) {
  const [details, setDetails] = useState<GuestDetails>({
    guestName: '',
    phone: '',
    email: '',
    notes: '',
  })

  const set = (key: keyof GuestDetails) => (value: string) =>
    setDetails((d) => ({ ...d, [key]: value }))

  const ready =
    details.guestName.trim().length > 1 &&
    details.phone.trim().length > 5 &&
    /.+@.+\..+/.test(details.email.trim())

  return (
    <form
      className="dock__body enter"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready && !busy) onConfirm(details)
      }}
    >
      <header className="dock__head">
        <span className="display t-22">{table.label}</span>
        <span className="t-13 ink-60">
          {zoneName(table.zone)} · {dateLabel(gate.date)} · {timeLabel(slot)} · {gate.partySize}{' '}
          {gate.partySize === 1 ? 'guest' : 'guests'}
        </span>
      </header>

      <hr className="rule" />

      <label className="stack-8">
        <span className="label">Name</span>
        <input
          className="field"
          value={details.guestName}
          onChange={(e) => set('guestName')(e.target.value)}
          autoComplete="name"
          required
        />
      </label>

      <label className="stack-8">
        <span className="label">Phone</span>
        <input
          className="field"
          type="tel"
          value={details.phone}
          onChange={(e) => set('phone')(e.target.value)}
          autoComplete="tel"
          required
        />
      </label>

      <label className="stack-8">
        <span className="label">Email</span>
        <input
          className="field"
          type="email"
          value={details.email}
          onChange={(e) => set('email')(e.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="stack-8">
        <span className="label">Anything we should know</span>
        <textarea
          className="field"
          rows={3}
          value={details.notes}
          onChange={(e) => set('notes')(e.target.value)}
        />
      </label>

      {error ? <p className="t-13 dock__error">{error}</p> : null}

      <div className="dock__actions">
        <button type="button" className="btn btn--quiet" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button type="submit" className="btn btn--primary" disabled={!ready || busy}>
          {busy ? 'Confirming…' : 'Confirm booking'}
        </button>
      </div>
    </form>
  )
}
