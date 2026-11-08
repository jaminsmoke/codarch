---
title: "Atlas opens a sheet's code"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: clicking a sheet only selected the file in the app. There was no way to read its code
without leaving the journey.

**What changes**: [ADR 0116](/en/desarrollo/adr/0111-0120/0116-el-visor-de-fichero/) adds `readCode` to
the plugin context and a read-only panel inside Atlas.

- The sheet opens a side panel with the path, numbered lines and the total.
- The panel closes with its button or when the room/map changes.
- Code comes from the same reader as the card; the plugin does not touch the disk or keep a second copy.
- There is no editing or writing: it is a viewer.

**Why this way**: reading code must not change the checksum or open another source of truth. The full
editor, with writing, is another decision.

**Verified**: the new contract passes types and tests; the panel opens when clicking a sheet; the suite
and web build pass.

**What is missing**: the full editor, if decided, and polishing the selected sheet.

**Size**: `readCode` in `@codarch/plugin-api`, the app bridge and the Atlas panel.

**Verdict**: done.
