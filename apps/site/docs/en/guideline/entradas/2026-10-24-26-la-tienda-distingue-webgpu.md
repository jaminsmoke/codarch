---
title: The store tells WebGPU from WebGL2
date: "2026-10-24"
category: feature
verdict: arreglo
---

**What it is**: the plugin contract knowing whether the machine has **WebGPU**, and the store saying
so. The 3D view card now reads `GPU · WebGPU` on this machine, and would read `GPU · WebGL2` on one
without WebGPU.

**Why**: the plugin moved to drawing with WebGPU (previous entry), but the contract only knew about
`webgl2` and the store still said "WebGL2", which is exactly what the plugin no longer uses when it
can.

**What changed** in `@codarch/plugin-api`:

- `PluginRequirements.webgpu`: requiring WebGPU, the same way `webgl2` requires WebGL2.
- `gpu` is now **checked** (it used to be declared and ignored): either runtime satisfies it. That is
  what the 3D view asks for, since it can draw with both.
- `PluginCapabilities` (`webgl2`, `webgpu`) and `hasWebgpu()`, which only looks at whether the
  browser exposes `navigator.gpu` (it does not request a device or start the GPU).
- `pluginBackend(manifest, capabilities)`: says which one will draw here — what the plugin requires
  wins, and if it only asks for "GPU", the best available is used, the same rule three follows.

The 3D view manifest drops to `requires: { gpu: true }`: requiring `webgl2` would have locked out
machines with WebGPU only, the opposite of what we wanted.

**Verified**: in Chrome the card reads `1 vista · GPU · WebGPU`, and the tests cover missing WebGPU,
`gpu` satisfied by either runtime, and the backend chosen in each case.

**Verdict**: fix for the plugin contract (M14), within ADR 0028.
