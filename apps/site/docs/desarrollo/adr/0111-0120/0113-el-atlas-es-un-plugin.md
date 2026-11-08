---
title: "ADR 0113 — El Atlas es un plugin, no la vista 3D"
description: "El Atlas es una vista nueva, activable y separada de la vista 3D de barras: ocupa todo el escenario central, dibuja en 3D desde el primer corte y sirve para todos los mapas. No es core y no añade lentes."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El Atlas es un plugin
  order: 113
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Nota:** el [ADR 0114](0114-el-atlas-sustituye-a-la-vista-3d.md) retira `vista-3d`; el Atlas es la
única vista 3D del producto.

**Enmarca** una segunda vista dentro del contrato del [ADR 0028](0021-0030/0028-los-plugins.md)
y sigue la línea del [ADR 0055](0051-0060/0055-el-3d-se-dibuja-con-webgl2.md): WebGL2 propio, sin
`three`.

## Contexto

La `vista-3d` actual es una vista de barras: cada fichero es una caja, la altura dice su peso y las
carpetas son contenedores cerrados. Funciona, pero su metáfora no es la que se busca para el Atlas.

El Atlas que se quiere es otra cosa: un mapa que se recorre en profundidad, como un atlas geográfico.
Primero se ve el conjunto desde arriba; después se entra en una carpeta y aparecen sus volúmenes,
estanterías y ficheros; al final se abre un fichero y se lee su código sin salir del viaje. Las
carpetas se entienden mejor como contenedores y los ficheros como objetos en 3D.

CodArch tiene hoy dos mapas: el de código y el de documentos y configuración. El Atlas no puede ser
una vista de uno solo: si el plugin está activo, la misma experiencia tiene que funcionar en los dos.

## Decisión

### 1. Un plugin nuevo, `atlas`

El Atlas vive en `plugins/atlas` y se activa desde los ajustes, como cualquier plugin del
[ADR 0028](0021-0030/0028-los-plugins.md). No se mete dentro de `vista-3d` y no se convierte en core.

- Si está activo, ofrece su vista en el selector de vistas del mapa.
- Si no está activo, o la máquina no tiene WebGL2, se sigue viendo el mapa clásico.
- La activación es local, como la de los demás plugins; no cambia el análisis.

`vista-3d` se retira en el [ADR 0114](0114-el-atlas-sustituye-a-la-vista-3d.md); no se mantienen dos
vistas 3D que compitan. El Atlas ocupa su lugar.

### 2. Ocupa todo el escenario del mapa

El Atlas se pinta en el **escenario central completo** (`plugin-stage`), no en una tarjeta ni en un
panel pequeño. La cabecera y las barras laterales de la app pueden seguir existiendo; los menús
adyacentes del Atlas se diseñarán poco a poco dentro de su vista.

No se amplía el contrato de plugins para que un plugin pinte la app entera. Si algún día el Atlas
necesita sustituir el marco completo, será otra decisión, con su ADR. Hoy la frontera es clara: la app
es dueña del shell; el plugin es dueño del escenario del mapa.

### 3. Sirve para todos los mapas

El plugin recibe el `RenderModel` del mapa que está abierto. No lee el esquema de código por su
cuenta, no tiene una ruta especial para documentos y configuración y no guarda una segunda lectura de
los datos.

El mismo `atlas` tiene que dibujar:

- el mapa de código;
- el mapa de documentos y configuración;
- cualquier mapa futuro que use el mismo contrato.

La prueba de aceptación incluye los dos mapas actuales. Cambiar de mapa con el Atlas activo debe
reconstruir la escena, no quedarse con la anterior.

### 4. El resultado es 3D desde el primer corte

No habrá una fase intermedia de “Atlas 2D” que luego se tire. El primer corte ya es 3D:

- una vista aérea que se parece al treemap, pero construida con volúmenes y una cámara;
- carpetas que se leen como contenedores;
- ficheros que se leen como objetos dentro de ellas;
- una cámara que puede bajar hacia el interior.

