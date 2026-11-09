---
title: "ADR 0127 — Focusable panels and contained text"
description: "Sign and table text is clipped and scaled inside its panel. Clicking the metrics screen flies the camera smoothly to frame it; Centrar returns to the room."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Focusable panels
  order: 127
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0126](0126-pared-de-metricas.md): the table exists; now it behaves like a room
screen.

## Context

Sign and table were drawn as canvas labels over the scene. Text could leave the panel and was not part
of it. The metrics screen was also not selectable: there was no direct way to lean in and read it.

## Decision

### 1. Text inside the panel

Sign and table text is drawn with a clipping rectangle computed from the panel's four projected
corners. Table type scales with panel size: it grows when approaching and shrinks when moving away.

Text stops being a floating label: it cannot leave the monitor.

### 2. The metrics screen is selectable

The metrics screen can be clicked. It then:

- flies the camera smoothly to frame the panel;
- centres the panel in view;
- pushes the rest of the room out of frame to read the table.

The name sign remains non-selectable.

### 3. Back to the room

`Centrar` (or `0` / `R`) returns to the general room view. Panel flight uses the same mechanism as
folders, so camera transitions are ready for more focus targets.

### 4. No model changes

There are no new lenses, `.codarch/` is untouched and the checksum does not change.

## Consequences

- Text belongs to the panel and cannot overflow.
- The table can be read up close with one click.
- Camera transitions gain a reusable case.
- Table text truncates when the panel is small; focus lets it be read in full.

## Discarded alternatives

- **Always fixed text size.** It stayed tiny when approaching and looked like HUD.
- **Non-selectable panel.** It forces manual orbit and zoom.
- **Four panels.** More surface and noise; one table screen is enough.
- **Changing the model to carry metrics.** The table is computed from files.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Text clipped and scaled inside the panel.
- ✅ Metrics screen focusable with camera flight.
- ✅ Centrar returns to the room.
- 🟡 More camera focus targets in parts of the room.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
