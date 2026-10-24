---
title: The city fits on screen
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: the 3D view opening on **the whole map**, centred and at the right distance, instead of
starting close to one corner.

**Why**: the camera opened at a fixed distance (467 units) looking at the origin. The map is
1,000 × 700 and starts at the layout padding, so the initial view showed a little more than a quarter
of it and the rest was off screen. With the level of detail in place, there was no reason not to show
the full city.

**What changed**:

- `boundsOf` (`volumes.ts`) measures what the map occupies: centre of the base and radius of the
  enclosing sphere, height included.
- `fitDistance` (`orbit.ts`) works out the distance at which that radius fits the camera's field of
  view, honouring the vertical **and** horizontal fields (so it holds at any screen ratio) with 8 %
  breathing room.
- The camera orbits around the **centre of the map**, not the origin.
- The zoom limits follow the map: the maximum becomes ~2.4× the framing distance, the minimum 5 %.
- The fog scales with the map too: it used to be fixed (400–1,600) and, with the whole scene in front,
  it would have eaten half the city; zooming out erased it entirely.

**Verified**: in Chrome the opening view shows the whole city, centred (314 boxes out of 263 files), the
far plane stays readable when zoomed all the way out, and the tests pin that the framing distance shows
the whole radius vertically and horizontally, and that a narrow screen asks for more distance than a
wide one.

**Verdict**: fix for the plugin (M15), the last point of its v0.02.
