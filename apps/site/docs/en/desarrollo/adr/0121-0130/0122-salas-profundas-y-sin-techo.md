---
title: "ADR 0122 — Deep rooms without a ceiling"
description: "The room loses its ceiling and gains depth close to a square plan. Cabinets hug the back wall and the shelf stays at the front."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Deep rooms without a ceiling
  order: 122
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0121](0121-camara-comoda-y-lod.md): with camera and LOD at hand, room proportions
are corrected.

## Context

Rooms were much wider than deep. Cabinet rows and side shelves stayed close and the back was unused.
The ceiling did not help either: it closed the upper area, darkened the scene and added no
architectural reading.

Cabinets were in front instead of occupying the back wall, their natural place.

## Decision

### 1. No ceiling

The room opens upwards. Side and back walls still close the scene; the ceiling disappears. The back
sign and side light strips remain.

An open room lets geometry breathe and avoids the camera hitting a lid that adds no information.

### 2. Proportional depth

Depth is derived from width:

- at least 65 % of the width;
- with an absolute minimum of 20 units;
- leaving room behind cabinets and in front of shelves.

The room stops being a low display case and gets closer to a square plan. The camera still frames
width, but perspective gains depth.

### 3. Cabinets against the back

The cabinet grid is anchored to the back wall:

- the back of the last cabinet keeps a small margin from the wall;
- extra rows grow towards the camera;
- the side shelf stays at the front.

The route is: shelf at the entrance, central aisle, cabinets at the back.

### 4. No model changes

Everything derives from the `RenderModel` and current focus. There are no new lenses, `.codarch/` is
untouched and the checksum does not change. It works the same on code and documents/config maps.

## Consequences

- The room has more travel and depth is felt when orbiting.
- The open top gives more air and less dark surface.
- Cabinets occupy the back and shelves the front; spatial hierarchy is clear.
- In rooms with many sheets, the front shelf may hide part of the back; camera and LOD remain the way
  to inspect it.
- The empty floor between shelf and cabinets calls for fine distribution in a next pass.

## Discarded alternatives

- **Keeping the ceiling.** It closes the view and adds no reading.
- **Only increasing width.** It worsens the display-case proportion.
- **Leaving cabinets in front.** It wastes the back wall and leaves the rear empty.
- **Filling the back with more shelves.** It duplicates file reading and complicates labels.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Room without a ceiling.
- ✅ Depth proportional to width.
- ✅ Cabinets against the back wall.
- 🟡 Fine aisle distribution and angle LOD.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
