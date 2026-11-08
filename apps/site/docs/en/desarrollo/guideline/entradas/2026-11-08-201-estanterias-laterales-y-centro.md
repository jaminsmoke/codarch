---
title: "Side shelves and shaped cabinets"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: every file was stacked on a back shelf and cabinets formed one block in the centre.
The side walls were empty and the cabinets were smooth cubes.

**What changes**:

- Files are split across two shelves hugging the side walls.
- Sheets stand upright, facing the central aisle and showing their edge to the camera.
- Cabinets are centred and, up to five, sit in one visible row.
- Each cabinet gains a top, plinth, front frame and handle; details are not selectable.
- The room grows wider to separate side shelves from the centre.

**Why this way**: the layout uses the three visible walls and keeps a central aisle. The shelf stops
being a poster of sheets; orbiting the camera lets you read the spines. Cabinets read as furniture,
and the central row does not hide the ones behind when there are five.

**Verified**: in Chrome, the root, `scripts` and `packages/ui/src` show side shelves, centred
cabinets and labels; no console errors.

**What remains**: lighting, fine distribution and LOD polish; the animated door is still for later.

**Size**: `room.ts`, the Atlas tests and the plugin documentation.

**Verdict**: done.
