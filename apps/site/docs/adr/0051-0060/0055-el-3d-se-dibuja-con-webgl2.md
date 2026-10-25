---
title: ADR 0055 — El 3D se dibuja con WebGL2 propio
description: "La vista 3D deja de dibujar con three/webgpu y pasa a un renderizador propio de WebGL2: un cubo instanciado, dos shaders y una cámara con matemática pura. El runtime costaba más que el dibujo; el chunk del plugin baja de 2,2 MB a 15 KB."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: El 3D se dibuja con WebGL2 propio
  order: 55
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

La vista 3D se activa desde la tienda de plugins (0.3.8) y se dibujaba con `three/webgpu`. En la app
de escritorio iba mal: no solo al orbitar, sino **toda la app**, con la GPU del equipo por debajo del
10 %. El primer arreglo (0.3.10) quitó el fotograma continuo: la escena solo se dibuja cuando algo
cambia. Eso bajó el consumo en reposo, pero el fotograma seguía siendo caro.

Antes de rehacer nada se midió la parte nuestra: montar los volúmenes cuesta ~1,1 ms por análisis y
el nivel de detalle ~0,015 ms por fotograma con 288 cajas. No era el problema. El coste estaba en el
runtime: preparar escena, nodos, materiales y el grafo de render en cada fotograma, y arrastrar el
build de WebGPU completo (2,2 MB de chunk) para dibujar una sola malla instanciada.

En el entorno del agente `requestAnimationFrame` está congelado, así que las medidas de fotograma se
hicieron con una página temporal que encola los fotogramas y los ejecuta a mano, y con `readPixels`
para forzar a la GPU a terminar. La tarjeta medida es la RTX 4060 Ti del equipo de desarrollo.

## Decisión

### 1. WebGL2 a pelo, sin librería

Un solo programa con dos shaders:

- **Vértices:** las 36 esquinas del cubo salen de `gl_VertexID` y dos tablas constantes; no hay búfer
  de vértices. Cada instancia trae posición, tamaño y color en un búfer entrelazado de 9 floats.
- **Fragmentos:** luz ambiente más dos direcciones, y niebla hacia el color del tema. El fondo y el
  suelo usan ese mismo color para que la escena no parezca pegada dentro de la app.

Todo son **una draw call** (`drawArraysInstanced`), incluidas las 4.000 cajas del presupuesto y el
suelo.

### 2. La cámara y el picking, matemática pura

`orbit.ts` deja de hablar con una cámara de librería: expone `pose()` con posición y objetivo.
`camera.ts` tiene `perspective`, `lookAt` y el rayo de un punto de pantalla; el picking recorta el
rayo contra las cajas con el método de las losas. Se prueba en Node, sin GPU.

### 3. Solo se dibuja cuando hay algo nuevo

La cámara avisa al moverse; el nivel de detalle se recalcula como mucho cada 120 ms en movimiento.
Quieta, la escena no pide fotograma. Cambiar de selección solo reescribe colores y el tamaño del
lienzo se sigue con un `ResizeObserver`.

### 4. La resolución tiene dos topes

El lienzo sigue al `devicePixelRatio` hasta 2× y hasta ocho megapíxeles. Una pantalla 4K a 2× serían
33 Mpx de relleno para un mapa de cajas.

## Medidas

Con 4.000 cajas y la cámara orbitando, tiempo por fotograma hasta que la GPU termina
(`readPixels` de un píxel incluido):

| Lienzo | Coste por fotograma | Equivalente |
|---|---|---|
| 1280 × 800 | 3,1 ms | ~320 fps |
| 2560 × 1600 | 8,5 ms | ~117 fps |

La CPU de nuestro render por fotograma es ~0,003 ms: el trabajo es de la GPU. El chunk del plugin
pasa de **2.173 kB a 15 kB**.

## Consecuencias

- `three` y `@types/three` salen del repo: era la única vista que los usaba.
- La vista exige **WebGL2** (`requires: { webgl2: true }`), que es el suelo de cualquier navegador
  y de Electron; ya no hay dos rutas de código.
- La niebla, el suelo y la luz se escriben a mano: son 30 líneas de shader, no un sistema de
  materiales.
- Un contexto WebGL perdido se recupera: se vuelven a crear programa y búferes y se repinta.
- El HUD dice `WebGL2` y cuántas cajas hay en pantalla.

## Alternativas descartadas

- **Seguir con `three/webgpu`:** el runtime seguía costando más que el dibujo y el chunk, 2,2 MB,
  para una malla instanciada.
- **Bajar a `three` (WebGL):** arrastra otro build y el mismo grafo de escena; el problema no era el
  backend, era la capa de runtime.
- **Python o Rust nativo:** pediría un proceso aparte, empaquetado por plataforma y tocar el núcleo;
  un plugin corre en el renderer. Si algún día hace falta, entra por su ADR.
- **Rust compilado a WASM:** posible, pero mueve el dibujo a WebGL2 igual y añade una cadena de
  compilación; no resuelve nada que no resuelva este renderizador.
- **WebGPU a pelo:** más ceremonia (pipelines, bind groups) para el mismo triángulo instanciado, y
  WebGL2 ya cubre la escena entera con margen. Se puede reconsiderar si el plugin necesita compute.

## Hoja de ruta

### El renderizador

- [x] Reescribir la escena con WebGL2 instanciado y quitar `three`.
- [x] Cámara y picking en módulos puros, con pruebas.
- [x] Medir con 4.000 cajas antes de publicar.
- [x] Actualizar el plugin, su README y su hoja de ruta.

### Lo que sigue en el plugin

El plugin lleva su propia hoja de ruta (`plugins/vista-3d/ROADMAP.md`): las etiquetas, la altura como
complejidad y la línea del tiempo en 3D viven allí, no aquí (2026-10-25).

El registro de lo hecho vive en el [feed de la guía](/guia/).
