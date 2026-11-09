---
title: "ADR 0130 — Interior composition and selection focus"
description: "The room fits its content, folder selection is also painted, and a selected file focuses the camera with context."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Interior composition
  order: 130
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0129](0129-esquinas-de-la-sala.md): the corners close now; what is inside and how
the camera answers a selection comes next.

## Context

With few files, the room kept a large height and floor plan: shelves looked tiny on an empty wall.
Folder selection was not visible in 3D, and selecting a sheet did not bring the camera close to its
shelf.

## Decision

### 1. The room fits its content

- Minimum height drops to 15 units; it grows with sheet rows and cabinets.
- Shelves use at most three columns per side, gaining rows and vertical presence instead of staying
  a low board.
- Sign and table move down with the wall; the table remains above the sign and keeps its reading.

### 2. The structure gets detail

- Uprights at shelf ends and a top rail.
- Horizontal moulding on side and back walls.
- Closing columns at the entrance and a floor threshold.
- A wall light above the metrics table.

These are composition details: they change neither the model nor the interaction.

### 3. Selected folder is painted

The plugin context exposes `selectedFolder`, just as it already exposed the selected file. One click
on a folder selects it in the inspector **and** highlights it in the room, without entering.

### 4. A selected file focuses with context

One click on a sheet selects it and flies to its shelf with enough distance to see the sheet, the
shelf and the wall. It does not open the viewer: that is still the double click. The flight is not a
zoom glued to the sheet; it keeps the room readable.

## Consequences

- Rooms with few files no longer have a tall, empty wall.
- Folder selection has immediate visual feedback.
- File focus keeps shelf context.
- The model, checksum and `.codarch/` do not change.

## Discarded alternatives

- **Keep a fixed height and add decoration.** It fills the gap without fixing scale.
- **Single-row shelves.** Sheets get lost in a large room.
- **Do not paint the selected folder.** The inspector changes, but 3D does not answer.
- **Focus the sheet until it fills the screen.** Shelf and wall are lost.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Height and shelves fitted to content.
- ✅ Structure details, mouldings and threshold.
- ✅ Folder selection painted.
- ✅ File focus with context.
- 🟡 More composition and lights in large rooms.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