Lo que cambia entre fases es la **profundidad y el detalle**, no la naturaleza de la vista. La primera
fase puede ser un plano 3D con contenedores y cubos; la última añade corredores, estanterías, etiquetas
y vuelo. En ningún momento se vuelve al canvas 2D como resultado final.

### 5. Sin lentes nuevas y sin tocar `.codarch/`

El Atlas deriva su espacio del modelo que ya existe. No añade lentes ni cambia el checksum. No escribe
en `.codarch/`: la cámara y las preferencias de la vista son estado de UI, como en los demás mapas.

La selección, el foco, la URL y los colores se comparten con la app. El Atlas no inventa una segunda
fuente de verdad para saber qué fichero está elegido.

### 6. Renderizador propio

El Atlas dibuja con WebGL2 y su propio renderizador. Puede reutilizar ideas y módulos puros de
`vista-3d` —cámara, picking, LOD—, pero no se acopla a su escena ni a su metáfora de barras. Si los dos
plugins necesitan la misma pieza, se extrae una utilidad pequeña **cuando la duplicación sea real**, no
antes.

Requisitos:

- `webgl2: true` en el manifiesto;
- mensaje claro y vuelta al mapa clásico si no hay WebGL2;
- dibujo bajo demanda cuando la cámara está quieta;
- LOD y culling para repos grandes;
- nada de `three` ni de un runtime de escena completo.

### 7. Navegación y alcance

La primera navegación será deliberadamente contenida: orbitar, acercarse, entrar en una carpeta,
seleccionar un fichero y volver. El vuelo libre, los corredores y los controles avanzados llegan
después, cuando el corte vertical demuestre que la metáfora funciona.

No es un editor de código, no es un motor de juego y no sustituye al mapa 2D ni a `vista-3d`.

## Consecuencias

- El repo gana `plugins/atlas` con su manifiesto, su vista, su renderizador y sus tests.
- El Atlas se carga bajo demanda, como `vista-3d`; quien no lo active no paga su bundle.
- El mapa clásico sigue siendo el fallback y la referencia de legibilidad.
- La app no necesita un contrato nuevo de shell para la primera versión.
- El checksum y los artefactos no cambian por activar el plugin.
- La documentación del plugin y su hoja de ruta viven en `plugins/atlas/` cuando exista el código.

## Alternativas descartadas

- **Meterlo dentro de `vista-3d`.** Mezcla dos metáforas, dos cámaras y dos ritmos; las dos vistas se
  vuelven más difíciles de mantener.
- **Hacerlo core.** El core debe seguir siendo el monitor y el modelo, no un motor de escenas. Además,
  el Atlas debe poder desactivarse.
- **Hacerlo un addon.** Un addon es conocimiento declarativo, no código de render; el Atlas necesita
  un renderizador propio.
- **Empezar con un 2D que luego se sustituye.** Se tira trabajo y se valida una experiencia que no es
  la que se busca.
- **Ampliar el contrato de plugins para pintar toda la app.** Hoy no hace falta y abriría una puerta
  que después cuesta cerrar.
- **Un motor 3D genérico compartido desde el día uno.** Dos vistas no justifican un framework; primero
  se prueban y después se extrae lo común.

## Hoja de ruta

Fase **M77 · El Atlas, un plugin de vista**.

- ✅ El manifiesto `atlas`, la vista y el registro en el build.
- ✅ El escenario completo y la vuelta al mapa clásico si no hay WebGL2.
- ✅ La vista aérea 3D: plano, contenedores de carpeta y cubos de fichero.
- ✅ La selección y el foco sincronizados con la app en los dos mapas.
- ⬜ Entrar y salir de una carpeta, con LOD y breadcrumb.
- ⬜ Etiquetas legibles y detalle de fichero.
- ⬜ Corredores y estanterías, si el corte vertical los justifica.
- ⬜ Rendimiento, movimiento reducido y caída al mapa clásico.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
