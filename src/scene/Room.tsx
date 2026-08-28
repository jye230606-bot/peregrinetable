import { useMemo } from 'react'
import { Color } from 'three'
import { fixtures, room, zones } from '../data'
import { boxGeo, inlayGeo, parapetGeo, toScene, wallGeo } from './geometry'
import {
  COURTYARD_Y,
  PARAPET_BASE,
  PARAPET_MERLON,
  PLATFORM_THICK,
  TERRACE_H,
  TREAD_DEPTH,
  TREAD_H,
  facesCamera,
  halfX,
  halfZ,
  platformD,
  platformW,
} from './layout'
import { hex, ornamentOf, stone } from './palette'
import { noRaycast } from './shading'
import Ornament from './Ornament'
import Solid from './Solid'

const T = room.wallThickness
const H = room.wallHeight

/** Venue y of the courtyard threshold, in scene z. */
const courtyardZ = halfZ - COURTYARD_Y

export default function Room({ quarter }: { quarter: number }) {
  const courtyardDepth = room.depth - COURTYARD_Y
  const platform = useMemo(() => boxGeo(platformW, PLATFORM_THICK, platformD), [])
  const terrace = useMemo(() => boxGeo(room.width, TERRACE_H, courtyardDepth), [courtyardDepth])
  const tread = useMemo(() => boxGeo(room.width, TREAD_H, TREAD_DEPTH), [])
  const inlay = useMemo(() => inlayGeo(0.18), [])

  const sideLen = COURTYARD_Y
  const sideWall = useMemo(
    () =>
      wallGeo(
        sideLen,
        H,
        T,
        [
          { kind: 'slit', x: sideLen * 0.34, y: 1.35, width: 0.16 },
          { kind: 'slit', x: sideLen * 0.5, y: 1.35, width: 0.16 },
          { kind: 'slit', x: sideLen * 0.66, y: 1.35, width: 0.16 },
        ],
        1,
      ),
    [sideLen],
  )
  const barWall = useMemo(() => wallGeo(sideLen, H, T, [], 1), [sideLen])
  const sideParapet = useMemo(
    () =>
      parapetGeo(room.depth - COURTYARD_Y, PARAPET_BASE, PARAPET_MERLON, T, 0.62, 0.34, 1),
    [],
  )

  const endLen = room.width + T * 2
  const doorWall = useMemo(
    () =>
      wallGeo(endLen, H, T, [
        // Front door. Venue x 6.3, offset by the wall's overhang at x = -T.
        { kind: 'arch', x: 6.3 + T, width: 1.3, height: 2.3 },
        { kind: 'slit', x: 2.1 + T, y: 1.5, width: 0.16 },
        { kind: 'slit', x: 9.6 + T, y: 1.5, width: 0.16 },
      ]),
    [endLen],
  )
  const backParapet = useMemo(() => parapetGeo(endLen, PARAPET_BASE, PARAPET_MERLON, T), [endLen])

  const bar = fixtures[0]
  const barGeo = useMemo(() => boxGeo(bar.w, bar.h, bar.d), [bar.w, bar.h, bar.d])
  const barRail = useMemo(() => boxGeo(0.1, 0.035, bar.d - 0.24), [bar.d])
  const gantry = useMemo(
    () =>
      wallGeo(
        bar.d + 0.5,
        2.1,
        0.14,
        [
          { kind: 'slit', x: (bar.d + 0.5) * 0.3, y: 0.9, width: 0.13 },
          { kind: 'slit', x: (bar.d + 0.5) * 0.5, y: 0.9, width: 0.13 },
          { kind: 'slit', x: (bar.d + 0.5) * 0.7, y: 0.9, width: 0.13 },
        ],
        1,
      ),
    [bar.d],
  )

  const [barX, barZ] = toScene(bar.x, bar.y)
  const floorOrnament = useMemo(() => ornamentOf(stone.top), [])
  const teal = useMemo(() => new Color(hex.marker), [])

  // Zone thresholds, marked with small square inlays set flush into the floor (§5).
  const thresholds = useMemo(
    () =>
      zones
        .slice(1)
        .map((z) => z.span[0])
        .flatMap((y) => {
          // Sit them just short of the threshold so they stay on the lower floor.
          const [, sz] = toScene(0, y - 0.5)
          return [1.7, 3.5, 5.3, 7.1, 8.9].map((x) => {
            const [sx] = toScene(x, 0)
            return [sx, sz] as [number, number]
          })
        }),
    [],
  )

  const showLeft = !facesCamera([-1, 0], quarter)
  const showRight = !facesCamera([1, 0], quarter)
  const showFront = !facesCamera([0, 1], quarter)

  return (
    <group>
      {/* Floor slab, with the recessed rim border every reference platform has (§7) */}
      <Solid
        geometry={platform}
        toneKey="stone"
        tone={stone}
        position={[0, -PLATFORM_THICK / 2, 0]}
      />
      <Ornament width={platformW} depth={platformD} y={0.008} base={floorOrnament} inset={0.16} />

      {/* The courtyard is a raised terrace, reached by two treads each cut as its
          own box so the ribs read in profile (§5) */}
      <Solid
        geometry={terrace}
        toneKey="stone"
        tone={stone}
        position={[0, TERRACE_H / 2, courtyardZ - courtyardDepth / 2]}
      />
      <Solid
        geometry={tread}
        toneKey="stone"
        tone={stone}
        position={[0, TREAD_H / 2, courtyardZ + TREAD_DEPTH / 2]}
      />

      {thresholds.map(([x, z], i) => (
        <mesh key={i} geometry={inlay} position={[x, 0.012, z]} raycast={noRaycast}>
          <meshBasicMaterial color={teal} />
        </mesh>
      ))}

      <Solid
        geometry={barWall}
        toneKey="stone"
        tone={stone}
        position={[-halfX - T / 2, 0, courtyardZ + sideLen / 2]}
        visible={showLeft}
      />
      <Solid
        geometry={sideWall}
        toneKey="stone"
        tone={stone}
        position={[halfX + T / 2, 0, courtyardZ + sideLen / 2]}
        visible={showRight}
      />
      <Solid
        geometry={doorWall}
        toneKey="stone"
        tone={stone}
        position={[0, 0, halfZ + T / 2]}
        visible={showFront}
      />

      {/* Courtyard is open to the sky: crenellated parapets, never full walls (§5) */}
      <Solid
        geometry={sideParapet}
        toneKey="stone"
        tone={stone}
        position={[-halfX - T / 2, TERRACE_H, courtyardZ - courtyardDepth / 2]}
      />
      <Solid
        geometry={sideParapet}
        toneKey="stone"
        tone={stone}
        position={[halfX + T / 2, TERRACE_H, courtyardZ - courtyardDepth / 2]}
      />
      <Solid
        geometry={backParapet}
        toneKey="stone"
        tone={stone}
        position={[0, TERRACE_H, -halfZ - T / 2]}
      />

      {/* Bar counter — a non-bookable fixture, with a teal rail along its lip */}
      <Solid geometry={barGeo} toneKey="stone" tone={stone} position={[barX, bar.h / 2, barZ]} />
      <mesh
        geometry={barRail}
        position={[barX + bar.w / 2 - 0.07, bar.h + 0.017, barZ]}
        raycast={noRaycast}
      >
        <meshBasicMaterial color={teal} />
      </mesh>
      {/* The back-bar is a relief on the left wall, so it goes when that wall does */}
      <Solid
        geometry={gantry}
        toneKey="stone"
        tone={stone}
        position={[-halfX + 0.07, 0, barZ]}
        visible={showLeft}
      />
    </group>
  )
}
