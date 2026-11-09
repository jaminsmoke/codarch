---
title: "ADR 0121 — Comfortable camera and geometry LOD"
description: "Rooms gain air, the camera gets buttons and shortcuts to centre and zoom, and heavily loaded rooms drop small details before furniture or sheets."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Comfortable camera and LOD
  order: 121
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0120](../0111-0120/0120-estanterias-abiertas-al-frente.md): the shelf is open and ordered; now
room space, camera control and geometry LOD are adjusted.

## Context

The room used the walls well, but framing depended on the wheel and dragging. There was no quick way
back to the initial view or to zoom without finding the mouse. Rooms with many pieces still sent every
small detail to the GPU.

Existing LOD was label-only: names were hidden when a sheet was small on screen. Geometry had no
equivalent budget.

## Decision

### 1. More air in the room

The room grows in width and depth, and gains a minimum height:

- more separation between the central row and side shelves;
- more depth behind cabinets;
- a little more height between the shelf and the back-wall sign.

The goal is that pieces do not touch and the camera has room to pull back without the room feeling
like a corridor.

### 2. Camera at hand

The scene exposes two new operations:

- `resetView()`, returning to the initial view;
- `zoom(factor)`, moving closer or farther while keeping the target.

The view adds:

- **−**, **Centrar** and **+** buttons in the stage;
- `+` / `-` shortcuts to zoom, and `0` or `R` to centre;
- a `start` with a little more elevation so the room reads from the first frame.

Wheel, drag and pinch still work.

### 3. Geometry LOD

Cabinet details (top, plinth, frame and handle) are marked as `detail`.

When a room exceeds 140 boxes, those details stop being drawn before cabinet bodies, sheets or main
furniture. They are also dropped when the camera moves farther than 1.35 times the initial distance or
more than 0.65 radians away from the front; they return when coming back.

It is a load, distance and angle LOD: the geometry list is recalculated only when a threshold is
crossed, not every frame.

The label LOD from ADR 0120 remains: 64 per room with priority for the sign, selection, folders and
sheets.

### 4. No model changes

Everything derives from the `RenderModel` and the current focus. There are no new lenses, `.codarch/`
is untouched and the checksum does not change. It works the same on the code map and the
documents/config map.

## Consequences

- The room is wider and deeper; the camera can pull back without hugging walls.
- Centring and zooming no longer depend on finding the wheel or the exact drag point.
- Heavily loaded rooms lose decorative detail, not content.
- Geometry LOD responds to room load, camera distance and camera angle.

## Discarded alternatives

- **Wheel and drag only.** Slower on touch screens and large repos.
- **Always adding more detail.** More instances without better reading in a loaded room.
- **Removing sheets to save weight.** Content is not expendable; decorative detail is.
- **An angle LOD.** It needs more computation and adds less than load and distance.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ More air in the room.
- ✅ Camera buttons and shortcuts.
- ✅ Load-, distance- and angle-based LOD for cabinet details.
- 🟡 Fine aisle distribution.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
