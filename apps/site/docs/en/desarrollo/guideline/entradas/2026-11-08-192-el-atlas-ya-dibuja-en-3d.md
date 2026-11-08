---
title: "Atlas is now a plugin that draws in 3D"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: only the bars 3D view existed. Atlas was an idea in
[ADR 0113](/en/desarrollo/adr/0111-0120/0113-el-atlas-es-un-plugin/), not a view.

**What changes**: `plugins/atlas` is born, a plugin separate from `vista-3d`.

- It fills the **whole central map stage**.
- It draws a 3D aerial view with a reference grid, folder containers with edges
  and file cubes. Folders open by level of detail as the camera gets closer.
- Selection and focus stay in sync with the app.
- It works on **both maps**: code and documents/configuration. Switching maps
  keeps the plugin view and rebuilds it with the new model.
- If the plugin is off, or the machine has no WebGL2, the classic map remains.

**Why this way**: Atlas is another metaphor, not a skin of the bars view. As a
plugin it can be enabled and disabled, does not bloat the core and its renderer
is loaded on demand.

**Verified**: in the browser, the code map draws 714 files and 74 containers;
the documents map draws 770 files and 60 containers. The console has no errors
and both maps keep showing Atlas when switching. The suite, typecheck and web
build pass.

**What is missing**: entering and leaving a folder with a camera transition,
readable labels by level, file detail, corridors and shelves.

**Size**: the whole `plugins/atlas`, its registration in `.codarch.yml` and the
continuity of the view when switching maps.

**Verdict**: done.
