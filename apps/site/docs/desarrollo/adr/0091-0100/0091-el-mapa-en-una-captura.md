---
title: "ADR 0091 — El mapa, en una captura"
description: "El CLI estrena `codarch shot` y el MCP una tool que devuelve el mapa en PNG con el área y el color que se pidan. La imagen sale del mismo modelo y los mismos colores que pinta la app, no de un SVG rasterizado: rectángulos sobre `zlib`, sin dependencias nativas. Se guardan dos capturas y la tercera pisa la más antigua, porque lo que se quiere comparar es con la anterior."
section: desarrollo
status: aceptado
date: "2026-10-29"
sidebar:
  label: El mapa, en una captura
  order: 91
---

**Estado:** aceptado · **Fecha:** 2026-10-29

## Contexto

El mapa vive en una app: para verlo hay que abrirla. Un agente, o una persona en un
PR, no puede mirarlo sin montar el servidor, y las tools del MCP devuelven texto. Eso deja fuera lo
que el mapa tiene de visual —dónde está el bulto, qué carpeta está en rojo, cómo se reparte el área—
que es justo lo que no se cuenta bien con una lista.

Una cosa es escribir un SVG (`packages/render/src/svg.ts`, ADR 0008) y otra poder enseñarlo. Un agente
puede leer un PNG y no puede leer un SVG; además, el SVG de la app se pinta con su CSS, así que fuera
de la página no tiene ni colores ni tamaño.

## Decisión

### 1. La captura sale del mismo modelo que la app

`captureMap` construye el `RenderModel` con el área y el color pedidos y lo pinta con
`layoutMap` y `fileFill` —las mismas que usa la app— sobre un lienzo de píxeles. No hay un segundo
layout ni una segunda tabla de colores: si el mapa de la pantalla y la captura se separan, es un fallo
de una sola función, no de dos.

### 2. Rectángulos y `zlib`, sin dependencias nativas

El mapa son rectángulos rellenos y marcos de un píxel. Para eso no hace falta rasterizar SVG ni
depender de `sharp`, `canvas` o un navegador sin cabeza: el PNG se escribe a mano con `zlib`, como ya
hacen los iconos (`scripts/make-icons.mjs`). El paquete `@codarch/render` gana una entrada de node
(`@codarch/render/node`) porque el navegador no tiene `zlib` ni `fs`; lo compartido —layout, colores—
sigue viviendo en los módulos que ya usaban las dos partes.

### 3. La imagen no lleva texto; el resumen lleva los nombres

Un glifo pide una fuente y un rasterizador de tipografía, y eso es otra dependencia, otro
mantenimiento y otra cosa que puede salir distinta en cada máquina. La captura es geometría y color;
al lado viaja un resumen con el proyecto, el área, el color, los extremos de la escala y las doce
celdas más grandes con su ruta, su área y su valor. Quien mira el PNG sabe qué está mirando sin que el
PNG sepa escribir.

### 4. Dos ranuras que rotan

Las capturas van a `.codarch/shots/map-1.png` y `map-2.png`, dentro de la carpeta que ya está
ignorada. La que entra ocupa la ranura libre; con las dos ocupadas, se pisa la **más antigua** por su
fecha de modificación. Dos y no veinte: lo que se quiere comparar es con la anterior, y una carpeta de
capturas con fecha en el nombre crece sola y no se mira nunca. El nombre no lleva fecha, así que la
ruta de una captura no cambia y un enlace a ella sigue valiendo.

### 5. Un solo camino para el CLI y el MCP

`codarch shot` y la tool `map_screenshot` llaman a `captureMap`. Lo único que cambia es dónde acaba el
resultado: el CLI imprime la ruta y el resumen; el MCP devuelve el PNG como contenido `image` —para que
el cliente lo pinte— con el resumen al lado en texto.

### 6. En el PR, la imagen va en el artefacto

La acción captura el head en `head/map.png` —con `--out`, sin gastar ranura— dentro de la carpeta que
ya sube como artefacto, y el comentario gana un bloque «Mapa del head» que la enlaza y escribe lo que
el PNG no dice: el área, el color, la escala y las cinco celdas más grandes.

No hay otra manera de que la imagen se vea **dentro** del comentario: GitHub sanea el HTML, descarta
las imágenes `data:` y no tiene API pública para adjuntar ficheros a un comentario. Las dos salidas
reales son un servicio de imágenes o una rama publicada, y ninguna se sostiene: el primero añade una
dependencia externa a un análisis que funciona sin red, y el segundo escribe en el repo desde CI. El
artefacto ya está ahí, es privado donde el repo lo es y no pide permisos nuevos.

## Alternativas descartadas

- **Rasterizar el SVG.** Hace falta un motor de SVG: dependencia nativa, `allowScripts` y una versión
  de libvips por plataforma. Para rectángulos es desproporcionado.
- **Capturar la app con un navegador sin cabeza.** Verdadera captura de pantalla, y la única forma de
  tener etiquetas con la tipografía de la app, pero pide Chromium en cada máquina y un servidor
  levantado. Queda como escalón siguiente si algún día hacen falta nombres pintados.
- **Una captura por ejecución con nombre único.** Es lo que hace que una carpeta de capturas crezca.
  Se descarta por eso.
- **Incrustar el PNG en el comentario del PR.** No se puede: GitHub sanea el HTML y solo pinta imágenes
  con URL. Se enlaza la del artefacto.
- **Publicar la captura en una rama o en un servicio de imágenes.** Llena el repo de binarios o mete
  una dependencia externa en un análisis que hoy no usa la red.

## Consecuencias

- El CLI tiene un comando más y el MCP una tool más; el contrato del MCP de «solo lectura» se rompe en
  una tool concreta, que declara `readOnlyHint: false` porque escribe un PNG.
- La captura es determinista: mismo snapshot, mismo área, mismo color y mismo tamaño dan los mismos
  bytes. No lleva fecha ni orden de filesystem.
- Un área o un color que el snapshot no trae falla con el mensaje que ya da `buildRenderModel`, en vez
  de pintar un mapa vacío.
- `churn` se acepta como alias de `number_of_commits`: es el nombre que la app le da al calor y no es
  una métrica del snapshot.
- En la acción, la captura tolera el fallo: el CLI se instala desde npm, así que una versión publicada
  sin `shot` deja el comentario sin mapa y un aviso, en vez de tumbar el workflow.

## Hoja de ruta

- ✅ `captureMap` con área, color y tamaño; PNG a mano y dos ranuras que rotan.
- ✅ `codarch shot` con `--area`, `--color`, `--out`, `--width`, `--height` y `--json`.
- ✅ Tool `map_screenshot` en el MCP, con la imagen y su resumen.
- ⬜ Etiquetas pintadas: una fuente de mapa de bits para los nombres, si alguien las echa de menos.
- ✅ La captura en la acción: `head/map.png` en el artefacto, con su bloque en el comentario del PR.
