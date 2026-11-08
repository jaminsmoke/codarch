---
title: "ADR 0117 — Recursive rooms and front-facing shelves"
description: "The overview is only the flat first-level map. Every folder opens a room, and every subfolder is a cabinet that opens another room. Sheets face the camera: side shelves are removed."
section: desarrollo
status: enmendado
date: "2026-11-08"
sidebar:
  label: Recursive rooms and shelves
  order: 117
---

**Status:** amended by [ADR 0118](0118-el-proyecto-tambien-es-una-sala.md) (the project is also a
room and the front beam is the only closure) · **Date:** 2026-11-08

**Refines** [ADR 0115](0115-el-atlas-frontal.md): rooms open into subrooms and shelves face the
camera instead of sitting on side walls.

## Context

The first front room put shelves on the sides. From the camera, sheets were seen edge-on and the file
was hard to read. Also, the overview should not be another room: it is the flat map of the first
level, and only first-level folders are rooms.

The hierarchy must keep working in depth: a folder inside another cannot remain a decorative box with
no visible content.

## Decision

### 1. The overview is only the first level

The overview is the flat 3D map of the repo's first level. Each first-level folder is a room. Root
files go to an overview shelf.

Not every file in the repo is drawn in the overview: each room shows its own.

### 2. Every folder opens a recursive room

A first-level folder opens its room. Inside:

- its **subfolders** are cabinets on the floor;
- clicking a cabinet opens **another room** with its children;
- the rule repeats to the bottom of the tree.

The cabinet is the visual door to the subroom. There is no two-level limit.

### 3. Front-facing shelves

Side shelves are removed. Sheets are placed on a shelf wall at the back, facing the camera:

- sheet width and height are large;
- depth is minimal;
- the camera sees the cover, not the edge.

Subfolder cabinets sit on the floor in front of the shelves so they do not cover the sheets.

### 4. Camera and travel

The camera remains front-facing. Entering a cabinet takes the same journey as entering a room: move
closer, change scale and arrive at the new shelf. Going back reverses it.

### 5. No model changes

Everything derives from the `RenderModel` and the current focus. No new lenses, no `.codarch/` writes
and no checksum change. It works on the code map and the documents/configuration map.

## Consequences

- The overview stays clean; rooms carry the detail.
- Sheets read from the front and labels make sense.
- The hierarchy is recursive and does not break at the second level.
- Cabinets may cover the lower shelf; camera and LOD will need tuning for large repos.
- The space is still simple: floor, shelves and cabinets; wall and light polish comes later.

## Discarded alternatives

- **Side shelves.** They are seen edge-on and the file loses readability.
- **Only two levels.** Deep folders are left without a room.
- **Everything in the overview.** The scale problem returns and the map gets crowded.
- **A drawer in the same room instead of a subroom.** It breaks recursion and cannot hold a large tree.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ The first-level overview.
- ✅ Recursive rooms and cabinets.
- ✅ Front shelves and camera-facing sheets.
- ✅ Flight in and out.
- ⬜ Wall, light and layout polish.
- ⬜ LOD for rooms with many files.
- ⬜ The full editor.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
