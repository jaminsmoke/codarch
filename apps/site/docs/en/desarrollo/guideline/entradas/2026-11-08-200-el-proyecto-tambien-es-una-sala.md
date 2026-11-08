---
title: "The project is also a room"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: the first level was drawn as a flat overview, different from rooms. The project had
no walls, ceiling or beam, and its camera framed differently.

**What changes**:

- The project becomes the first room; first-level containers are its cabinets.
- Every scale shares floor, walls, ceiling, baseboards, panels and light strip.
- The front stays open, with a beam crossing it near the top.
- The beam carries the room sign: `Proyecto` at the root and the folder name elsewhere.
- The frame includes the beam and sign even in tall rooms.
- The special `overview` case is removed from `buildRoom`.

**Why this way**: one geometry keeps the first level from being an exception and makes entering a
folder the same gesture at any depth. The beam gives a name and scale without closing the front or
hiding the shelves.

**Verified**: in Chrome, the root, `scripts` and `packages/ui/src` render as rooms with their beam
and sign; containers and sheets keep their reading; no console errors.

**What remains**: distribution, lighting and LOD polish. The animated entrance door, in the style of
Resident Evil, comes later.

**Size**: `room.ts`, `scene.ts`, the Atlas tests and the plugin documentation.

**Verdict**: done.
