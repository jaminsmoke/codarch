---
title: "ADR 0118 — The project is also a room"
description: "The first level is no longer a flat overview: the project opens the first room, and every scale shares floor, walls, ceiling, beam and sign. The front stays open."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: The project is also a room
  order: 118
---

**Status:** accepted · **Date:** 2026-11-08

**Amends** [ADR 0117](0117-salas-recursivas-y-estanterias.md): the flat first-level overview is
removed and becomes the project room.

## Context

ADR 0117 left the first level as a flat map and reserved rooms for folders. The divergence showed
everywhere: the project had no walls or ceiling, root files lived on a different shelf, the camera
framed differently, and labels had no shared reference point.

A reading cue was also missing: when entering a room, no visible name said where we were. The
breadcrumb says it, but it is not part of the space.

## Decision

### 1. The project is the first room

There is no special overview. The project is built with the same `buildRoom` as a folder:

- first-level containers are its cabinets;
- root files go to its shelf;
- clicking a cabinet opens that folder's room;
- the rule repeats to the bottom of the tree.

One geometry, one camera and one way of reading. A `null` focus no longer means “flat map”: it means
“project room”.

### 2. The beam is the only front closure

The room keeps its front open. The only piece crossing it is a **beam** near the top; there is no
full front wall, because it would hide shelves and sheets.

The beam carries the **sign with the room name**:

- `Proyecto` at the root;
- the folder name at the other scales.

The sign is not selectable. Camera framing includes the beam and the sign even in tall rooms, so the
name is never lost.

### 3. The same room at every level

Floor, side walls, back wall, ceiling, baseboards, panels and light strip are shared. Cabinets sit in
front, shelves at the back, and sheets face the camera. Room height depends on the shelves, not on
the level.

### 4. No model changes

Everything still derives from the `RenderModel` and the current focus. There are no new lenses,
`.codarch/` is untouched and the checksum does not change. It works the same on the code map and on
the documents/config map.

### 5. The animated door comes later

Entering a room still uses the current camera flight. A door-opening animation while Atlas loads, in
the style of Resident Evil, is a later idea: it needs its own time, its own decision and a load that
does not delay the map. It is not part of this phase.

## Consequences

- The first level stops being an exception and the room code gets simpler.
- The project reads as a space, not as a separate board.
- The beam gives scale and a name without closing the view.
- Tall rooms need a little more camera distance so the beam and its sign enter the frame.
- Distribution, lighting and LOD polish remain, now on this single base.

## Discarded alternatives

- **Keeping the flat overview.** That is the divergence we want to remove.
- **Closing the front with a full wall.** It hides shelves and sheets.
- **A floating sign outside the beam.** It loses the spatial reading and blends into the HUD.
- **The animated door now.** It adds a wait and a visual decision that is not due yet.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ The project as the first room.
- ✅ The front beam and the room-name sign.
- ✅ Framing includes the beam in tall rooms.
- ⬜ Distribution, lighting and LOD polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
