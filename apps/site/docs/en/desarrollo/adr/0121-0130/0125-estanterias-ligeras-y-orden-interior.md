---
title: "ADR 0125 — Lighter shelves and inside-out filling"
description: "Shelf boards get thinner and shallower. Sheets fill from the inner edge of the board towards the front so boards do not hide the content."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Lighter shelves and inside-out order
  order: 125
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0120](../0111-0120/0120-estanterias-abiertas-al-frente.md): the shelf was already
open; now it gets lighter and changes fill direction.

## Context

With the deep room, boards were still thick and reached too far into the aisle. In the front view they
hid part of the sheets. Filling also started at the edge closest to the camera and moved inwards, so
the front filled first.

## Decision

### 1. Thin, shallow boards

The board loses thickness and reach:

- thickness 0.08;
- depth 1.25 from the wall;
- no side uprights.

The shelf still rests on the wall rail and its light strip, but leaves more room to see sheets.

### 2. The shelf moves inwards

The shelf centre sits towards the deep half of the room, not at the mouth. The mouth stays free and the
shelf reads inside the space, not as a piece stuck to the camera.

### 3. Fill from inside towards the front

Sheets are ordered from the inner edge of the board towards the closest edge:

- the first column sits at the back;
- the next ones move towards the mouth;
- the front of the board is left for the last ones.

The shelf fills from the inside out, the natural order of a shelf.

### 4. No model changes

Everything derives from the `RenderModel` and current focus. There are no new lenses, `.codarch/` is
untouched and the checksum does not change.

## Consequences

- Boards hide less and sheets read better.
- The front of the room is clearer.
- The shelf blends into the room depth.
- Sheets in the first columns are farther away; camera orbit and labels remain the way to read them.

## Discarded alternatives

- **Keeping thick boards.** They hid sheets in the front view.
- **Shelves at the mouth.** They filled the front and left the back empty.
- **Filling front-to-inside.** The front saturated first.
- **Removing boards.** Sheets lose their visual support.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Thin, shallow boards.
- ✅ Shelf moved inwards.
- ✅ Inside-out filling.
- 🟡 Lighting and fine composition polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
