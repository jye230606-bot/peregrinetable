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
