---
title: La tienda distingue WebGPU de WebGL2
date: "2026-10-24"
category: feature
verdict: arreglo
---

**Qué es**: que el contrato de plugins sepa si la máquina tiene **WebGPU**, y que la tienda lo diga.
La ficha de la vista 3D ahora pone `GPU · WebGPU` en este equipo, y pondría `GPU · WebGL2` en uno sin
WebGPU.

**Por qué**: el plugin pasó a dibujar con WebGPU (entrada anterior), pero el contrato solo conocía
`webgl2` y la tienda seguía diciendo «WebGL2», que era exactamente lo que el plugin ya no usa cuando
puede.

**Qué cambió** en `@codarch/plugin-api`:

- `PluginRequirements.webgpu`: exigir WebGPU, igual que `webgl2` exige WebGL2.
- `gpu` ahora **se comprueba** (antes se declaraba y nadie lo miraba): vale con cualquiera de los dos
  runtimes. Es lo que pide la vista 3D, que sabe dibujar con los dos.
- `PluginCapabilities` (`webgl2`, `webgpu`) y `hasWebgpu()`, que solo mira si el navegador expone
  `navigator.gpu` (no pide dispositivo ni arranca la GPU).
- `pluginBackend(manifest, capacidades)`: dice con qué dibujará aquí — lo que el plugin exige manda y,
  si solo pide «GPU», se usa el mejor que haya, el mismo criterio que sigue three.

El manifiesto de la vista 3D baja a `requires: { gpu: true }`: exigir `webgl2` habría cerrado las
máquinas que solo tienen WebGPU, que es justo lo contrario de lo que se buscaba.

**Verificado**: en Chrome la ficha dice `1 vista · GPU · WebGPU`, y los tests cubren WebGPU ausente,
`gpu` satisfecho por cualquiera de los dos y el backend elegido en cada caso.

**Veredicto**: arreglo del contrato de plugins (M14), dentro de ADR 0028.
