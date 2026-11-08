---
title: "ADR 0117 — Salas recursivas y estanterías frontales"
description: "El overview es solo el mapa plano del primer nivel. Cada carpeta abre una sala, y cada subcarpeta es un archivador que abre otra sala. Las hojas miran a la cámara: las estanterías de perfil se retiran."
section: desarrollo
status: enmendado
date: "2026-11-08"
sidebar:
  label: Salas recursivas y estanterías
  order: 117
---

**Estado:** enmendado por [ADR 0118](0118-el-proyecto-tambien-es-una-sala.md) (el proyecto también
es una sala y la viga frontal es el único cierre) y por
[ADR 0119](0119-estanterias-laterales-y-centro.md) (estanterías laterales y hojas de pie) ·
**Fecha:** 2026-11-08

**Precisa** el [ADR 0115](0115-el-atlas-frontal.md): las salas se abren en sub-salas y las
estanterías se colocan de frente, no en las paredes laterales.

## Contexto

La primera sala frontal colocó las estanterías en los laterales. Desde la cámara, las hojas se veían
de canto y se perdía la lectura del fichero. Además, el overview no debía ser una sala más: es el mapa
plano del primer nivel, y solo las carpetas de primer nivel son salas.

La jerarquía tiene que seguir funcionando en profundidad: una carpeta dentro de otra no puede quedar
como una caja decorativa sin contenido visible.

## Decisión

### 1. El overview es solo el primer nivel

El overview es el mapa plano 3D del primer nivel del repo. Cada carpeta de primer nivel es una sala.
Los ficheros de la raíz van a una estantería del overview.

No se dibujan todos los ficheros del repo en el overview: cada sala enseña los suyos.

### 2. Cada carpeta abre una sala recursiva

Una carpeta de primer nivel abre su sala. Dentro:

- sus **subcarpetas** son archivadores en el suelo;
- pulsar un archivador abre **otra sala** con sus hijos;
- la regla se repite hasta el fondo del árbol.

El archivador es la puerta visual de la sub-sala. No hay un límite de dos niveles.

### 3. Estanterías de frente

Las estanterías laterales se retiran. Las hojas se colocan en una pared de estanterías al fondo, con
la cara mirando a la cámara:

- el ancho y el alto de la hoja son grandes;
- la profundidad es mínima;
- la cámara ve la portada, no el canto.

Los archivadores de subcarpetas van en el suelo, delante de las estanterías, para no tapar las hojas.

### 4. La cámara y el viaje

La cámara sigue siendo frontal. Entrar en un archivador hace el mismo viaje que entrar en una sala:
acercarse, cambiar de escala y llegar a la nueva estantería. Volver hace el camino inverso.

### 5. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia. Funciona en el mapa de código y en el de documentos/configuración.

## Consecuencias

- El overview queda limpio y legible; las salas tienen el detalle.
- Las hojas se leen de frente y las etiquetas tienen sentido.
- La jerarquía es recursiva y no se rompe en el segundo nivel.
- Los archivadores pueden tapar la parte baja de la estantería; la cámara y el LOD tendrán que
  ajustarse con repos grandes.
- El espacio sigue siendo sencillo: suelo, estanterías y archivadores; el pulido de paredes y luces
  llega después.

## Alternativas descartadas

- **Estanterías laterales.** Se ven de canto y el fichero pierde lectura.
- **Solo dos niveles.** Las carpetas profundas se quedan sin sala.
- **Todo en el overview.** Vuelve el problema de las escalas y el mapa se llena.
- **Un cajón en la misma sala en vez de una sub-sala.** Rompe la recursividad y no cabe un árbol
  grande.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ El overview de primer nivel.
- ✅ Las salas recursivas y los archivadores.
- ✅ Las estanterías frontales y las hojas orientadas a cámara.
- ✅ El vuelo de entrada y salida.
- ⬜ El pulido de paredes, luces y distribución.
- ⬜ El LOD para salas con muchos ficheros.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
