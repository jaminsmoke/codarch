---
title: La vista 3D corre en WebGPU
date: "2026-10-24"
category: optimized
verdict: arreglo
---

**Qué es**: que la vista 3D dibuje con **WebGPU** cuando la máquina lo tiene, y caiga a **WebGL2**
cuando no. El aviso de la escena dice con cuál está corriendo.

**Por qué**: WebGL es una API de 2011, con un modelo de estado pensado para otra época. WebGPU va por
el driver de la tarjeta (D3D12 en Windows, Vulkan, Metal), pide la GPU dedicada con
`powerPreference` y deja el trabajo en la GPU. En un portátil con dos gráficas, WebGL podía acabar
dibujando en la integrada.

**Qué cambió**: el plugin importa `three/webgpu` y monta `WebGPURenderer` con
`powerPreference: "high-performance"`. Three cae solo a WebGL2 si no hay WebGPU, así que hay **una
sola ruta de código**. La cámara pasó a ser del plugin (`orbit.ts`): `OrbitControls` importa el build
de WebGL de three y, con los dos, el chunk llevaba three **dos veces** (836 KB en vez de 670). De paso
gana pinza con dos dedos y ya no selecciona si hubo arrastre; se pierde el desplazamiento con el
botón derecho, que la escena no necesitaba (el objetivo es el centro del mapa).

**Lo que cuesta**: el chunk del plugin pasa de 506 a 670 KB (125 → 182 KB gzip), porque el build de
WebGPU lleva su sistema de nodos y su propia caída a WebGL2. Es un chunk que se descarga al abrir la
vista, no al cargar la app.

**Lo que no**: CUDA no está al alcance. Un plugin corre en el renderer, sin APIs nativas; el
equivalente moderno es WebGPU (compute en WGSL) y el driver ya elige la RTX. Un backend CUDA u OptiX
pediría un proceso nativo en el escritorio, su empaquetado por plataforma y tocar el núcleo: eso no
es un plugin, y si entra, entra por un ADR.

**Verificado**: en Chrome el adaptador sale como `nvidia`/`lovelace` y el aviso dice «WebGPU»; el
encuadre y los colores son los mismos que con WebGL2 (comparado por captura), el clic selecciona, el
arrastre orbita y la rueda acerca.

**Veredicto**: arreglo del plugin (M15), dentro de ADR 0028. El contrato de plugins no cambia: sus
requisitos siguen siendo `webgl2` y `gpu`, que es el suelo, no el techo.
