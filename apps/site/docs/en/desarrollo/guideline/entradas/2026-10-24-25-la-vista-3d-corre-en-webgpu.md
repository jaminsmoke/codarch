---
title: The 3D view runs on WebGPU
date: "2026-10-24"
category: optimized
verdict: arreglo
---

**What it is**: the 3D view drawing with **WebGPU** when the machine has it and falling back to
**WebGL2** when it does not. The scene notice says which one is drawing.

**Why**: WebGL is a 2011 API with a state model built for another era. WebGPU goes through the
graphics driver (D3D12 on Windows, Vulkan, Metal), asks for the dedicated GPU through
`powerPreference` and keeps the work on the GPU. On a laptop with two graphics chips, WebGL could end
up drawing on the integrated one.

**What changed**: the plugin imports `three/webgpu` and mounts `WebGPURenderer` with
`powerPreference: "high-performance"`. Three falls back to WebGL2 by itself when there is no WebGPU,
so there is **a single code path**. The camera is now the plugin's own (`orbit.ts`): `OrbitControls`
imports the WebGL build of three and, with both, the chunk carried three **twice** (836 KB instead of
670). It also gained two-finger pinch and no longer selects after a drag; right-button panning is gone,
which the scene did not need (the target is the centre of the map).

**What it costs**: the plugin chunk goes from 506 to 670 KB (125 → 182 KB gzip), because the WebGPU
build carries its node system and its own WebGL2 fallback. That chunk is downloaded when the view
opens, not when the app loads.

**What it is not**: CUDA is out of reach. A plugin runs in the renderer, without native APIs; the
modern equivalent is WebGPU (compute in WGSL) and the driver already picks the RTX. A CUDA or OptiX
backend would need a native process in the desktop app, packaging per platform and changes to the
core: that is not a plugin, and if it ever comes it comes through an ADR.

**Verified**: in Chrome the adapter reports `nvidia`/`lovelace` and the notice reads "WebGPU"; framing
and colours match WebGL2 (compared by screenshot), click selects, drag orbits and the wheel zooms.

**Verdict**: fix for the plugin (M15), within ADR 0028. The plugin contract does not change: its
requirements stay `webgl2` and `gpu`, which are the floor, not the ceiling.
