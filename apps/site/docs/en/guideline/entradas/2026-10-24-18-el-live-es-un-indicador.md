---
title: Live is an indicator, not a button
date: "2026-10-24"
category: refactor
verdict: arreglo
---

**What it is**: the header saying whether the repository is being watched —`live`, `live paused` or
`no watching`— next to the name and the source, and the old **Live** button going away.

**Why**: it was the last remaining header difference between the web and the desktop. A button that
only existed in one app does not tell the state: it changes it. And the natural place to say "the
map refreshes on its own" is the header, where the repo already is.

**What changed**: `watch` lives in the hook (`live` | `paused` | `none`) and `AppShell` paints it as
an indicator; the web sets it from the server and the desktop will say `no watching` until its
watching lands (M34). The on/off button moves to **Settings → Diagnostics**, so the capability is not
lost. A guard is added in `apps/web/test/architecture.test.ts`: no app paints the shell pieces and
they have a line ceiling, so shared code keeps going to the hook.

**Verdict**: interface and maintenance fix; M34 continues with the desktop watcher.
