---
title: "The metrics table, with columns"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: the back-wall metrics screen was a centred list; readable, but not table-like and
each metric name competed with its value.

**What changes**:

- The screen has a `MÉTRICAS` header.
- Each row aligns the label left and the value right.
- One screen is kept, not four panels.
- The table is still computed from the `RenderModel` and is not selectable.

**Why this way**: a table with columns reads at a glance and leaves air between name and number. It
stays on the wall and hides no architecture.

**Verified**: in Chrome, the root shows the project table and `packages/ui/src` its scope; no console
errors.

**What remains**: adapt width to very long names and keep polishing light and composition.

**Size**: `room.ts`, `scene.ts`, Atlas tests and documentation.

**Verdict**: done.
