import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three'
import { fixtures, sizeOf, type Table } from '../data'
import { toScene } from './geometry'
import { SHADOW_OFFSET, SHADOW_OPACITY, floorHeightAt } from './layout'
import { hex } from './palette'
import { noRaycast } from './shading'

/**
 * Shadows are one flat polygon per object, offset in a single global direction,
 * ink at 10%, hard-edged (§6). Not a shadow map — the scene has no lights.
 *
 * The offset is fixed in *world* space, so it is counter-rotated into the room's
 * local space as the room turns. Every shadow in the scene falls the same way on
 * screen, exactly like the face shading.
 */
export default function Shadows({ tables, quarter }: { tables: Table[]; quarter: number }) {
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
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

  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; y: number; w: number; d: number }> = []
    for (const t of tables) {
      const { w, d } = sizeOf(t)
      const [x, z] = toScene(t.x, t.y)
      out.push({ x, z, y: floorHeightAt(t.y), w: w + 0.2, d: d + 0.2 })
    }
    for (const f of fixtures) {
      const [x, z] = toScene(f.x, f.y)
      out.push({ x, z, y: floorHeightAt(f.y), w: f.w, d: f.d })
    }
    return out
  }, [tables])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    // Counter-rotate the global offset into the room's own frame.
    const q = ((quarter % 4) + 4) % 4
    const [ox, oz] = SHADOW_OFFSET
    const local: [number, number] =
      q === 1 ? [-oz, ox] : q === 2 ? [-ox, -oz] : q === 3 ? [oz, -ox] : [ox, oz]

    const dummy = new Object3D()
    items.forEach((it, i) => {
      dummy.position.set(it.x + local[0], it.y + 0.006, it.z + local[1])
      dummy.scale.set(it.w, 1, it.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [items, quarter])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      raycast={noRaycast}
      frustumCulled={false}
      renderOrder={1}
    />
  )
}
