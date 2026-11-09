---
title: "ADR 0123 — The central aisle"
description: "The deep room gains a floor guide between the front shelf and the back cabinets, ordering the route and giving scale."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: The central aisle
  order: 123
---

**Status:** accepted · **Date:** 2026-11-09

**Continues** [ADR 0122](0122-salas-profundas-y-sin-techo.md): with the deep room, the centre needs a
guide so it does not read as a void.

## Context

Moving cabinets to the back left a long aisle between the front shelf and the cabinet grid. The floor
was continuous and the view had no line to order the route.

## Decision

### 1. Two floor lines

The central aisle gets two thin light lines, not a solid slab:

- they start after the front shelf;
- they end before the back cabinets;
- they are centred in X and hide no sheet.

They are not furniture: they are a reading guide for the space and let the tiles show between them.

### 2. Stable scale

Runner width depends on room width, with a minimum and a maximum. It does not disappear in small rooms
and does not become a landing strip in large ones.

### 3. No model changes

Everything derives from the `RenderModel` and current focus. There are no new lenses, `.codarch/` is
untouched and the checksum does not change.

## Consequences

- The aisle reads as a route, not as a hole.
- The front view has a line leading from shelf to back.
- The guide does not replace LOD or camera; it only orders the floor.
- Lighting polish and angle distribution remain open.

## Discarded alternatives

- **Leaving the floor flat.** The deep aisle becomes a void.
- **Filling the centre with furniture.** It hides the back cabinets.
- **Painting the guide in the shader.** It mixes composition with the map metric; an explicit piece
  is better.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ Central aisle with a floor guide.
- 🟡 Angle LOD and lighting polish.
- ⬜ The animated entrance door, if decided.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
