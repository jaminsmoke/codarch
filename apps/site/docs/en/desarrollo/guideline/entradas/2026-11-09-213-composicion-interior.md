---
title: "The room fits its content and selection answers"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: with few files, the room kept a tall, empty wall; shelves looked tiny. The selected
folder was not visible in 3D and a selected sheet did not bring the camera closer.

**What changes**:

- Minimum room height drops to 15 and grows with content.
- Shelves use up to three columns per side: more rows and presence.
- Uprights, top rail, mouldings, entrance columns and threshold.
- `selectedFolder` reaches the plugin and the folder is highlighted in the room.
- One click on a sheet selects it and flies to its shelf with context; the viewer stays on double click.

**Why this way**: room scale should follow content, not the other way round. Selection needs a 3D
answer and focusing a sheet must not lose the shelf.

**Verified**: in Chrome, the `scripts` room gains rows and is no longer empty; folder is painted;
selected sheet focuses with the shelf around it; no console errors.

**What remains**: more composition and lights in large rooms, and the rest of the focus targets.

**Size**: `room.ts`, `scene.ts`, `view.tsx`, plugin context, tests and documentation.

**Verdict**: done.
