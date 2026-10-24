---
title: The 3D view draws in one call
date: "2026-10-24"
category: optimized
verdict: arreglo
---

**What it is**: the 3D boxes becoming **a single instanced mesh** (`InstancedMesh`) with a colour per
instance, instead of one mesh per box. Thousands of boxes turn into **one draw call** and the level of
detail budget goes from 1,200 to 4,000.

**Why**: the level of detail already capped how many boxes there are, but each one was its own mesh
with its own material. A bigger budget meant more draw calls and more objects created and thrown away
every time the camera crossed a threshold.

**What changed**:

- One `InstancedMesh` sized for the budget: each box is a matrix and a colour. A level-of-detail change
  rewrites matrices only, and selecting rewrites colours only.
- The map colour travels per instance (`instanceColor`), so the lens' continuous gradient is kept as is.
- The selection is tinted with the app's blue on the instance itself: with instancing there is no
  per-box material to put `emissive` on.
- Clicking uses the intersection's `instanceId` to look up its box: selecting a file and focusing a
  collapsed folder still work.
- The ceiling rises to 4,000 because the cost per box is no longer a draw call; what matters is the CPU
  recomputing the level of detail, every 120 ms and only when the camera has moved.

**Verified**: on this repo, 314 boxes on screen, 227 when zooming out (folders collapse) and 319 when
zooming in, at 120 fps with WebGPU and no console errors. Clicks on three points select three different
files (`useCodarchApp.tsx`, `apps/mcp/src/tools.ts`, `packages/schema/src/parse2.ts`), and with the
budget lowered to 3 in a test run the click leaves `Todo / apps` and `Todo / packages`, so the
`instanceId` reaches folders too.

**Verdict**: fix for the plugin (M15), within its v0.02.
