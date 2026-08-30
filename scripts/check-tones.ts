/** Palette check: the assigned values, before fog or a JPEG touches them. */
import { Color } from 'three'
import { booked, coral, drained, partly } from '../src/scene/palette'

const hsl = (c: Color) => {
  const o = { h: 0, s: 0, l: 0 }
  c.getHSL(o)
  return o
}

for (const [name, tone] of [
  ['coral', coral],
  ['partly', partly],
  ['drained', drained],
  ['booked (drained, halved)', booked],
] as const) {
  const parts = (['top', 'mid', 'dark'] as const).map((k) => {
    const { h, s, l } = hsl(tone[k])
    return `${k} #${tone[k].getHexString()} h${Math.round(h * 360)} s${Math.round(s * 100)} l${Math.round(l * 100)}`
  })
  console.log(name.padEnd(26), parts.join('  '))
}

const cs = hsl(coral.mid).s
const ps = hsl(partly.mid).s
console.log(`\npartly saturation is ${Math.round((ps / cs) * 100)}% of coral (§4 asks for 55%)`)

const lums = (t: typeof coral) =>
  (['top', 'mid', 'dark'] as const).map((k) => Math.round(hsl(t[k]).l * 100))
const spread = (t: typeof coral) => Math.max(...lums(t)) - Math.min(...lums(t))
console.log(`face lightness spread — coral ${spread(coral)}, drained ${spread(drained)}, booked ${spread(booked)}`)
console.log(`booked contrast is ${Math.round((spread(booked) / spread(drained)) * 100)}% of drained (§4 asks for ~half)`)
