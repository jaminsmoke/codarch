---
title: "ADR 0124 — Back-wall sign and the real project name"
description: "The front beam disappears. The room name moves to a sign centred on the back wall, and the root room uses the analysed project name instead of the word Proyecto."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Back-wall sign and project name
  order: 124
---

**Status:** accepted · **Date:** 2026-11-09

**Replaces** the beam from [ADR 0118](../0111-0120/0118-el-proyecto-tambien-es-una-sala.md) and adjusts
the label hierarchy from [ADR 0121](0121-camara-comoda-y-lod.md).

## Context

The beam crossed the front to hold the name. With the room open at the top and cabinets on the back
wall, the beam no longer added structure: it was just a piece in front of the camera.

The root room was also called `Proyecto`, which says nothing. The root represents the analysed
project and should carry its name.

## Decision

### 1. No beam

The front beam is removed. The front is completely open and the camera has no suspended piece in
front of it.

### 2. The name goes to the back

The room name lives in a sign centred on the back wall:

- a dark plate with a trim frame;
- text centred, white and slightly larger than other labels;
- visible above cabinets;
- not selectable.

The sign is part of the wall, not the HUD.

### 3. The root uses the project name

The room with `null` focus takes the name from the `RenderModel` (`meta.project`), not the word
`Proyecto`. Folders keep their own name.

`Proyecto` remains only as a last fallback when the model has no name.

### 4. No model changes

Everything derives from the `RenderModel` and current focus. There are no new lenses, `.codarch/` is
untouched and the checksum does not change.

## Consequences

- The room gains a free front and the name anchors to the architecture.
- The analysed project is recognisable in the root room.
- The sign competes less with file labels because it is centred and prioritised.
- The back wall needs enough height for the sign; framing already accounts for it.

## Discarded alternatives

- **Keeping the beam.** It closes the front visually without adding structure.
- **Putting the name in the HUD.** It stops reading as part of the room.
- **Still calling the root `Proyecto`.** It does not identify the analysed repository.
- **A selectable sign.** The room name is not a folder.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ No front beam.
- ✅ Sign centred on the back wall.
- ✅ The root carries the project name.
- 🟡 Angle LOD and lighting polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
