---
title: "El mapa, en una captura"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el mapa vivía dentro de la app. Para verlo había que abrirla —o montar `codarch serve`—, y las tools del MCP devolvían texto. Un agente podía decir que `packages/ui/src/panels.tsx` pesa mucho, pero no podía mirar dónde está el bulto ni ver la carpeta que se va en rojo. El SVG del `render` tampoco servía: un agente no lo lee, y fuera de la página no tiene ni colores ni tamaño.

**Qué es**: `codarch shot` y la tool `map_screenshot` del MCP pintan el mapa en un PNG con el área y el color que se pidan. `captureMap` construye el `RenderModel` con esos dos y lo pinta con `layoutMap` y `fileFill` —las mismas funciones que usa la pantalla— sobre un lienzo de píxeles; no hay un segundo layout ni una segunda tabla de colores. El PNG se escribe a mano con `zlib` (rectángulos rellenos y marcos de un píxel), sin `sharp`, `canvas` ni navegador sin cabeza. La imagen no lleva texto —un glifo pediría una fuente y un rasterizador, y otra cosa que puede salir distinta en cada máquina—: los nombres, la escala de color y las doce celdas más grandes viajan al lado, en el resumen que el CLI imprime y que el MCP devuelve como segundo bloque. `churn` se acepta como alias de `number_of_commits`, que es el nombre que la app le da al calor y no una métrica del snapshot.

**Por qué así**: el mapa son cajas de color, y rasterizar un SVG para eso es traer una dependencia nativa por plataforma. El paquete `@codarch/render` gana una entrada de node (`@codarch/render/node`) porque el navegador no tiene `zlib` ni `fs`; lo compartido sigue en los módulos que ya usaban las dos partes, que es lo que impide que la captura y la pantalla pinten distinto.

**Dos ranuras que rotan**: las capturas van a `.codarch/shots/map-1.png` y `map-2.png`. La que entra ocupa la libre; con las dos ocupadas, pisa la **más antigua** por fecha de modificación. Dos y no veinte porque lo que se quiere comparar es con la anterior, y una carpeta de capturas con fecha en el nombre crece sola y no se mira nunca. El nombre no lleva fecha, así que la ruta de una captura no cambia y un enlace a ella sigue valiendo. `--out` escribe donde se diga y no gasta ranura: quien dice dónde quiere el fichero no está comparando dos capturas.

**Cómo se comprueba**: `packages/render/test/shot.test.ts` cubre los bytes deterministas (mismo snapshot, área, color y tamaño dan el mismo PNG), el tamaño pedido, que dos colores den imágenes distintas, el rechazo de 4x4 y de 9000, la métrica que el snapshot no trae, el resumen, el alias del calor y las ranuras —llenar, rotar sobre la más antigua y no pasar nunca de dos—. El orden de `listShots` se fija con fechas a mano, no con el reloj. En el MCP, la prueba comprueba que la tool devuelve un bloque `image/png` con el PNG y un bloque de texto con el resumen. Suite **1.086** casos y **133** ficheros, `tsc` limpio y lint sin errores.

**Veredicto**: fase M62 abierta, con la captura funcionando. Queda pintar etiquetas —una fuente de mapa de bits para los nombres— si alguien las echa de menos, y llevar la captura a la acción de GitHub como adjunto del comentario del PR.
