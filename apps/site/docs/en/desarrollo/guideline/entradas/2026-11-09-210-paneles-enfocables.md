---
title: "Focusable panels and text inside the monitor"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: sign and table were canvas labels; text could overflow the panel. The metrics screen
was not selectable for close reading.

**What changes**:

- Sign and table text is clipped to the panel's projected corners.
- Table type scales with panel size on screen.
- Clicking the metrics screen flies smoothly to frame it.
- `Centrar` / `0` / `R` returns to the general room view.
- Panel flight uses the same mechanism as folder flight.

****Why this way**: text must belong to the monitor, not float like HUD. One click reaches detailed
reading without losing the way back to the room.

**Verified**: in Chrome, clicking the table frames it, text stays inside the panel and Centrar returns
to the room; no console errors.

**What remains**: more camera focus targets in the room, lighting and the animated door.

**Size**: `room.ts`, `scene.ts`, tests and documentation.

**Verdict**: done.
