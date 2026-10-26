---
title: Live keeps the view
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: saving a file with the app open updates the map **without** throwing the view back to
the start. Before, the map caught up but area, colour, focus, search and selection were lost; on the way
it also emptied the addons and closed the PR report.

**Why**: the web already did it right —its refresh calls `loadSnapshot(snapshot, "servidor local",
true)`— but the desktop did not tell **opening** from **refreshing**. The main process sends the same
message (`{ kind: "snapshot" }`) when a repository is opened with "open with" and when the watcher
re-analyses, and the renderer treated both the same: `loadSnapshot` without `preserveView`, plus
`setAddons([])`, `resetReport()` and a write of the project. So every save looked like a fresh open.

**What changed**:

- `DesktopTarget` carries `refresh?: boolean`. `refreshFromDisk` sets it when sending the watcher's
  snapshot; `openTarget` and the restore path do not.
- `renderer/App.tsx`: for a refresh it is `loadSnapshot(snapshot, label, true)` and nothing else.
  `preserveView` keeps area, colour, search, selection and focus, and leaves addons and the report
  alone. Opening a different repository still resets the view, which is the right thing to do.
- As a side effect, the startup refresh (the one 400 ms in) keeps the view too: it no longer undoes the
  view it has just restored.

**Measured on the real app** (this repository, window in front, click on the `packages` folder and a
file save):

| | Before the save | After |
|---|---|---|
| Area | `loc` | `loc` |
| Colour | `structure` | `structure` |
| Search | `packages` | `packages` |
| Focus | `Todo / packages` | `Todo / packages` |
| Checksum | `ce4d0b84` | `f2deb670` |

The checksum changes and the map repaints with the new data; the view stays where it was.

**Still open**: the refresh still re-analyses the whole repository (2.7 s here) and still starts from the
same point in both apps. What was missing was not throwing the view away when applying it.

**Verdict**: fix; no ADR needed. It closes what was left open in "The desktop opens live".
