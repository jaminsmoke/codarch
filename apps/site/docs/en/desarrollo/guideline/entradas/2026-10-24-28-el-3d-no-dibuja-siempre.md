---
title: The 3D view no longer draws at 60 fps forever
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: the 3D view only draws when something changes: the camera moves, the selection
changes or the size changes. When still, it costs nothing.

**Why**: the scene had a `requestAnimationFrame` that rescheduled itself and called
`renderer.render()` on every frame, even when nothing had changed. With the 3D view on, the GPU and
CPU never rested and **the whole app** felt slow: every click competed with 60 frames per second.
Since 0.3.8, with the plugin store, turning the 3D view on is one click.

**What changed**: the orbit controls report whether the camera moved (`update(): boolean`) and notify
when it starts moving (`onChange`). The scene asks for a frame only on movement, selection or resize,
and the level of detail is recomputed at most every 120 ms while the camera moves. Profiled: 2.5 s
with the 3D view open and still → 22 ms of CPU (0.9%); before, one frame per refresh.

**Why it was missed**: we checked that the 3D view *drew*, not what it cost **while idle**. There was
no performance budget or idle profile; the problem appeared when leaving the view open while using
the rest of the app.

**Verdict**: performance fix; it needs no ADR.
