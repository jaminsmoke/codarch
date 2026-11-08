---
title: "ADR 0114 — Atlas replaces the bars 3D view"
description: "The bars 3D view is removed from the product: Atlas is the only 3D view. Two competing metaphors are not kept, nor is a hidden copy."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: Atlas replaces the 3D view
  order: 114
---

**Status:** accepted · **Date:** 2026-11-08

**Retires** the view born in [ADR 0028](0021-0030/0028-los-plugins.md) whose renderer was described in
[ADR 0055](0051-0060/0055-el-3d-se-dibuja-con-webgl2.md). [ADR 0113](0113-el-atlas-es-un-plugin.md)
creates Atlas, which is already implemented.

## Context

Atlas already draws the map in 3D: aerial view, folder containers, file cubes, selection and focus in
sync, and it works on both maps. The old bars `vista-3d` remains in the repo as a second 3D plugin.

Both views share WebGL2 and the model, but not the metaphor: one is a box histogram and the other is an
atlas you travel through in depth. Keeping both confuses the user, duplicates camera and volume code,
and forces every 3D view decision to be made twice.

## Decision

### 1. `plugins/vista-3d` is removed

The plugin disappears from the repo and from `.codarch.yml`. Atlas is the only 3D view in the product.

- No hidden copy and no "classic 3D" mode is kept.
- No compatibility alias is kept: if someone had `vista-3d` enabled on their machine, the plugin no
  longer exists and the app falls back to the classic map.
- The 2D map remains the fallback and the readability reference.

### 2. Atlas takes its place

Atlas keeps what [ADR 0113](0113-el-atlas-es-un-plugin.md) already decided: separate plugin, full
central stage, every map, no new lenses and no checksum change. What changes is that there is no longer
another 3D view to compare it with.

### 3. The old ADRs are history

[ADR 0028](0021-0030/0028-los-plugins.md) and
[ADR 0055](0051-0060/0055-el-3d-se-dibuja-con-webgl2.md) remain valid as a record: they explain why
there are plugins and why 3D is drawn with custom WebGL2. Their concrete reference to the bars view is
historical; the current view is Atlas.

### 4. What depended on it is cleaned up

- Its files, tests and roadmap are deleted.
- `.codarch.yml`, the README, the usage guide and the screenshots that mentioned it are updated.
- Atlas keeps its own cameras, volumes and tests; no orphan code is left.

## Consequences

- One 3D plugin, one concept and one roadmap.
- Less duplicated code and a smaller bundle: Atlas already has its own chunk.
- A user who had `vista-3d` enabled does not lose the map: it falls back to the classic map and can
  enable Atlas.
- The plugin contract, the checksum and addons do not change.
- The removal does not rewrite history: old ADRs are read with the date they were decided.

## Discarded alternatives

- **Keeping both views.** It duplicates metaphor, camera and maintenance, and confuses the choice.
- **Leaving it hidden or disabled by default.** A hidden copy keeps ageing and keeps dragging code and
  tests along.
- **Merging it into Atlas.** Atlas is something else; putting the bars back inside brings back the
  confusion being removed.
- **Deleting it without a record.** ADR 0114 and the historical ADRs explain why it left.

## Roadmap

No new phase. The removal is part of M77.

- ✅ Remove `plugins/vista-3d` and its entry in `.codarch.yml`.
- ✅ Delete its tests and plugin documentation.
- ✅ Update README, usage guide, screenshots and references to the plugin.
- ✅ Leave Atlas as the only 3D view and keep the classic map as fallback.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
