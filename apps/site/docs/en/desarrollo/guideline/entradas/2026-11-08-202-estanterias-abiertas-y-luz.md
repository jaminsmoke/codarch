---
title: "Open shelves, side light and label LOD"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: side shelves had uprights at the ends that closed the shelf. They sat at mid-depth
and light was flat; labels had no shared ceiling.

**What changes**:

- End caps and uprights are removed; boards, a wall rail and a light strip remain.
- The shelf starts at the room mouth and sheets are ordered from there inwards.
- Two side wall lights and one light per shelf are added.
- The shader adds a soft height light.
- The label budget drops to 64 per room, keeping the priority of beam, selection, folders and sheets.

**Why this way**: an open shelf reveals more sheets; starting at the front brings content closer to
the camera and orders reading. Side lights separate wall and shelf, and LOD keeps a large room from
filling with names.

**Verified**: in Chrome, root, `scripts` and `packages/ui/src` show open shelves ordered from the
front, with side lights and no console errors.

**What remains**: geometry LOD and fine distribution polish. The animated door is still for later.

**Size**: `room.ts`, `scene.ts`, the Atlas tests and documentation.

**Verdict**: done.
