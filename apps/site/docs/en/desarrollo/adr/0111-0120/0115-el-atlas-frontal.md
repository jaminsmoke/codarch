---
title: "ADR 0115 — Atlas faces front: containers and rooms"
description: "Atlas stops being an aerial plane with a grid. The overview is 3D containers with sheets on shelves; when entering a folder, subfolders remain containers on the plane and files go to the room's shelves."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: The front-facing Atlas
  order: 115
---

**Status:** accepted · **Date:** 2026-11-08

**Reworks** the metaphor of [ADR 0113](0113-el-atlas-es-un-plugin.md): Atlas is not an aerial map, it
is a front-facing hierarchical zoom. [ADR 0114](0114-el-atlas-sustituye-a-la-vista-3d.md) already
removed the bars view.

## Context

The first Atlas slice put the map on a plane with a grid and a high camera. It works as a prototype but
is not what is wanted: it looks like an overhead map of boxes, not an atlas you travel through.

The reference is different:

- an overview of 3D containers, with files as sheets inside their space;
- when entering a folder, a front-facing room with shelves and objects;
- when opening a file, its editor or viewer.

The camera must not look from above. The layout is not a city or a treemap with height: it is a
hierarchy of containers and rooms.

## Decision

### 1. Three scales, one view

Atlas has three scales inside the same view:

1. **Overview**: folder containers on the plane and file sheets on shelves.
2. **Room**: when entering a folder, its subfolders remain containers on the plane; its files go to the
   room's shelves.
3. **File**: when selecting a sheet, its editor or viewer opens.

They are not three separate screens: it is a zoom with levels of detail. The file is left for a later
phase because it needs deciding whether the viewer lives inside the plugin or delegates to the app
editor.

### 2. A container never becomes a shelf

The rule that prevents two languages:

- **Folder = 3D container**, in the overview and inside another folder.
- **File = sheet**, on a shelf.
- If a folder contains folders and files, both are visible: containers on the floor and sheets on the
  shelves.
- Entering a subfolder repeats the rule.

A folder is never drawn as a shelf row. The shelf is only for sheets.

### 3. Front-facing camera

The camera looks at the scene from the front, at walking height, not from above. The overview may have
a slight tilt to read the containers, but the axis is not overhead.

- It can orbit and zoom, but with limits that prevent returning to the aerial plane.
- Entering a folder changes the scene to its room.
- The animated Google Earth transition comes later; first the geometry and the front.

### 4. The room is generated per folder

A folder's room is built from its children:

- containers on the floor, in a readable grid;
- sheets on side and back shelves, by rows;
- floor and shelves as furniture, not as data;
- sheets keep the map color.

No second reading of the model is stored: it is derived from the `RenderModel` and the current focus.

### 5. Every map, no new checksum

The front-facing Atlas works with the code map and with the documents and configuration map. It adds no
lenses, does not write to `.codarch/` and does not change the checksum.

### 6. The file, later

The file viewer needs one more piece: opening code from the plugin or delegating to the app editor. It
is decided in its own phase. For now, clicking a sheet selects the file and the app keeps showing its
card.

## Consequences

- The aerial layout and high orbit camera are replaced by a front room.
- The plugin is still `atlas`; the bars view does not return.
- Subfolders keep the same reading as in the overview: they are containers.
- Navigation gains one more scale: overview → room → file.
- The first slice may be visually simpler than the reference, but the metaphor is already right.

## Discarded alternatives

- **Keeping the aerial plane and lowering the camera.** It changes the angle, not the layout or reading.
- **Turning subfolders into shelves.** It breaks continuity with the overview and confuses container
  with content.
- **Three separate screens.** Atlas is a zoom, not a view menu.
- **Putting the code viewer in this slice.** It adds a contract decision that is not needed to validate
  the room.

## Roadmap

Phase **M77 · The front-facing Atlas** (continues the phase from [ADR 0113](0113-el-atlas-es-un-plugin.md)).

- ✅ The decision: front, containers and rooms.
- ✅ Replace the aerial layout with containers and sheets.
- ✅ The folder room with subfolders on the floor and files on shelves.
- ✅ The front camera and its limits.
- ✅ The camera flight in and out.
- ✅ Labels by level.
- ⬜ The file viewer.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
