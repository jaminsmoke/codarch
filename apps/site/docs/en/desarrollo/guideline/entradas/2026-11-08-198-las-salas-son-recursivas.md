---
title: "Atlas rooms are recursive"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: the room put shelves on the side walls and files were seen edge-on. Also, entering a
subfolder did not open its own space.

**What changes**: [ADR 0117](/en/desarrollo/adr/0111-0120/0117-salas-recursivas-y-estanterias/) fixes
the final structure.

- The **overview** only has the repo's first level.
- Every folder opens a **recursive room**.
- Subfolders are **cabinets**; clicking them enters their subroom.
- Shelves are at the back and **sheets face the camera**.
- Cabinets sit in front so they do not cover the sheets.
- The flight in and out remains.

**Why this way**: side shelves made files unreadable and the hierarchy stopped at two levels. Now the
flat map is only the overview and the rest is a tree of rooms.

**Verified**: `scripts` shows its 16 sheets facing forward; `packages/ui/src` shows 5 cabinets and 53
sheets; labels read correctly and there are no console errors.

**What is missing**: polishing walls, light and layout, and adding LOD for very large rooms.

**Size**: `room.ts` and the room arrangement; the overview is unchanged.

**Updated**: the project also becomes a room; see entry 200 and
[ADR 0118](../../adr/0111-0120/0118-el-proyecto-tambien-es-una-sala.md).

**Verdict**: done.
