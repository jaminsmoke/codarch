---
title: "ADR 0124 — Cartel de fondo y nombre real del proyecto"
description: "La viga frontal desaparece. El nombre de la sala pasa a un cartel centrado en la pared de fondo y la sala raíz usa el nombre del proyecto analizado, no la palabra Proyecto."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Cartel de fondo y nombre del proyecto
  order: 124
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Sustituye** la viga del [ADR 0118](../0111-0120/0118-el-proyecto-tambien-es-una-sala.md) y ajusta la
jerarquía de etiquetas del [ADR 0121](0121-camara-comoda-y-lod.md).

## Contexto

La viga cruzaba el frente para sostener el nombre. Con la sala abierta por arriba y los archivadores
en la pared de fondo, la viga ya no aportaba estructura: solo era una pieza delante de la cámara.

Además, la sala raíz se llamaba `Proyecto`, que no dice nada. La raíz representa el proyecto analizado
y debe llevar su nombre.

## Decisión

### 1. Fuera la viga

Se retira la viga frontal. El frente queda completamente abierto y la cámara no tiene una pieza
suspendida delante.

### 2. El nombre va al fondo

El nombre de la sala vive en un cartel centrado en la pared de fondo:

- una placa oscura con un marco de moldura;
- el texto centrado, en blanco y algo mayor que el resto de etiquetas;
- visible por encima de los archivadores;
- no seleccionable.

El cartel forma parte de la pared, no del HUD.

### 3. La raíz usa el nombre del proyecto

La sala con foco `null` toma el nombre del `RenderModel` (`meta.project`), no la palabra `Proyecto`.
Las carpetas siguen usando su propio nombre.

`Proyecto` queda solo como último recurso cuando el modelo no trae nombre.

### 4. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia.

## Consecuencias

- La sala gana frente libre y el nombre queda anclado a la arquitectura.
- El proyecto analizado se reconoce en la sala raíz.
- El cartel compite menos con las etiquetas de ficheros porque está centrado y tiene prioridad.
- La pared de fondo necesita altura suficiente para el cartel; el encuadre ya la contempla.

## Alternativas descartadas

- **Mantener la viga.** Cierra visualmente el frente sin aportar estructura.
- **Poner el nombre en el HUD.** Deja de leerse como parte de la sala.
- **Seguir llamando `Proyecto` a la raíz.** No identifica el repositorio analizado.
- **Un cartel seleccionable.** El nombre de la sala no es una carpeta.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Fuera la viga frontal.
- ✅ Cartel centrado en la pared de fondo.
- ✅ La raíz lleva el nombre del proyecto.
- 🟡 LOD por ángulo y pulido de luces.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
