---
title: "ADR 0123 — El pasillo central"
description: "La sala profunda gana una guía de suelo entre la estantería delantera y los archivadores del fondo, para ordenar el recorrido y dar escala."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: El pasillo central
  order: 123
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0122](0122-salas-profundas-y-sin-techo.md): con la sala profunda, el centro
necesita una guía para no quedar como un vacío.

## Contexto

Al llevar los archivadores al fondo, entre la estantería delantera y la retícula de archivadores
quedaba un pasillo largo. El suelo era continuo y la vista no tenía una línea que ordenara el
recorrido.

## Decisión

### 1. Dos filetes de suelo

El pasillo central lleva dos filetes finos y claros, no una losa:

- empiezan después de la estantería delantera;
- terminan antes de los archivadores del fondo;
- se centran en X y no tapan ninguna hoja.

No son un mueble: son una guía de lectura del espacio y dejan ver la baldosa entre ellos.

### 2. Escala constante

El ancho de la guía depende del ancho de la sala, con un mínimo y un máximo. En salas pequeñas no
desaparece y en salas grandes no se convierte en una pista de aterrizaje.

### 3. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia.

## Consecuencias

- El pasillo se lee como recorrido y no como hueco.
- La vista frontal tiene una línea que lleva de la estantería al fondo.
- La guía no sustituye al LOD ni a la cámara; solo ordena el suelo.
- El pulido de luces y la distribución por ángulo siguen abiertos.

## Alternativas descartadas

- **Dejar el suelo liso.** El pasillo profundo se convierte en un vacío.
- **Llenar el centro con muebles.** Tapa la lectura de los archivadores del fondo.
- **Pintar la guía en el shader.** Mezcla la composición con la métrica del mapa; mejor una pieza
  explícita.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Pasillo central con guía de suelo.
- 🟡 LOD por ángulo y pulido de luces.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
