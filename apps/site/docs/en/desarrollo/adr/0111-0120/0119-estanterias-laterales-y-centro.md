---
title: "ADR 0119 — Side shelves and central cabinets"
description: "File shelves hug the side walls and sheets stand upright, facing the central aisle. Cabinets are ordered in the middle and gain a top, plinth, frame and handle."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: Side shelves and centre
  order: 119
---

**Status:** accepted · **Date:** 2026-11-08

**Amends** [ADR 0117](0117-salas-recursivas-y-estanterias.md) and
[ADR 0118](0118-el-proyecto-tambien-es-una-sala.md): shelves leave the back wall and move to the side
walls; sheets no longer face the camera.

## Context

The room piled every file at the back and left the centre for cabinets. The result was a wall of
sheets and an empty aisle: the side walls did nothing and the layout wasted the room.

Cabinets were also smooth cubes. There was no top, plinth or handle, so they read as coloured blocks
rather than furniture.

## Decision

### 1. Shelves on the side walls

Files are split into two shelves, one against each side wall:

- the board reaches from the wall towards the centre, not the back;
- two vertical uprights hold each shelf;
- a rail ties it to the wall;
- the central aisle stays free for cabinets.

The shelf reads as wall furniture, not as a wall of sheets.

### 2. Sheets stand upright

Sheets stop being camera-facing posters. They stand on the board with their face towards the central
aisle and their edge towards the camera.

In the front view they are therefore seen edge-on. This is deliberate: the shelf comes first, and
orbiting the camera lets you face them. Labels still say which file each one is.

### 3. Cabinets in the centre

Cabinets fill the central grid:

- up to five go in one row, all visible;
- from six onwards they split into columns;
- the grid is centred in X and Z, away from the shelves.

The room grows wider so the central row and the two side shelves do not touch.

### 4. Cabinet shape

Each cabinet gains four details, all furniture and non-selectable:

- a **top** with a small overhang;
- a **plinth** at the bottom;
- a vertical **frame** on the front;
- a horizontal **handle**.

The body keeps the map colour. Details use the trim colour to separate the piece from floor and wall.

### 5. No model changes

Everything derives from the `RenderModel` and the current focus. There are no new lenses, `.codarch/`
is untouched and the checksum does not change. It works the same on the code map and the
documents/config map.

## Consequences

- The room uses its three visible walls and keeps a central aisle.
- In the front view side sheets are edge-on; the name stays on the label and orbiting lets you read
  them.
- Cabinets read as furniture, and a row of five does not hide the ones behind.
- The room is wider and the camera moves back in rooms with many sheets.
- Lighting, fine distribution and LOD polish remain.

## Discarded alternatives

- **Keeping the back shelf.** It wastes the side walls and leaves the centre alone.
- **Side shelves with camera-facing sheets.** It turns the wall into a poster and breaks the shelf
  reading.
- **Cabinets in several rows from the start.** The second row is hidden in the front view.
- **Selectable details.** Top and handle are neither files nor folders.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ The project as the first room.
- ✅ The front beam and the room-name sign.
- ✅ Side shelves with upright sheets.
- ✅ Centred cabinets with top, plinth, frame and handle.
- 🟡 Lighting, fine distribution and LOD polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
