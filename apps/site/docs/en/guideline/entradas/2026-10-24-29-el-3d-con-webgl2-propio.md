---
title: The 3D view is drawn with its own WebGL2 renderer
date: "2026-10-24"
category: optimized
verdict: adr
---

**What it is**: the 3D view stops using `three/webgpu` and draws with a small WebGL2 renderer of its
own: one instanced cube, two shaders and a camera with pure math. Decision in
[ADR 0055](/docs/adr/0055-el-3d-se-dibuja-con-webgl2/).

**Why**: the 3D view performed badly in the desktop app and the GPU stayed below 10%. Our own code
was tiny (1.1 ms to build the volumes, 0.015 ms for the level of detail), so the cost was in the
runtime: preparing the scene, nodes and materials every frame, and shipping 2.2 MB of three to draw a
single mesh.

**What changed**: the scene is two shaders and one instanced call. The camera, matrices and picking
live in pure modules with tests. It only draws when something changes, with the resolution capped at
2× and eight megapixels. Measured on the development RTX: 4,000 boxes at 1280×800 → 3.1 ms per
frame; at 2560×1600 → 8.5 ms. The plugin chunk goes from 2,173 kB to 15 kB.

**What we learned**: picking a library is not free. Three solved the drawing, but its scene layer
cost more than the problem we were solving. For a view with a single instanced shape, the short path
was to write the short path.

**Verdict**: ADR 0055; the plugin still does not touch the snapshot.
