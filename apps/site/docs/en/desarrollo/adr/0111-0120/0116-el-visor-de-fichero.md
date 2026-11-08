---
title: "ADR 0116 — The file viewer reads through the app"
description: "Atlas opens a sheet with the same code reader as the card. The plugin receives `readCode` in its context; it does not touch the disk or keep a second read."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: The file viewer
  order: 116
---

**Status:** accepted · **Date:** 2026-11-08

**Completes** [ADR 0115](0115-el-atlas-frontal.md): the third scale of Atlas is the file.

## Context

The room already shows sheets. When one is clicked, its code is missing. The app already has a code
reader (`platform.code`) used by the card and the read-only editor; the plugin must not invent another
disk read or a second source of truth.

The viewer in the reference image is an object/cube with code. For this phase a read-only panel inside
Atlas is enough; the full editor can come later.

## Decision

### 1. `readCode` in the plugin context

The [ADR 0028](0021-0030/0028-los-plugins.md) contract gains an explicit door:

```ts
readCode(path: string): Promise<PluginCode | null>;
```

`PluginCode` carries lines, start, end and total. The app fills it with the same reader as the card; the
plugin does not access the filesystem.

### 2. Read-only panel inside Atlas

Clicking a sheet opens a side panel with:

- the file path;
- code with line numbers;
- a Close button;
- the total line count.

Nothing is written. The panel belongs to the plugin and lives inside its stage; it does not replace the
app editor or add another state to the model.

### 3. The file does not change the checksum

Reading code does not touch the snapshot or `.codarch/`. The panel is view state and closes when the
room or map changes.

### 4. The full editor, later

Opening the real editor, editing and saving is another decision: it needs writing and a different
contract. Today Atlas only reads.

## Consequences

- The plugin can show code without duplicating the project read.
- The context grows by one function, but stays small and explicit.
- The viewer is read-only and does not promise editing.
- The card and Atlas read exactly the same.

## Discarded alternatives

- **Reading from disk in the plugin.** It would duplicate the source and break the web platform.
- **Opening the app editor when clicking a sheet.** It changes the stage and breaks the Atlas journey.
- **Putting a full editor in this slice.** It adds writing and permissions before validating the viewer.

## Roadmap

Phase **M77 · The front-facing Atlas**.

- ✅ The `readCode` contract and the read-only panel.
- ⬜ The full editor, if decided.
- ⬜ Labels and polish for the selected sheet.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
