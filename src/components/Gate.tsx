import { useEffect, useMemo, useState } from 'react'
import {
  bookableSlots,
  dateLabel,
  periodOf,
  shiftDays,
  timeLabel,
  todayKey,
  type DateKey,
} from '../data'

export type GateValue = {
  partySize: number
  date: DateKey
  time: string
}

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]

/**
 * Party size, date, time — in that order, because availability is meaningless
 * without all three. The floor plan does not render until this is answered.
 *
 * Only the time slot takes `--mv-accent` (§8). Party size and date use the
 * primary coral fill instead: §3 keeps the accent to one object at a time, and
 * three yellow chips on one panel would blow the 3% ceiling on their own.
 */
export default function Gate({
  value,
  onSubmit,
  onDismiss,
}: {
  value: GateValue | null
  onSubmit: (value: GateValue) => void
  onDismiss?: () => void
}) {
  const today = todayKey()
  const [partySize, setPartySize] = useState(value?.partySize ?? 0)
  const [date, setDate] = useState<DateKey>(value?.date ?? today)
  const [time, setTime] = useState(value?.time ?? '')

  const slots = useMemo(
    () => (partySize ? bookableSlots(date, partySize) : []),
    [date, partySize],
  )

  // A longer sitting can put the last slots of a service out of reach, so a
  // time chosen for two may not survive a change to a party of seven.
  useEffect(() => {
    if (time && !slots.some((s) => timeLabel(s) === time)) setTime('')
  }, [slots, time])

  const lunch = slots.filter((s) => periodOf(s) === 'lunch')
  const dinner = slots.filter((s) => periodOf(s) === 'dinner')
  const ready = partySize > 0 && !!date && !!time

  return (
    <form
      className="panel gate enter"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onSubmit({ partySize, date, time })
      }}
    >
      <h1 className="display t-22 gate__title">Book a table</h1>
      <p className="t-13 ink-60 gate__lede">
        Tell us who is coming and when. Then pick where you would like to sit.
      </p>

      <hr className="rule" />

      <div className="gate__field">
        <span className="label">How many</span>
        <div className="grid-8">
          {PARTY_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              className={`btn${partySize === n ? ' btn--primary' : ''}`}
              onClick={() => setPartySize(n)}
              aria-pressed={partySize === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="gate__field">
        <span className="label">Which day</span>
        <div className="grid-2">
          {[0, 1].map((offset) => {
            const key = shiftDays(today, offset)
            return (
              <button
                key={key}
                type="button"
                className={`btn${date === key ? ' btn--primary' : ''}`}
                onClick={() => setDate(key)}
                aria-pressed={date === key}
              >
                {offset === 0 ? 'Today' : 'Tomorrow'}
              </button>
            )
          })}
        </div>
        <input
          className="field gate__date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="Or pick another date"
        />
      </div>

      <div className="gate__field">
        <span className="label">What time</span>
        {partySize === 0 ? (
          <p className="t-13 ink-45">Choose a party size first.</p>
        ) : (
          <>
            {[
              ['Lunch', lunch],
              ['Dinner', dinner],
            ].map(([name, list]) => {
              const times = list as Date[]
              if (!times.length) return null
              return (
                <div key={name as string} className="gate__service">
                  <span className="t-11 display ink-45">{name as string}</span>
                  <div className="grid-4">
                    {times.map((s) => {
                      const label = timeLabel(s)
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`btn${time === label ? ' btn--selected' : ''}`}
                          onClick={() => setTime(label)}
                          aria-pressed={time === label}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {!lunch.length && !dinner.length ? (
              <p className="t-13 ink-45">
                No sitting that long fits inside a service on {dateLabel(date)}.
              </p>
            ) : null}
          </>
        )}
      </div>

      <hr className="rule" />

      <div className="gate__actions">
        {onDismiss ? (
          <button type="button" className="btn btn--quiet" onClick={onDismiss}>
            Cancel
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btn btn--primary" disabled={!ready}>
          See the room
        </button>
      </div>
    </form>
  )
}
