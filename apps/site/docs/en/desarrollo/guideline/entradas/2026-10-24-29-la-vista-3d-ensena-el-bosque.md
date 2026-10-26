---
title: The 3D view shows the forest
date: "2026-10-24"
category: feature
verdict: arreglo
---

**What it is**: the 3D view grouping by folder and opening detail only when it can be seen. A folder
far away is **one** box summarising what it holds; get closer and it opens, showing its children on
top of its floor.

**Why**: with one box per file, a repo of 20,000 files is 20,000 primitives and the scene drags. It
was the "bad part" written down for this plugin since its first version.

**What changed** (all inside the plugin, without touching the engine or the snapshot):

- `volumes.ts`: a folder/file volume tree built from the usual `layoutMap`. A collapsed folder is as
  tall as its tallest child and takes its colour; children are sorted by area so the pruning is
  deterministic.
- Level of detail **by screen size**, not by a fixed level: a folder opens when it measures more than
  ~22 px at its position, so it opens as you approach or because it is big, and closes as you pull
  away.
- A budget of 1,200 primitives: a folder only opens if it and **all** its children fit; otherwise it
  stays collapsed as one box. No half-open folders and no holes in the map.
- Tapping a collapsed folder focuses it (`focus`): the app keeps that folder and the map opens.
- Scene design: one material **per colour**, not per box, and selecting no longer remounts the scene
  (the focus moves without recreating the GPU device).
- The notice says how many boxes are on screen.

Since the map is 2D (x, z) with height on top, this is a **quadtree**, not an octree: the plugin's
roadmap now says so (it used to call it an octree).

**Verified**: tests for the tree and the pruning (a folder with 400 children and a budget of 50 → a
single box, no holes). In Chrome, 263 files → 317 boxes (54 folder floors) at 120 fps with WebGPU;
with the budget lowered to 3 in a test run, 5 boxes and a tap on a folder leaves `Todo / packages`.

**What is left**: `InstancedMesh` per colour to cut draw calls and raise the budget, and labels. And
deciding the opening framing: the camera starts close and shows one corner.

**Verdict**: fix for the plugin (M15), its v0.02 roadmap step.
