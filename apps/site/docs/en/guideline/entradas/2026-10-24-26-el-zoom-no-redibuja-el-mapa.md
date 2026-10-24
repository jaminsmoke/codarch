---
title: Zoom no longer repaints the map
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: zooming in and out and panning the map stop reconciling the whole SVG on every step.

**Why**: `zoom` and `center` live in the hook, so every click or every right-button move rendered
the 260 blocks and their 306 `foreignObject` labels again. On a large repo that feels like jank and
freezes; on top of that, `zoomAt` updated the centre **inside** the zoom state updater, which can be
applied twice.

**What changed**: the map content is a memoized component (`MapContent`) that does not receive `zoom`
or `center`: zooming only changes the SVG `viewBox`. Panning is grouped per frame
(`requestAnimationFrame`) instead of firing one state update per mouse event, and `zoomAt` computes
the centre once, outside the updater.

**How it was found and why it was missed**: the web build was CPU-profiled while clicking zoom ten
times. There was no performance budget or regression test: reviews were done by eye and with small
repos. At 260 cells the JS cost was about 6-8 ms per click; it scales badly with node count and with
rasterising the labels. If the desktop still feels heavy, the next suspect is `foreignObject` when
zooming: the way out would be drawing labels as `<text>` or moving zoom to a CSS transform.

**Verdict**: performance fix; it needs no ADR.
