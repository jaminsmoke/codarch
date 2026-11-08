---
title: "Atlas faces front"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: the first Atlas was an aerial plane with a grid. Containers floated above the floor
and the camera looked from above; it was not the atlas being sought.

**What changes**: [ADR 0115](/en/desarrollo/adr/0111-0120/0115-el-atlas-frontal/) reworks the geometry
and the camera.

- The overview is **folder containers on the floor** and **file sheets on shelves**.
- When entering a folder, its **subfolders remain containers** and its files go to the room's shelves.
- The camera is front-facing, with limits that prevent returning to the overhead plane.
- The floor blends into the background and only leaves the grid.
- Breadcrumb and Back still work.
- It works on both maps.

**Why this way**: a folder never becomes a shelf. The container keeps the same reading in the overview
and inside another folder; sheets are always the content.

**Verified**: in Chrome, the overview draws 4 containers and 3 sheets; `packages/ui` opens its room
with 2 containers and 0 sheets. No console errors, WebGL2 active.

**What is missing**: the animated Google Earth transition, labels and the file viewer.

**Size**: the plugin's `room.ts` and `scene.ts`, the front camera and the geometry test.

**Verdict**: done.
