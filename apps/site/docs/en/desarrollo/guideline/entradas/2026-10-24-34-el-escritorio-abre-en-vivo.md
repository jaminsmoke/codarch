---
title: The desktop opens live
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: closing the investigation into why the desktop app "feels worse" than the web. Measured
on the real app, the shared hook was not the problem: the hook costs milliseconds. There were three
desktop things, and two were already fixed.

**The causes, with numbers**:

1. **The analysis ran in the main process** (the "The desktop app analyses without freezing" fix):
   4 to 8 s with the window ignoring clicks, down to clicks acked in 1 ms.
2. **The parser walked the tree three times** (the "The parser reads the tree once" fix): analysis of
   this repository drops from 5,330 ms to 2,590 ms.
3. **Opening a repository that already had `.codarch/` left the app frozen** 🔧. `openTarget` read the
   stored snapshot, painted it and **returned**, without starting the watcher or re-analysing. So the
   map appeared instantly but never heard about a single save, and the header said `sin vigilancia`.
   Opening from the command line, from "open with" or by dropping the folder landed there; a normal
   start (restoring the last repository) did watch, so the bug depended on how you opened it.

**What changed**:

- `openTarget`: after painting what was stored, `watchRoot(target)` and a background refresh 400 ms
  later, the same as when restoring the last project.
- `main.ts`: the watch state is sent when the window loads (`did-finish-load`). Before it was only sent
  when the watcher started, and if that arrived before the renderer was listening, the header stayed on
  `sin vigilancia` for good.

**Measured on the real app** (this repository, 274 files, window in front, Chromium debugger):

| | Before | Now |
|---|---|---|
| Open from the command line · map painted | 623 ms | **696 ms** |
| Header · watching | `sin vigilancia` | **`live`** |
| Save a file · map up to date | never (0 events) | **3.1 s** (0.3 of grouping + 2.7 of analysis) |
| Normal start · map painted | — | 697 ms from the stored snapshot, and `live` |
| Main process during the analysis | — | IPC with 1 ms median and 2 ms worst case |
| Cost of the hook per snapshot | — | `JSON.parse` 1 ms · model 2 ms · layout 1 ms |

The background refresh that runs on startup takes 2.6 s and does not get in the way: the window is
already painted and the main process keeps answering in 1 ms. What is left between saving and seeing the
change is the analysis, not the app.

**Still open**:

- Analysing a **subfolder** does not inherit the `.gitignore` files above it: `codarch analyze apps/cli`
  swallows `dist/` and takes 20 s for 38 files. That is from today and not a desktop thing: the same root
  from the web would take just as long.
- The `live` refresh applies the snapshot with `preserveView = false`: saving loses area, colour and
  focus. The map updates, but the view jumps.
- Every start re-analyses the repository in the background even when the stored snapshot is the same. It
  costs 2.6 s of CPU and is what keeps the map up to date if the repository changed while closed; it can
  be avoided by looking at dates, at the price of missing changes that were never committed.

**Verdict**: fix; no ADR needed. The shared hook (`useCodarchApp`) does not change: what changes is what
the desktop shell connects to it.
