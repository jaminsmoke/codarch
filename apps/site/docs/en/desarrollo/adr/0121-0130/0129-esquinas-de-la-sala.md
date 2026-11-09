---
title: "ADR 0129 — The corners of the room"
description: "Side and back walls share the same width and closure. Corner columns hide the joint and the floor no longer sticks out."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: The corners of the room
  order: 129
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0128](0128-seleccion-y-camara.md): the camera no longer leaves; now the structure
must close properly.

## Context

The back wall was wider than the join of the side walls. The mismatch showed at the corners and the
floor stuck out beyond the structure. The room looked like separate pieces.

## Decision

### 1. One closing width

The back wall shares the side walls' outer width. The three walls end in the same plane and the same
corner.

### 2. Corner columns

Each back corner gets a trim column. It is not decoration: it hides the joint between the two walls
and gives the structure a clear closure.

### 3. Contained floor

The floor is adjusted to the wall width. It no longer sticks out; the room reads as a volume closed
below and open above.

### 4. Camera

The front arc and distance limit from ADR 0128 remain. The new structure does not widen the camera
path.

## Consequences

- Corners read as one structure.
- Floor no longer competes with walls.
- Corner columns reinforce depth and side light.
- The front stays open; no front wall is added.

## Discarded alternatives

- **Leaving the back wall wider.** That is the mismatch to correct.
- **Hiding the corner with a pasted panel.** It looks like a patch.
- **Closing the front to square the box.** It hides the room and breaks the view.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Side and back walls share closure.
- ✅ Corner columns.
- ✅ Contained floor.
- 🟡 Lighting and interior composition polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
