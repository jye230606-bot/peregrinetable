import { Color } from 'three'

/**
 * Palette and the three-value face system (art direction §2, §3).
 *
 * There are no lights in this scene, so light is assigned rather than
 * computed: every solid gets exactly three lightnesses of one hue, and the
 * dark side is the same side for every object in the room.
 *
 * A note on axes. The art direction names the mid face "camera-left (−X)" and
 * the dark face "camera-right (+Z)". With the mandated camera at [20, 20, 20]
 * those letters are the wrong way round — screen-right is world (+X, −Z), so
 * +Z is the camera-left face and +X is the camera-right one. The words and the
 * reference images agree with each other; only the axis letters slipped. We
 * follow the words: camera-left = mid, camera-right = darkest.
 */

export const TOP = 0
export const MID = 1
export const DARK = 2

export type Tone = { top: Color; mid: Color; dark: Color }

const c = (hex: string) => new Color(hex)

export const hex = {
  skyTop: '#BFE0D2',
  skyBottom: '#94C4B4',
  fog: '#B2D9C9',
  ink: '#3A3247',
  marker: '#2E7D7D',
  accent: '#F2C230',
  accentDark: '#D9A61C',
} as const

export const coral: Tone = { top: c('#F79C88'), mid: c('#EE7460'), dark: c('#CE5341') }
export const drained: Tone = { top: c('#D9CABA'), mid: c('#CDBCAA'), dark: c('#BFAB98') }
export const stone: Tone = { top: c('#F6EFE4'), mid: c('#E6DCCC'), dark: c('#D2C6B4') }
export const sky: Tone = { top: c('#CFE8DC'), mid: c('#BFE0D2'), dark: c('#ADD5C5') }

function lerpTone(a: Tone, b: Tone, t: number): Tone {
  return {
    top: a.top.clone().lerp(b.top, t),
    mid: a.mid.clone().lerp(b.mid, t),
    dark: a.dark.clone().lerp(b.dark, t),
  }
}

/** Pull the three values toward their mean lightness — flattens a solid out. */
function compress(tone: Tone, keep: number): Tone {
  const hsl = { h: 0, s: 0, l: 0 }
  const ls: number[] = []
  for (const k of ['top', 'mid', 'dark'] as const) {
    tone[k].getHSL(hsl)
    ls.push(hsl.l)
  }
  const mean = (ls[0] + ls[1] + ls[2]) / 3
  const out = {} as Tone
  ;(['top', 'mid', 'dark'] as const).forEach((k, i) => {
    tone[k].getHSL(hsl)
    out[k] = new Color().setHSL(hsl.h, hsl.s, mean + (ls[i] - mean) * keep)
  })
  return out
}

/** Coral at ~55% saturation — sits between coral and drained (§4). */
export const partly: Tone = lerpTone(coral, drained, 0.45)

/** Fully booked: drained, with the face contrast halved so it lies flat. */
export const booked: Tone = compress(drained, 0.5)

/** Selected: top face takes the accent, sides stay coral (§4). */
export const selected: Tone = { top: c(hex.accent), mid: coral.mid, dark: coral.dark }

/** Ornament sits within 12% lightness of the surface under it (§7). */
export function ornamentOf(base: Color): Color {
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)
  return new Color().setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.075))
}
