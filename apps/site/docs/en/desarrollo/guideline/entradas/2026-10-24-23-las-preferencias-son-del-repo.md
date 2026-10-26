---
title: Preferences belong to the repository
date: "2026-10-24"
category: feature
verdict: arreglo
---

**What it is**: each repository remembering its own view —area metric, colour and labels— in
`.codarch/preferences.json`, instead of sharing a single preference across all of them.

**Why**: switching repos changed the map with the previous view. The project config already lived in
its `.codarch/`, but the view config stayed on the machine.

**What changed**: the desktop app stores the preferences in the repo's `.codarch/` and reads them
when it analyzes or restores it, before painting the snapshot; if the repo cannot be written, the
`localStorage` copy remains the fallback. On first use, the machine preferences move into the repo as
they are saved. The web keeps using `localStorage`, because it does not write to the repo. The split
is written in [ADR 0053](../../adr/0051-0060/0053-la-configuracion-no-se-mezcla.md).

**Verdict**: persistence fix, within ADR 0053.
