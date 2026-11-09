---
title: "Central aisle and angle LOD"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: the deep room left an unguided central aisle and cabinet details kept drawing even
when the camera moved away from the front.

**What changes**:

- Two light floor lines cross the aisle between the front shelf and the back cabinets, leaving the
  tiles visible.
- Runner width adapts to room width, with minimum and maximum.
- Detail LOD adds angle: details are dropped when the camera moves more than 0.65 radians away from
  the front, in addition to load and distance.

****Why this way**: the guide orders the route without hiding anything. Angle matters because front
cabinet details stop reading from the side; hiding them avoids geometry that adds nothing.

**Verified**: in Chrome, root, `scripts` and `packages/ui/src` show the aisle and LOD while orbiting
and zooming; no console errors.

**What remains**: lighting and angle distribution polish. The animated door is still for later.

**Size**: `room.ts`, `scene.ts`, Atlas tests and documentation.

**Verdict**: done.
