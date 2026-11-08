---
title: "Atlas goes dark and orders its labels"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: the front room had a light background, and shelves and labels had no clear visual
hierarchy. Distant sheets filled the screen with names.

**What changes**:

- Atlas's own palette: dark background, floor, shelves and panels; sheets keep the map color.
- The room rests on a platform and a back shelf; cabinets sit in front.
- The camera pulls back enough to fit shelves and cabinets.
- Labels for distant files are hidden by on-screen size; the selected file always keeps its label.
- HUD, breadcrumb and code panel use the same dark palette.

**Why this way**: contrast makes sheets and containers readable at a glance; labels stop competing
when there are many sheets.

**Verified**: `scripts` and `packages/ui/src` show shelves and labels; the viewer still opens; no
console errors.

**What is missing**: more worked walls and lights, finer cabinet distribution and geometry LOD.

**Size**: the plugin palette and CSS, `room.ts` and the label budget in `scene.ts`.

**Verdict**: done.
