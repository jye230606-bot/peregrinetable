import { useLayoutEffect, useMemo, useRef } from 'react'
import { CircleGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three'
import { fixtures, sizeOf, type Table } from '../data'
import { toScene } from './geometry'
import { SHADOW_OFFSET, SHADOW_OPACITY, floorHeightAt } from './layout'
import { hex } from './palette'
import { noRaycast } from './shading'

/**
 * Shadows are one flat polygon per object, offset in a single global direction,
 * ink at 10%, hard-edged (§6). Not a shadow map, not a blur, and not larger than
 * the thing casting it — a polygon padded out on all sides reads as a soft drop
 * shadow, which is the look this style is defined against. Each shadow is the
 * object's own footprint, displaced.
 *
 * The offset is fixed in *world* space, so it is counter-rotated into the room's
 * local frame as the room turns. Every shadow in the scene falls the same way on
 * screen, exactly like the face shading.
 */

type Cast = { x: number; z: number; y: number; w: number; d: number }

export default function Shadows({ tables, quarter }: { tables: Table[]; quarter: number }) {
  const rectRef = useRef<InstancedMesh>(null)
  const roundRef = useRef<InstancedMesh>(null)

  const rectGeo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  // Round tables are 12-sided, so their shadows are too — a square shadow under
  // a 12-gon gives the trick away immediately.
  const roundGeo = useMemo(() => {
    const g = new CircleGeometry(0.5, 12)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(hex.ink),
        transparent: true,
        opacity: SHADOW_OPACITY,
        depthWrite: false,
      }),
    [],
  )

  const { rect, round } = useMemo(() => {
    const rect: Cast[] = []
    const round: Cast[] = []
    for (const t of tables) {
      const { w, d } = sizeOf(t)
      const [x, z] = toScene(t.x, t.y)
      // The plinth is what actually meets the floor, so it casts the shadow.
      const cast: Cast = { x, z, y: floorHeightAt(t.y), w: w + 0.2, d: d + 0.2 }
      ;(t.shape === 'round' ? round : rect).push(cast)
    }
    for (const f of fixtures) {
      const [x, z] = toScene(f.x, f.y)
      rect.push({ x, z, y: floorHeightAt(f.y), w: f.w, d: f.d })
    }
    return { rect, round }
  }, [tables])

  useLayoutEffect(() => {
    const q = ((quarter % 4) + 4) % 4
    const [ox, oz] = SHADOW_OFFSET
    // Counter-rotate the global offset into the room's own frame.
    const local: [number, number] =
      q === 1 ? [-oz, ox] : q === 2 ? [-ox, -oz] : q === 3 ? [oz, -ox] : [ox, oz]

    const dummy = new Object3D()
    const place = (mesh: InstancedMesh | null, items: Cast[]) => {
      if (!mesh) return
      items.forEach((it, i) => {
        dummy.position.set(it.x + local[0], it.y + 0.006, it.z + local[1])
        dummy.scale.set(it.w, 1, it.d)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    place(rectRef.current, rect)
    place(roundRef.current, round)
  }, [rect, round, quarter])

  return (
    <>
      <instancedMesh
        ref={rectRef}
        args={[rectGeo, material, rect.length]}
        raycast={noRaycast}
        frustumCulled={false}
        renderOrder={1}
      />
      <instancedMesh
        ref={roundRef}
        args={[roundGeo, material, round.length]}
        raycast={noRaycast}
        frustumCulled={false}
        renderOrder={1}
      />
    </>
  )
}
