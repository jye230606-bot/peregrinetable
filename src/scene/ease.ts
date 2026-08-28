/** cubic-bezier(0.4, 0.0, 0.2, 1) — the one easing curve in the app (§9). */

const C1X = 0.4
const C1Y = 0.0
const C2X = 0.2
const C2Y = 1.0

const bez = (t: number, a: number, b: number) => {
  const mt = 1 - t
  return 3 * mt * mt * t * a + 3 * mt * t * t * b + t * t * t
}

const dBez = (t: number, a: number, b: number) => {
  const mt = 1 - t
  return 3 * mt * mt * a + 6 * mt * t * (b - a) + 3 * t * t * (1 - b)
}

export function standardEase(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let t = x
  for (let i = 0; i < 6; i++) {
    const err = bez(t, C1X, C2X) - x
    if (Math.abs(err) < 1e-5) break
    const d = dBez(t, C1X, C2X)
    if (Math.abs(d) < 1e-6) break
    t -= err / d
  }
  return bez(Math.min(1, Math.max(0, t)), C1Y, C2Y)
}

export const ROTATE_MS = 520
export const HOVER_MS = 160
