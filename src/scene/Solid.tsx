import { useMemo } from 'react'
import type { BufferGeometry, Euler, Vector3Tuple } from 'three'
import { materialsFor, noRaycast } from './shading'
import type { Tone } from './palette'

type Props = {
  geometry: BufferGeometry
  toneKey: string
  tone: Tone
  position?: Vector3Tuple
  rotation?: Euler | [number, number, number]
  visible?: boolean
}

/** One solid, carrying the three-value materials array (§2). Never clickable. */
export default function Solid({ geometry, toneKey, tone, position, rotation, visible }: Props) {
  const materials = useMemo(() => materialsFor(toneKey, tone), [toneKey, tone])
  return (
    <mesh
      geometry={geometry}
      material={materials}
      position={position}
      rotation={rotation as never}
      visible={visible}
      raycast={noRaycast}
    />
  )
}
