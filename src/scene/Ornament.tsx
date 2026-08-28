import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import { ornamentRing, ornamentTileGeo } from './geometry'
import { noRaycast } from './shading'

type Props = {
  width: number
  depth: number
  inset?: number
  period?: number
  y: number
  /** The surface underneath — the motif stays within 12% of its lightness (§7). */
  base: Color
  size?: number
}

/**
 * The fine repeating border every reference platform carries (§7). It should be
 * almost invisible at a glance and only resolve on a close look.
 */
export default function Ornament({ width, depth, inset = 0.15, period = 0.4, y, base, size = 0.15 }: Props) {
  const ref = useRef<InstancedMesh>(null)
  const spots = useMemo(() => ornamentRing(width, depth, inset, period), [width, depth, inset, period])
  const geometry = useMemo(() => ornamentTileGeo(size), [size])
  const material = useMemo(
    () => new MeshBasicMaterial({ color: base }),
    [base],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    spots.forEach(([x, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [spots, y])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, spots.length]}
      raycast={noRaycast}
      frustumCulled={false}
    />
  )
}
