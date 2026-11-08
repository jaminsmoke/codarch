---
title: "ADR 0120 — Open shelves ordered from the front"
description: "Side shelves lose the end caps and uprights that hid sheets. They start at the room mouth and fill inwards. Side lights and a label budget support reading."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: Open shelves at the front
  order: 120
---

**Status:** accepted · **Date:** 2026-11-08

**Amends** [ADR 0119](0119-estanterias-laterales-y-centro.md): shelves become open, without side
caps, and are ordered from the room mouth inwards.

## Context

The side shelves were on the right wall, but two vertical uprights at the ends closed the shelf and
hid part of the sheets. The shelf also sat at mid-depth: the room front stayed empty and sheets moved
away from the camera.

Lighting was flat and the number of labels had no shared ceiling across rooms.

## Decision

### 1. Open shelves

End uprights and side caps are removed. The shelf is now:

- a **board** reaching from the wall towards the centre;
- a thin **rail** fixed to the wall, supporting it;
- a **light strip** above the board, separating shelf and wall.

No panel hides sheets from the sides. The space between boards stays open.

### 2. From the front inwards

The shelf starts at the **room mouth** (`SHELF_FRONT_Z`) and sheets are ordered from there towards
the back:

- the first column sits near the camera;
- the next ones move inwards;
- rows rise from the board.

The first glance therefore has sheets closer, and the shelf reads as a sequence rather than a
distant block.

### 3. Side lights

The room gains two strips on the side walls and one shelf light per side. The shader adds a soft
height light: upper areas no longer look as flat as the floor.

### 4. Label LOD

The label budget drops to 64 per room. Priority remains:

1. the beam sign;
2. the selected file;
3. folders;
4. sheets.

Sheets that are too small on screen still hide their label. This is a reading LOD: geometry does not
change, what we try to read does.

## Consequences

- More sheets are visible and the shelf stops looking closed.
- The room front is used and the camera finds content sooner.
- Side light gives volume to walls and edges.
- Rooms with many sheets do not fill the screen with labels.
- Geometry LOD (not just labels) remains pending.

## Discarded alternatives

- **Keeping uprights.** They support, but hide and close the shelf.
- **Shelves at the back.** They push sheets away from the camera again.
- **Filling front-to-back without order.** Reading becomes arbitrary.
- **Removing every distant label.** Orientation is lost; a prioritised budget is better.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Side shelves without caps.
- ✅ Sheets ordered from the room mouth inwards.
- ✅ Side lights and height light in the shader.
- ✅ Label LOD with priority and budget.
- 🟡 Geometry LOD and distribution polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
