import type { ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { currentUser, dateLabel, shiftDays, signOut, todayKey, type DateKey } from '../data'

/**
 * Placeholder session guard. The auth behind it is a stand-in, so nothing
 * elaborate is built on top: it checks for a session and sends you to the
 * login screen if there isn't one.
 */
export function RequireOwner({ children }: { children: ReactNode }) {
  if (!currentUser()) return <Navigate to="/owner/login" replace />
  return <>{children}</>
}

export function OwnerBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <header className="app__bar app__bar--owner">
      <span className="display t-16">The Peacock</span>
      <nav className="owner-nav">
        <Link className={`owner-nav__link${pathname === '/owner' ? ' is-current' : ''}`} to="/owner">
          Run sheet
        </Link>
        <Link
          className={`owner-nav__link${pathname === '/owner/floor' ? ' is-current' : ''}`}
          to="/owner/floor"
        >
          Floor
        </Link>
      </nav>
      <button
        type="button"
        className="btn btn--quiet btn--sm owner-bar__out"
        onClick={async () => {
          await signOut()
          navigate('/owner/login', { replace: true })
        }}
      >
        Sign out
      </button>
    </header>
  )
}

/** Shared date control: previous day, the date itself, next day, and Today. */
export function DateBar({
  date,
  onChange,
  children,
}: {
  date: DateKey
  onChange: (date: DateKey) => void
  children?: ReactNode
}) {
  const today = todayKey()
  return (
    <div className="datebar">
      <button
        type="button"
        className="btn btn--quiet btn--sm"
        onClick={() => onChange(shiftDays(date, -1))}
        aria-label="Previous day"
      >
        <Chevron dir="left" />
      </button>
      <span className="display t-13 datebar__label">{dateLabel(date)}</span>
      <button
        type="button"
        className="btn btn--quiet btn--sm"
        onClick={() => onChange(shiftDays(date, 1))}
        aria-label="Next day"
      >
        <Chevron dir="right" />
      </button>
      {date !== today ? (
        <button type="button" className="btn btn--sm" onClick={() => onChange(today)}>
          Today
        </button>
      ) : null}
      <input
        className="field datebar__date"
        type="date"
        value={date}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="Pick a date"
      />
      <span className="datebar__spacer" />
      {children}
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M9 3 4 8l5 5' : 'M7 3l5 5-5 5'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
