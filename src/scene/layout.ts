import { room } from '../data'

/** Scene composition constants, all in metres. Derived from the venue footprint. */

export const PLATFORM_MARGIN = 0.55
export const PLATFORM_THICK = 0.36
export const CASE_MARGIN = 0.8
export const CASE_THICK = 0.42
export const CASE_HEIGHT = 5.4
export const CASE_SECTION = 0.26

export const platformW = room.width + PLATFORM_MARGIN * 2
export const platformD = room.depth + PLATFORM_MARGIN * 2
export const caseW = platformW + CASE_MARGIN * 2
export const caseD = platformD + CASE_MARGIN * 2

export const halfX = room.width / 2
export const halfZ = room.depth / 2

/** Venue y of the courtyard threshold — walls step down to a parapet past it. */
export const COURTYARD_Y = 12
export const PARAPET_BASE = 0.72
export const PARAPET_MERLON = 0.2

/** The courtyard is a raised terrace, reached by two treads (§5). */
export const TERRACE_H = 0.24
export const TREAD_H = 0.12
export const TREAD_DEPTH = 0.3

/** Floor height under a point, in metres. Flat inside, a terrace outdoors. */
export function floorHeightAt(venueY: number): number {
  return venueY >= COURTYARD_Y ? TERRACE_H : 0
}

/**
 * Is a face pointing between the room and the camera? Used to drop the two near
 * walls and the two near rails of the case, so every one of the four snapped
 * views looks into the room rather than at the back of a slab.
 */
export function facesCamera(normal: [number, number], quarter: number): boolean {
  const [x, z] = normal
  const q = ((quarter % 4) + 4) % 4
  const w: [number, number] =
    q === 1 ? [z, -x] : q === 2 ? [-x, -z] : q === 3 ? [-z, x] : [x, z]
  return w[0] + w[1] > 0.1
}

export const TABLE_HEIGHT = 0.75
export const PLINTH_HEIGHT = 0.08
export const HOVER_LIFT = 0.06

/** Shadows are one flat polygon per object, offset in a single global direction (§6). */
export const SHADOW_OFFSET: [number, number] = [0.3, 0.12]
export const SHADOW_OPACITY = 0.1

export const FOG_NEAR = 27
export const FOG_FAR = 68

export const ZOOM_MIN = 0.6
export const ZOOM_MAX = 1.8
