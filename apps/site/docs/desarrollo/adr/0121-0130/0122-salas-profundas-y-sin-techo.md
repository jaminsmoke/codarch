---
title: "ADR 0122 — Salas profundas y sin techo"
description: "La sala pierde el techo y gana profundidad hasta acercarse a una planta cuadrada. Los archivadores se pegan a la pared de fondo y la estantería queda en el frente."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Salas profundas y sin techo
  order: 122
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0121](0121-camara-comoda-y-lod.md): con la cámara y el LOD a mano, se corrige la
proporción de la sala.

## Contexto

Las salas eran mucho más anchas que profundas. La fila de archivadores y las estanterías laterales
quedaban cerca y el fondo no se usaba. El techo tampoco aportaba: cerraba la parte alta, oscurecía el
conjunto y no ayudaba a leer la arquitectura.

Los archivadores estaban delante, en lugar de ocupar la pared de fondo, que es su sitio natural.

## Decisión

### 1. Sin techo

La sala se abre por arriba. Las paredes laterales y la de fondo siguen cerrando la escena; el techo
desaparece. La viga frontal y las tiras de luz laterales se mantienen.

Una sala abierta deja respirar la geometría y evita que la cámara choque contra una tapa que no
aporta información.

### 2. Profundidad proporcionada

La profundidad se calcula a partir del ancho:

- como mínimo, el 65 % del ancho;
- con un mínimo absoluto de 20 unidades;
- con espacio suficiente detrás de los archivadores y delante de las estanterías.

La sala deja de ser un escaparate bajo y se acerca a una planta cuadrada. La cámara sigue encuadrando
el ancho, pero la perspectiva gana fondo.

### 3. Archivadores contra el fondo

La retícula de archivadores se ancla a la pared de fondo:

- la espalda del último archivador queda separada de la pared por un margen pequeño;
- las filas adicionales crecen hacia la cámara;
- la estantería lateral se queda en el frente.

Así el recorrido es: estantería a la entrada, pasillo central y archivadores al fondo.

### 4. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia. Funciona igual en el mapa de código y en el de documentos/configuración.

## Consecuencias

- La sala tiene más recorrido y la profundidad se nota al orbitar.
- El techo abierto deja más aire y menos superficie oscura.
- Los archivadores ocupan el fondo y las estanterías el frente; la jerarquía espacial es clara.
- En salas con muchas hojas, la estantería delantera puede tapar parte del fondo; la cámara y el LOD
  siguen siendo la herramienta para mirar.
- El fondo vacío entre estantería y archivadores pide distribución fina en una siguiente pasada.

## Alternativas descartadas

- **Mantener el techo.** Cierra la vista y no aporta lectura.
- **Aumentar solo el ancho.** Agrava la proporción de escaparate.
- **Dejar los archivadores delante.** Desaprovecha la pared de fondo y deja el fondo vacío.
- **Llenar el fondo con más estanterías.** Duplica la lectura de ficheros y complica las etiquetas.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Sala sin techo.
- ✅ Profundidad proporcionada al ancho.
- ✅ Archivadores contra la pared de fondo.
- 🟡 Distribución fina del pasillo y LOD por ángulo.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
