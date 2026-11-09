---
title: "ADR 0131 — Interior view and vertical look"
description: "An anchored view inside the room turns on its axis, allows looking up and lets rooms grow without the camera escaping."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Interior view
  order: 131
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0130](0121-0130/0130-composicion-interior.md): the room now fits its content; the
camera can now enter it too.

## Context

The general view orbits from outside the room. When zoomed in fully, the camera got near the centre
but still looked at the target, and the vertical stop prevented looking up. Large rooms forced the
camera out of the volume.

## Decision

### 1. Anchored interior view

The **Centro** button (or `C`) anchors the camera inside the room, one third into its depth and at eye
height. The gaze points to the back wall.

- Dragging turns **on the camera axis**, not around an outside target.
- Horizontal rotation has no exterior-orbit arc limit.
- The anchored position moves with a damped transition; there is no jump.

### 2. Looking up

In the anchored view, `polar` reaches almost the zenith and the camera **does not cross the floor**
because its position is fixed. In the exterior orbit, camera height is limited to the visible floor so
it can look up without falling below the room.

The room has no ceiling; looking up reveals the dark scene sky, intentionally.

### 3. Larger rooms

The minimum floor rises to 28 × 22 and depth follows width. With the interior view, a larger room does
not force the camera outside: it is explored from within.

### 4. Working with focus targets

`Centrar` and file or folder flights leave the anchored view. The wheel and `+`/`−` remain part of the
exterior orbit; the interior view is for looking, not for moving the camera away.

## Consequences

- The camera can stay inside and turn without showing the outside.
- Vertical look gains range; the floor is not crossed.
- Rooms can grow without composition depending on a distant camera.
- Interior mode changes neither model, checksum nor `.codarch/`.

## Discarded alternatives

- **Keep orbiting from outside.** A large room is seen from too far away.
- **Lower the target to look up.** The camera ends below the floor.
- **Anchor without a transition.** The view change jumps.
- **Add a ceiling.** It closes the depth reading decided in ADR 0122.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Anchored interior view turning on its axis.
- ✅ Vertical look with the floor as a limit in the exterior orbit.
- ✅ Larger rooms (28 × 22 minimums).
- 🟡 Composition and lights in large rooms.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
