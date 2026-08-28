import { useMemo } from 'react'
import { boxGeo } from './geometry'
import {
  CASE_HEIGHT,
  CASE_SECTION,
  CASE_THICK,
  PLATFORM_THICK,
  caseD,
  caseW,
  facesCamera,
} from './layout'
import { ornamentOf, sky } from './palette'
import Ornament from './Ornament'
import Solid from './Solid'

/**
 * The signature element (§10). Reference 1 holds its diorama inside a pale
 * mint case with an ornamented inner rim: a tray, four corner posts, and a
 * frame across the top. It reads as a model of the venue in a display case
 * rather than a map — which is the whole reason picking a table spatially
 * beats picking one off a list.
 *
 * Two departures from Reference 1, both forced by this room's proportions.
 * The top is an open frame, not a solid lid: at 11 m × 15.5 m a lid would have
 * to sit ~14 m up to clear the floor plan on screen, and anything lower simply
 * covers the room. And the two rails nearest the camera are dropped, the same
 * way the two nearest walls are — otherwise they cut straight across the plan.
 * What is left is the silhouette of a case with the model visible inside it.
 */
export default function Case({ quarter }: { quarter: number }) {
  const trayTop = -PLATFORM_THICK
  const postTop = trayTop + CASE_HEIGHT
  const railY = postTop + CASE_SECTION / 2

  const px = caseW / 2 - CASE_SECTION / 2
  const pz = caseD / 2 - CASE_SECTION / 2

  const tray = useMemo(() => boxGeo(caseW, CASE_THICK, caseD), [])
  const post = useMemo(() => boxGeo(CASE_SECTION, CASE_HEIGHT, CASE_SECTION), [])
  const railX = useMemo(() => boxGeo(caseW, CASE_SECTION, CASE_SECTION), [])
  const railZ = useMemo(() => boxGeo(CASE_SECTION, CASE_SECTION, caseD - CASE_SECTION * 2), [])

  const rimColour = useMemo(() => ornamentOf(sky.top), [])

  return (
    <group>
      <Solid geometry={tray} toneKey="sky" tone={sky} position={[0, trayTop - CASE_THICK / 2, 0]} />
      <Ornament width={caseW} depth={caseD} y={trayTop + 0.008} base={rimColour} inset={0.34} />

      {([[-px, -pz], [px, -pz], [-px, pz], [px, pz]] as const).map(([x, z]) => (
        <Solid
          key={`${x}:${z}`}
          geometry={post}
          toneKey="sky"
          tone={sky}
          position={[x, trayTop + CASE_HEIGHT / 2, z]}
          // The single nearest post stands between the camera and the room.
          visible={!facesCamera([Math.sign(x), Math.sign(z)], quarter)}
        />
      ))}

      <Solid
        geometry={railX}
        toneKey="sky"
        tone={sky}
        position={[0, railY, -pz]}
        visible={!facesCamera([0, -1], quarter)}
      />
      <Solid
        geometry={railX}
        toneKey="sky"
        tone={sky}
        position={[0, railY, pz]}
        visible={!facesCamera([0, 1], quarter)}
      />
      <Solid
        geometry={railZ}
        toneKey="sky"
        tone={sky}
        position={[-px, railY, 0]}
        visible={!facesCamera([-1, 0], quarter)}
      />
      <Solid
        geometry={railZ}
        toneKey="sky"
        tone={sky}
        position={[px, railY, 0]}
        visible={!facesCamera([1, 0], quarter)}
      />
    </group>
  )
}
