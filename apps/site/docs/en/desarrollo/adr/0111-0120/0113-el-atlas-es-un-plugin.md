---
title: "ADR 0113 — Atlas is a plugin, not the 3D view"
description: "Atlas is a new, optional view, separate from the bars 3D view: it fills the whole map stage, draws in 3D from the first slice and works for every map. It is not core and it adds no lenses."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: Atlas is a plugin
  order: 113
---

**Status:** accepted · **Date:** 2026-11-08

**Note:** [ADR 0114](0114-el-atlas-sustituye-a-la-vista-3d.md) removes `vista-3d`; Atlas is the only
3D view in the product.

**Frames** a second view inside the contract of [ADR 0028](0021-0030/0028-los-plugins.md) and follows
the line of [ADR 0055](0051-0060/0055-el-3d-se-dibuja-con-webgl2.md): custom WebGL2, no `three`.

## Context

The current `vista-3d` is a bars view: each file is a box, height says its weight and folders are
closed containers. It works, but its metaphor is not the one Atlas is looking for.

Atlas is something else: a map you travel through in depth, like a geographic atlas. First you see the
whole from above; then you enter a folder and its volumes, shelves and files appear; finally you open a
file and read its code without leaving the journey. Folders read better as containers and files as 3D
objects.

CodArch has two maps today: code, and documents and configuration. Atlas cannot be a view for only
one of them: when the plugin is active, the same experience must work on both.

## Decision

### 1. A new plugin, `atlas`

Atlas lives in `plugins/atlas` and is enabled from settings, like any plugin from
[ADR 0028](0021-0030/0028-los-plugins.md). It is not put inside `vista-3d` and it does not become
core.

- When active, it offers its view in the map's view selector.
- When inactive, or when the machine has no WebGL2, the classic map remains.
- Activation is local, like the other plugins; it does not change the analysis.

`vista-3d` is removed in [ADR 0114](0114-el-atlas-sustituye-a-la-vista-3d.md); two competing 3D views
are not kept. Atlas takes its place.

### 2. It fills the whole map stage

Atlas is painted on the **whole central stage** (`plugin-stage`), not in a card or a small panel. The
app header and sidebars may remain; Atlas's adjacent menus will be designed little by little inside
its view.

The plugin contract is not extended so a plugin can paint the whole app. If Atlas ever needs to replace
the full shell, that will be another decision, with its own ADR. Today the boundary is clear: the app
owns the shell; the plugin owns the map stage.

### 3. It works for every map

The plugin receives the `RenderModel` of the open map. It does not read the code schema on its own, it
has no special path for documents and configuration and it does not keep a second reading of the data.

The same `atlas` must draw:

- the code map;
- the documents and configuration map;
- any future map that uses the same contract.

Acceptance includes both current maps. Switching maps with Atlas active must rebuild the scene, not
keep the previous one.

### 4. The result is 3D from the first slice

There will be no intermediate "2D Atlas" phase that is later thrown away. The first slice is already
3D:

- an aerial view that resembles the treemap, but built with volumes and a camera;
- folders that read as containers;
- files that read as objects inside them;
- a camera that can descend into the interior.

What changes between phases is **depth and detail**, not the nature of the view. The first phase can be
a 3D plane with containers and cubes; the last one adds corridors, shelves, labels and flight. At no
point does it go back to the 2D canvas as the final result.

### 5. No new lenses and no `.codarch/` writes

Atlas derives its space from the model that already exists. It adds no lenses and does not change the
checksum. It does not write to `.codarch/`: camera and view preferences are UI state, like in the other
maps.

Selection, focus, URL and colors are shared with the app. Atlas does not invent a second source of
truth for which file is selected.

### 6. Its own renderer

Atlas draws with WebGL2 and its own renderer. It may reuse ideas and pure modules from `vista-3d` —
camera, picking, LOD — but it does not couple to its scene or its bars metaphor. If both plugins need
the same piece, a small utility is extracted **when the duplication is real**, not before.

Requirements:

- `webgl2: true` in the manifest;
- a clear message and a return to the classic map when WebGL2 is missing;
- draw on demand when the camera is still;
- LOD and culling for large repos;
- no `three`, no full scene runtime.

### 7. Navigation and scope

The first navigation is deliberately contained: orbit, move closer, enter a folder, select a file and
go back. Free flight, corridors and advanced controls come later, when the vertical slice proves the
metaphor works.

It is not a code editor, it is not a game engine and it does not replace the 2D map or `vista-3d`.

## Consequences

- The repo gains `plugins/atlas` with its manifest, view, renderer and tests.
- Atlas is loaded on demand, like `vista-3d`; whoever does not enable it does not pay for its bundle.
- The classic map remains the fallback and the readability reference.
- The app does not need a new shell contract for the first version.
- The checksum and artifacts do not change when the plugin is enabled.
- The plugin documentation and roadmap live in `plugins/atlas/` once the code exists.

## Discarded alternatives

- **Putting it inside `vista-3d`.** It mixes two metaphors, two cameras and two rhythms; both views
  become harder to maintain.
- **Making it core.** The core must remain the monitor and the model, not a scene engine. Besides,
  Atlas must be disableable.
- **Making it an addon.** An addon is declarative knowledge, not render code; Atlas needs its own
  renderer.
- **Starting with 2D and replacing it later.** It throws work away and validates an experience that is
  not the one being sought.
- **Extending the plugin contract to paint the whole app.** It is not needed today and would open a
  door that is later expensive to close.
- **A generic shared 3D engine from day one.** Two views do not justify a framework; first prove them,
  then extract what is common.

## Roadmap

Phase **M77 · Atlas, a plugin view**.

- ✅ The `atlas` manifest, the view and its registration in the build.
- ✅ The full stage and the return to the classic map when WebGL2 is missing.
- ✅ The 3D aerial view: plane, folder containers and file cubes.
- ✅ Selection and focus synced with the app on both maps.
- ✅ Entering and leaving a folder with camera focus and breadcrumb.
- ⬜ The animated transition between atlas and folder.
- ⬜ Readable labels and file detail.
- ⬜ Corridors and shelves, if the vertical slice justifies them.
- ⬜ Performance, reduced motion and fallback to the classic map.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
