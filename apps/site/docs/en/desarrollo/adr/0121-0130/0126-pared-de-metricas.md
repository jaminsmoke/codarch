---
title: "ADR 0126 — The metrics wall"
description: "The back wall gains a long screen with the metrics of the open scope: the project at the root and the folder inside a room."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: The metrics wall
  order: 126
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0124](0124-cartel-de-fondo-y-nombre-del-proyecto.md): the back wall already shows
the name; now it also shows the numbers.

## Context

Metrics lived in the inspector, outside the scene. The back wall, meanwhile, was empty above the sign
and cabinets. Users had to leave the room to know how many files or what risk they were looking at.

## Decision

### 1. A long screen above the sign

The back wall gets a horizontal screen centred above the sign:

- a trim frame;
- a four-row table;
- centred text, readable on the dark background;
- not selectable.

It is not a HUD panel: it is mounted on the wall, like the sign.

### 2. Metrics of the open scope

The table is computed from files in the current focus:

- **Files**: files in scope;
- **Folders**: subfolders in scope;
- **Risk**: maximum risk;
- **Area**: sum of the model's area metric.

At the root they are project figures; inside a folder, they are that folder's and its descendants'.
No values are invented and the checksum does not change: everything comes from the `RenderModel`.

### 3. One table, not four posters

A single screen with rows is preferred to four small panels. Text does not compete with file labels
and numbers are read at a glance.

## Consequences

- Scope metrics are visible inside the room.
- The back wall gains a function, not just decoration.
- The table uses a smaller font and must not grow without limit; long names are truncated.
- The inspector remains the source for full detail.

## Discarded alternatives

- **Four small panels.** Labels stepped on each other in the front view.
- **Metrics only in the HUD.** They force you out of the scene.
- **One panel per file.** It turns the wall into a data table and hides architecture.
- **Invented or camera-derived figures.** The checksum must not depend on the view.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Metrics screen on the back wall.
- ✅ Project figures at the root and folder figures in its room.
- 🟡 Table adaptation to long names and finer composition.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
