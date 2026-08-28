# BUILD.md — v1 build instruction

Read this file top to bottom, then execute it in order. Stop at each **CHECKPOINT** and wait for me before continuing.

---

## Context

Building a table-first restaurant booking system for The Peacock, South Yarra. The guest picks **where** they sit on an isometric floor plan, then **when** — inverting the usual time-slot-first flow. Second surface is an owner console for managing bookings.

Target for this session: something deployed to Vercel that a guest can complete a booking in and an owner can log into. Real venue geometry comes later; synthetic layout is fine today.

---

## Step 0 — Wire up the art direction

There is a markdown file in this repo containing the Monument Valley art direction (search for the string `ART DIRECTION`). Do this first:

1. `mkdir -p .claude/rules`
2. Move that file to `.claude/rules/art-direction.md`
3. Prepend this frontmatter to it, above everything else:

```markdown
---
paths:
  - "src/**/*.{tsx,jsx,ts,css}"
  - "**/*.module.css"
  - "tailwind.config.*"
---
```

4. Create `CLAUDE.md` at the repo root containing:

```markdown
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
```

5. Read `.claude/rules/art-direction.md` in full now. It governs every visual decision that follows.

**CHECKPOINT 0** — tell me the rule is in place and summarise the palette in one line so I know you've read it.

---

## Step 1 — Scaffold

```bash
npm create vite@latest . -- --template react-ts
npm i three @react-three/fiber @react-three/drei react-router-dom
npm i -D tailwindcss @tailwindcss/vite @types/three
```

Also create `vercel.json` at root:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Routes: `/` (guest booking), `/owner/login`, `/owner` (run sheet), `/owner/floor` (owner floor view).

Do **not** set up Supabase or any backend today. See Step 2.

---

## Step 2 — Data layer

Build a swappable adapter so today's build runs with zero backend and Supabase drops in later without touching a component.

`src/data/types.ts`:

```ts
type Table = {
  id: string; label: string; seats: number;
  shape: 'round' | 'rect';
  x: number; y: number;        // metres from origin
  rot: number;                 // degrees
  zone: string;
}

type Booking = {
  id: string; tableId: string;
  startsAt: string;            // ISO
  durationMin: number;
  partySize: number;
  guestName: string; phone: string; email: string;
  notes?: string;
  status: 'confirmed' | 'seated' | 'cancelled' | 'no_show';
}
```

`src/data/index.ts` exports an interface: `listTables`, `listBookings(date)`, `createBooking`, `updateBooking`, `cancelBooking`, `signIn`, `signOut`, `currentUser`.

Implement `src/data/localAdapter.ts` against localStorage, seeded on first run. Export it as the active adapter. Leave a one-line comment where the Supabase adapter will slot in. Every component imports from `src/data`, never from the adapter directly.

Owner auth today: a single hardcoded passcode checked against a constant, session held in memory plus localStorage. It is a placeholder — do not build anything elaborate on top of it.

---

## Step 3 — Venue layout

`src/data/venue.ts`. Hand-author a plausible pub floor plan as data:

- Room footprint 11.0 m × 15.5 m, origin at the inside face of the front door, x runs right, y runs into the room
- Three zones: `front-bar` (y 0–5.5), `dining` (y 5.5–12), `courtyard` (y 12–15.5)
- 15 tables total. Mix: six 2-tops, six 4-tops, two 6-tops, one 8-top in the courtyard
- Round tables for 2-tops, rectangular for everything else
- Minimum 0.9 m clear between any two table edges, and 0.9 m from any wall
- A bar counter in `front-bar` as a non-bookable fixture

Service config in the same file:

```ts
serviceHours: { lunch: '12:00–15:00', dinner: '17:00–22:00' }
slotMinutes: 30
sittingMinutes: { small: 90, large: 120 }   // large = party of 5+
bufferMinutes: 15
```

---

## Step 4 — Isometric scene

`src/scene/`. This is the piece that matters most — build it carefully and follow the art direction exactly.

- `OrthographicCamera` at `[20, 20, 20]`, target origin, `zoom` tuned to frame the room. Equal XYZ, never altered.
- Floor slab, walls as extruded shapes, bar counter, tables generated procedurally from the venue data. No GLTF, no external assets.
- Three-value face shading per the art direction. Same dark side globally.
- Rotation snapped to 90° steps with easing. No free orbit, no tilt.
- Click and hover raycasting on tables only.
- The diorama frame (art direction §10) — build it.

**CHECKPOINT 1** — deploy what exists to Vercel and give me the URL. I want to see the empty room before any booking logic goes in. Do not proceed past this without my sign-off.

---

## Step 5 — Guest flow

Route `/`.

1. **Party size and date first.** The floor plan does not render until both are chosen. Availability is meaningless without them.
2. **Floor plan.** Table states per art direction §4 — available tables saturated coral, fully booked drained to the background beige, partly booked in between, selected picks up the yellow accent. No colour legend anywhere; the desaturation does the explaining.
3. **Click a table** → side panel lists that table's available start times. Tables too small for the party are drained and unclickable, with the reason shown on click.
4. Clicking a fully booked table still opens the panel — show what it's booked for and offer the nearest alternative table with a similar time. Never a dead click.
5. **Details** — name, phone, email, notes. **Confirm** — reference and summary.

Availability maths: a slot is available for a table if no confirmed booking overlaps `[slot, slot + sitting + buffer)`. Sitting length from party size.

Panels dock to one edge as a narrow column. They never overlay the scene.

---

## Step 6 — Owner console

- `/owner/login` — passcode field, nothing else.
- `/owner` — run sheet. Today by default, date picker. Grouped by service period, sorted by time. Columns: time, table, party, name, phone, status, notes. Row actions: mark seated, mark no-show, cancel, edit. Plus a "New booking" action that opens the same flow the guest uses.
- `/owner/floor` — the same scene component as the guest sees, with each table labelled with its next or current booking. Tap a table for that table's full day.

Reuse the scene component. Do not fork it.

---

## Step 7 — Finish

Run every acceptance check in art direction §11 against a screenshot of both the guest floor plan and the owner floor view. Report each as pass or fail. Fix failures before telling me you're done.

Then deploy to Vercel and give me the URL.

---

## Rules for this session

- Work in the order above. Do not jump ahead to polish while logic is missing, and do not skip Step 4's visual work to get features done faster — the look is what the client is paying for.
- If something in this file conflicts with the art direction, the art direction wins on anything visual.
- Do not add features not listed here. Specifically not: SMS or email confirmations, deposits, waitlists, multi-table joins, drag-to-rearrange. They are v2 and I've already scoped them out.
- If you hit a decision I haven't specified, pick the simpler option and note it in your summary rather than stopping.
- Commit at each checkpoint with a short message.
