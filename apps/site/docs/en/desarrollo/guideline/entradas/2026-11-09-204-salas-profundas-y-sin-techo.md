---
title: "Deep rooms, open above and cabinets at the back"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: rooms were wide and shallow; the ceiling closed the top and added nothing. Cabinets
stood in front and the back stayed empty.

**What changes**:

- The ceiling is removed; side walls, back wall, beam and light strips remain.
- Depth is at least 65 % of width, with 20 units of floor.
- The cabinet grid is anchored to the back wall; extra rows grow towards the camera.
- The side shelf stays at the front, so the route is shelf, aisle and back.

**Why this way**: a squarer plan without a lid gives a sense of room and travel. Cabinets at the back
free the aisle and use the wall that did nothing before.

**Verified**: in Chrome, root, `scripts` and `packages/ui/src` show deeper rooms, no ceiling, cabinets
at the back and shelves in front; no console errors.

**What remains**: fine central aisle and angle LOD. The animated door is still for later.

**Size**: `room.ts`, Atlas tests and documentation.

**Verdict**: done.
