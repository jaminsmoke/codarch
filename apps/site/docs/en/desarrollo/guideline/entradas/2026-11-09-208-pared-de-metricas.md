---
title: "The metrics wall"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: metrics lived only in the inspector. The back wall had the name sign and an empty
space above it.

**What changes**:

- The back wall gets a horizontal screen with a frame, centred above the sign.
- The table shows files, folders, maximum risk and area for the open scope.
- At the root they are project figures; inside a folder, those of its scope.
- The table is not selectable and is computed from the `RenderModel`, without touching the checksum.

****Why this way**: one table with rows reads better than four small panels and keeps file labels from
competing with numbers. The wall stops being decoration and starts informing.

**Verified**: in Chrome, the root shows project figures and `packages/ui/src` shows its scope; no
console errors.

**What remains**: adapt the table to long names and keep polishing composition and light.

**Size**: `metrics.ts`, `room.ts`, `scene.ts`, tests and documentation.

**Verdict**: done.
