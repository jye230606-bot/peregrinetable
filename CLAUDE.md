# The Peacock — booking system

Table-first restaurant booking. Guest picks a table on an isometric floor
plan, then a time. Owner console manages bookings.

## Visual work

Full art direction: `.claude/rules/art-direction.md`. Read it before writing
any component, material, or stylesheet.

Never, anywhere in this codebase:
- PerspectiveCamera — the scene is orthographic only
- MeshStandardMaterial / MeshPhysicalMaterial — MeshBasicMaterial only
- Any light component. The scene has zero lights.
- box-shadow, backdrop-filter, or border-radius above 3px

## Conventions

- All spatial coordinates in metres, never pixels
- Data access only through `src/data/` adapters, never direct in components

## Not done yet — phone layout

Everything so far is desktop-first. A phone pass is still owed, and these are
the known blockers rather than a vague "make it responsive":

- `.dock` is `flex: 0 0 328px`. At ~390px wide that leaves ~60px for the scene
  and breaks the guest flow. It needs to dock to the bottom edge instead — art
  direction §8 wants panels on one edge and never overlaying the scene, which a
  bottom sheet satisfies and an overlay does not.
- The run sheet is an 8-column table; it has to become one card per booking.
- `.datebar` overflows: a 200px min-width label plus a 168px date input plus
  buttons. Needs to wrap.
- `html, body, #root` use `height: 100%`; should be `100dvh` so mobile browser
  chrome doesn't crop the scene.
- `fit()` in `src/scene/FloorPlan.tsx` frames the room by the wider projected
  span, so a portrait phone gets a small room. Probably wants its own fit
  factor under a breakpoint.
- There is no touch equivalent for hover (§4's bob) or for wheel zoom, and the
  canvas sets `touch-action: none`. Tap-to-select already works.

Re-run the §11 checks at phone width when that lands: `window.__auditScene()`
in dev, plus `npm run check:data`, `check:guest`, `check:tones`.
