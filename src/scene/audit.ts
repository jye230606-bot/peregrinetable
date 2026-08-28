import {
  Matrix3,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Vector3,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
} from 'three'
import { DARK, MID, TOP, hex } from './palette'

/**
 * Runtime audit of the art direction's hard rules (§0, §1, §2, §11).
 *
 * These are properties of the scene graph, not of a screenshot: whether a
 * material is unlit, whether a face carries the value its world normal says it
 * should. Reading them off the render is guesswork; reading them off the scene
 * is not. Dev-only — `window.__auditScene()` once the floor plan is up.
 */

export type Audit = {
  name: string
  pass: boolean
  detail: string
}

const BANNED_MAPS = [
  'map',
  'envMap',
  'normalMap',
  'aoMap',
  'lightMap',
  'roughnessMap',
  'metalnessMap',
  'bumpMap',
  'displacementMap',
  'specularMap',
] as const

function materialsOf(o: Object3D): Material[] {
  const m = (o as Mesh).material
  if (!m) return []
  return Array.isArray(m) ? m : [m]
}

/** Average world-space normal of the triangles in one geometry group. */
function groupNormal(mesh: Mesh, start: number, count: number): Vector3 {
  const pos = mesh.geometry.getAttribute('position')
  const nm = new Matrix3().getNormalMatrix(mesh.matrixWorld)
  const acc = new Vector3()
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const n = new Vector3()
  for (let i = start; i < start + count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    n.crossVectors(ab, ac).normalize().applyMatrix3(nm).normalize()
    acc.add(n)
  }
  return acc.divideScalar(Math.max(1, count / 3)).normalize()
}

/** Which value a world normal is supposed to carry (§2). */
function expectedIndex(n: Vector3): number {
  if (n.y > 0.5) return TOP
  return n.z > n.x ? MID : DARK
}

export function auditScene(scene: Scene, camera: Camera): Audit[] {
  scene.updateMatrixWorld(true)
  const out: Audit[] = []

  // --- §0: zero lights -----------------------------------------------------
  let lights = 0
  scene.traverse((o) => {
    if ((o as { isLight?: boolean }).isLight) lights++
  })
  out.push({
    name: 'Zero lights in the scene (§0)',
    pass: lights === 0,
    detail: `${lights} light(s)`,
  })

  // --- §0: MeshBasicMaterial only, no maps ---------------------------------
  const wrongType = new Set<string>()
  const withMaps = new Set<string>()
  let materialCount = 0
  scene.traverse((o) => {
    for (const m of materialsOf(o)) {
      materialCount++
      if (!(m instanceof MeshBasicMaterial)) wrongType.add(m.type)
      for (const key of BANNED_MAPS) {
        if ((m as unknown as Record<string, unknown>)[key]) withMaps.add(`${m.type}.${key}`)
      }
    }
  })
  out.push({
    name: 'MeshBasicMaterial only, no texture maps (§0)',
    pass: wrongType.size === 0 && withMaps.size === 0,
    detail:
      wrongType.size || withMaps.size
        ? `${[...wrongType, ...withMaps].join(', ')}`
        : `${materialCount} materials, all unlit and untextured`,
  })

  // --- §1: orthographic, equal XYZ offset from target ----------------------
  const isOrtho = (camera as OrthographicCamera).isOrthographicCamera === true
  const dir = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  // The view direction must be (-1,-1,-1)/√3: equal on all three axes.
  const equal =
    Math.abs(Math.abs(dir.x) - Math.abs(dir.y)) < 1e-3 &&
    Math.abs(Math.abs(dir.y) - Math.abs(dir.z)) < 1e-3
  const elevation = (Math.asin(-dir.y) * 180) / Math.PI
  out.push({
    name: 'True isometric: orthographic, equal XYZ (§1, check 1)',
    pass: isOrtho && equal,
    detail: `${camera.type}, view dir (${dir.x.toFixed(3)}, ${dir.y.toFixed(3)}, ${dir.z.toFixed(
      3,
    )}), elevation ${elevation.toFixed(3)}° (isometric = 35.264°)`,
  })

  // --- §2: every face carries the value its world normal dictates ----------
  let groups = 0
  let misassigned = 0
  const offenders = new Set<string>()
  scene.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || !Array.isArray(mesh.material) || !mesh.visible) return
    const gs = mesh.geometry.groups
    if (!gs?.length) return
    for (const g of gs) {
      if (!g.count) continue
      groups++
      const n = groupNormal(mesh, g.start, g.count)
      if (expectedIndex(n) !== g.materialIndex) {
        misassigned++
        offenders.add(mesh.name || mesh.geometry.type)
      }
    }
  })
  out.push({
    name: 'Every object darkens on the same side (§2, check 3)',
    pass: misassigned === 0,
    detail:
      misassigned === 0
        ? `${groups} face groups, all carrying the value their world normal dictates`
        : `${misassigned}/${groups} misassigned on ${[...offenders].join(', ')}`,
  })

  // --- §3: the accent belongs to one object at a time ----------------------
  const accent = hex.accent.toLowerCase().replace('#', '')
  const accentMeshes = new Set<Object3D>()
  scene.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || !mesh.visible) return
    for (const m of materialsOf(mesh)) {
      const c = (m as MeshBasicMaterial).color
      if (c && c.getHexString().toLowerCase() === accent) accentMeshes.add(mesh)
    }
  })
  out.push({
    name: 'Accent on at most one object (§3)',
    pass: accentMeshes.size <= 1,
    detail: `${accentMeshes.size} mesh(es) carrying --mv-accent`,
  })

  return out
}
