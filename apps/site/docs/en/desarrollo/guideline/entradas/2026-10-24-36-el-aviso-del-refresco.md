---
title: The refresh notice
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: a live refresh saying so. Saving a file updates the map without moving the view (the
previous entry), but it did it silently: there was no way to know whether what you see is from now or
from a while ago. The header now shows **actualizado** for a moment, next to `live`, and fades away on
its own.

**Why**: the alternative was a dialog or a notice that has to be closed, and that gets in the way when
you save every few seconds. The notice must move nothing and cost no repaint: it lives in the header,
mounts with the same render that brings the new snapshot and fades with a CSS animation, no timers.

**What changed**:

- `useCodarchApp`: the state carries `refreshedAt`, set when a snapshot arrives **with a different
  checksum** and with `preserveView`. So there is no notice on startup, and none when the watcher
  reports something that does not change the map.
- `AppShell`: `RefreshNotice` in the header, keyed by refresh (the animation starts again) and with
  `aria-live="polite"`. With `prefers-reduced-motion` there is no animation: the notice stays visible.
- **Preferences** are written only when they change (`JSON.stringify` as the key). Before, every new
  `cc` —and every refresh brings one— triggered a write to `localStorage` and, in the desktop, a trip to
  the main process and the disk.

**Measured on the real app** (this repository, 274 files, Chromium debugger):

| | |
|---|---|
| The notice | appears when the checksum changes and fades at ~3 s |
| Full refresh | 2 layouts · 13 ms layout · 8 ms style · 30 ms script · 0 long tasks |
| Preferences | `preferences.json` was not rewritten (same date) |
| View | area, colour and focus, untouched |

**Still open**: the refresh still re-analyses the whole repository (about 2.6 s here); what it no longer
does is throw the view away or rewrite what did not change.

**Verdict**: fix; no ADR needed.
