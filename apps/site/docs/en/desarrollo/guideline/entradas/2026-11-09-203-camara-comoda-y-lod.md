---
title: "Camera at hand, more air and geometry LOD"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: the camera only moved with drag and wheel, with no reset button or shortcuts. The
room felt tight and cabinet details were always drawn.

**What changes**:

- The room gains width, depth and a minimum height; the central row and side shelves move apart.
- **−**, **Centrar** and **+** buttons in the stage.
- `+` / `-` shortcuts to zoom, and `0` or `R` to centre.
- The initial view starts a little higher.
- Cabinet details are marked as `detail`: they are dropped in rooms over 140 boxes or when the camera
  moves away, before bodies, sheets or main furniture.

**Why this way**: centring and zooming must be at hand, including on touch. Air keeps pieces apart and
load-based LOD lightens large rooms without removing content.

**Verified**: in Chrome, root, `scripts` and `packages/ui/src` show more air, camera buttons and open
shelves; no console errors.

**What remains**: distance LOD and fine distribution. The animated door is still for later.

**Size**: `room.ts`, `scene.ts`, `view.tsx`, `orbit.ts`, styles and Atlas tests.

**Verdict**: done.
