import { useCallback, useRef, type ReactNode } from 'react'

/**
 * The docked panel column.
 *
 * On a computer this is exactly what it has always been: a fixed-width column
 * on the right edge whose body is always shown. The toggle and the collapsed
 * state exist only under the phone breakpoint, where the column moves above the
 * map and becomes a disclosure — tapping a table drops the menu down and pushes
 * the map further down the page rather than covering it, so the art direction's
 * "panels never overlay the scene" still holds on a phone.
 */

const PHONE = '(max-width: 767px)'

export function isPhone() {
  return typeof window !== 'undefined' && window.matchMedia(PHONE).matches
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useDockScroll() {
  const dock = useRef<HTMLElement>(null)
  const scene = useRef<HTMLDivElement>(null)

  const behavior = () => (prefersReducedMotion() ? ('auto' as const) : ('smooth' as const))

  // Details sit above the map on a phone, so expanding them pushes the table you
  // just tapped off the bottom of the screen. Bring the panel to you instead.
  const revealDock = useCallback(() => {
    if (!isPhone()) return
    requestAnimationFrame(() => dock.current?.scrollIntoView({ behavior: behavior(), block: 'start' }))
  }, [])

  const revealScene = useCallback(() => {
    scene.current?.scrollIntoView({ behavior: behavior(), block: 'start' })
  }, [])

  return { dock, scene, revealDock, revealScene }
}

export default function Dock({
  summary,
  open,
  onToggle,
  onBackToRoom,
  innerRef,
  children,
}: {
  summary: string
  open: boolean
  onToggle: () => void
  onBackToRoom?: () => void
  innerRef?: React.Ref<HTMLElement>
  children: ReactNode
}) {
  return (
    <aside className={open ? 'dock is-open' : 'dock'} ref={innerRef}>
      <button type="button" className="dock__toggle" onClick={onToggle} aria-expanded={open}>
        <span className="dock__toggle-label">{summary}</span>
        <svg
          className="dock__caret"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      {children}

      {onBackToRoom ? (
        <button type="button" className="dock__back" onClick={onBackToRoom}>
          Back to the room
        </button>
      ) : null}
    </aside>
  )
}
