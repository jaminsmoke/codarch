---
title: "Lighter shelves and inside-out filling"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: shelf boards were thick and reached too far into the aisle. Sheets also filled from
the edge closest to the camera inwards.

**What changes**:

- Board thickness drops to 0.08 and depth to 1.25 from the wall.
- The shelf moves towards the deep half of the room.
- Sheets fill from the inner edge of the board towards the front.
- The wall rail and light strip remain, without side uprights.

****Why this way**: less board and less reach leave sheets more visible. Moving the shelf back frees
the room mouth, and inside-out filling follows the natural order of a shelf.

**Verified**: in Chrome, root, `scripts` and `packages/ui/src` show thinner boards, the shelf moved
inwards and sheets ordered from the inside; no console errors.

**What remains**: lighting and fine composition polish. The animated door is still for later.

**Size**: `room.ts`, Atlas tests and documentation.

**Verdict**: done.
