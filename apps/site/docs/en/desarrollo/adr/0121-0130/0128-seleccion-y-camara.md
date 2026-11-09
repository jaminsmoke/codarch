---
title: "ADR 0128 — One click selects, two enter"
description: "One click selects files or folders; double click enters the folder or opens the sheet. The camera is limited to a front arc so it cannot leave the room."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Selection and camera
  order: 128
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0127](0127-paneles-enfocables.md): the panel already flies; now the selection
gesture and camera arc are fixed.

## Context

Entering a folder with one click made it impossible to select it without leaving the room. The camera
could also orbit behind the walls, where there is no room to look at.

## Decision

### 1. One click selects

- One click on a **folder** selects it; it does not change rooms.
- One click on a **sheet** selects the file; it does not open the viewer.
- The metrics panel keeps its direct click: it is a screen, not a folder.

### 2. Two clicks travel or open

- Double click on a **folder**: travels to its recursive room.
- Double click on a **sheet**: opens the code viewer.
- Folder flight is unchanged; the viewer waits for the second gesture.

### 3. Camera stays in the front arc

Orbit is limited to an arc around the room front (`π ± 1.15` rad) and a maximum distance. The camera
can look sideways to read shelves, but does not cross the back wall or leave the scene.

`Centrar` returns to the general view.

### 4. No model changes

There are no new lenses, `.codarch/` is untouched and the checksum does not change.

## Consequences

- Selection no longer mixes with navigation.
- The camera does not reveal the outside of the room.
- Double click is now the depth gesture.
- The metrics panel remains the one-click exception because its job is focusing.

## Discarded alternatives

- **One click enters.** A folder cannot be selected without changing focus.
- **One click opens the viewer.** Selection and reading compete.
- **Full orbit.** The camera leaves the room and outside walls appear.
- **No distance limit.** The scene moves away until panel and table are lost.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ One click selects; double click enters or opens.
- ✅ Front arc and maximum camera distance.
- ✅ The metrics panel keeps its one-click focus.
- 🟡 More camera focus targets in the room.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
