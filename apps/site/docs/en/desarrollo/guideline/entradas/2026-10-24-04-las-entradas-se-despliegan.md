---
title: Entries expand
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it was**: each entry showed its whole body at once. A day with 8 entries was a wall of text
and the timeline lost its effect when the page reloaded on changing day.

**What was done**: each entry is a disclosure; by default you only see the title and the verdict in
a compact row. Pressing it expands the body with animation (`AnimatePresence` + `motion`); the
chevron rotates 180°. The timeline animates the active pill with `layoutId` (spring) between days
and the transition between days uses `AnimatePresence` (exit + enter) without cutting the header's
animation.

**Verdict**: **fix**, no ADR (it is UI, not model). It changes neither the checksum nor the routes.
