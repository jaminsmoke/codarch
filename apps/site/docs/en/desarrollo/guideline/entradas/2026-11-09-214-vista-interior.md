---
title: "The camera enters the room and can look up"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: the general view orbited from outside. When zoomed in, the camera got near the centre
but still looked at the target, and the vertical stop prevented looking up. Large rooms forced the
camera out.

**What changes**:

- **Centro** (or `C`) anchors the camera inside the room, one third into depth and at eye height.
- Dragging turns on the camera axis, with no exterior arc.
- The entry transition is damped.
- Looking up reaches almost the zenith; the floor stops the camera in the exterior orbit.
- The minimum floor rises to 28 × 22 and rooms can grow.
- `Centrar` and file/folder focus targets leave the anchored view.

**Why this way**: inside the room the camera cannot show the outside, and a larger room is explored
from within instead of seen from far away. The ceiling stays out: that is a depth decision.

**Verified**: in Chrome, Centro enters without a jump, rotation stays inside, the gaze goes up to the
dark sky and `Centrar` returns to the general view; no console errors.

**What remains**: composition and lights for large rooms, more focus targets and the animated door.

**Size**: `orbit.ts`, `scene.ts`, `room.ts`, `view.tsx`, tests and documentation.

**Verdict**: done.
