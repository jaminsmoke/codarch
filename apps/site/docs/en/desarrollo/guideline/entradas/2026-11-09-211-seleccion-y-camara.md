---
title: "One click selects, two enter; the camera stays in the room"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: one click on a folder entered its room and one click on a sheet opened the viewer.
Selecting without navigating was impossible. The camera could orbit behind the walls.

**What changes**:

- One click selects folders and sheets.
- Double click on a folder enters its room; double click on a sheet opens the viewer.
- The metrics panel keeps its one-click focus.
- Orbit stays in a front arc (`π ± 1.15`) with a maximum distance.
- `Centrar` returns to the general view.

****Why this way**: selecting and navigating are different gestures. Limiting the arc avoids showing
the outside and keeps the camera inside the room reading.

**Verified**: in Chrome, one click selects without changing rooms, double click enters/opens, orbit
does not cross the back wall and the metrics panel still focuses; no console errors.

**What remains**: more camera focus targets and continued composition and lighting polish.

**Size**: `orbit.ts`, `scene.ts`, `view.tsx`, plugin API, tests and documentation.

**Verdict**: done.
